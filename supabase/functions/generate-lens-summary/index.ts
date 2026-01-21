import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type DecisionLens = 
  | 'summary'
  | 'corporate-strategy'
  | 'earnings'
  | 'ma'
  | 'capital-allocation'
  | 'leadership-change'
  | 'strategic-pivot'
  | 'product-launch'
  | 'activist-risk';

function getLensPromptContext(lens: DecisionLens): string {
  const contexts: Record<DecisionLens, string> = {
    'summary': 'Provide a holistic overview of retail sentiment. Identify the most significant themes, dominant emotions, and key narratives driving discussion. Highlight any notable consensus or divergence. Focus on what a decision-maker needs to know right now.',
    'corporate-strategy': 'Focus on overall corporate strategy, competitive positioning, long-term vision, and strategic direction. Highlight themes around market leadership, competitive advantages, and business model evolution.',
    'earnings': 'Focus on earnings performance, revenue growth, profitability metrics, guidance, and financial results. Highlight discussions about quarterly results, beats/misses, and forward guidance.',
    'ma': 'Focus on merger and acquisition activity, potential takeover targets, deal rumors, and consolidation themes. Highlight discussions about buyout speculation, merger synergies, and acquisition targets.',
    'capital-allocation': 'Focus on capital allocation decisions including buybacks, dividends, debt management, and investment priorities. Highlight discussions about shareholder returns and capital deployment.',
    'leadership-change': 'Focus on executive changes, CEO transitions, board reshuffling, and management commentary. Highlight discussions about leadership quality and succession planning.',
    'strategic-pivot': 'Focus on strategic pivots, business divestitures, segment sales, and major business model changes. Highlight discussions about corporate restructuring and portfolio optimization.',
    'product-launch': 'Focus on new product launches, product cycles, innovation pipeline, and market reception. Highlight discussions about upcoming releases and product performance.',
    'activist-risk': 'Focus on activist investor involvement, proxy fights, board challenges, and shareholder activism. Highlight discussions about activist campaigns and governance concerns.',
  };
  return contexts[lens];
}

function getLensDisplayName(lens: DecisionLens): string {
  const names: Record<DecisionLens, string> = {
    'summary': 'Summary',
    'corporate-strategy': 'Corporate Strategy Insights',
    'earnings': 'Earnings',
    'ma': 'M&A',
    'capital-allocation': 'Capital Allocation',
    'leadership-change': 'Leadership Change',
    'strategic-pivot': 'Strategic Pivot / Divestiture',
    'product-launch': 'Product Launch',
    'activist-risk': 'Activist Risk',
  };
  return names[lens];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { symbol, lens = 'corporate-strategy', skipCache = false } = await req.json();

    if (!symbol) {
      return new Response(
        JSON.stringify({ error: "Symbol is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const STOCKTWITS_API_KEY = Deno.env.get("STOCKTWITS_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    
    // Check cache first (unless skipCache is true)
    if (!skipCache) {
      const { data: cached } = await supabase
        .from("lens_summary_cache")
        .select("summary, message_count")
        .eq("symbol", symbol.toUpperCase())
        .eq("lens", lens)
        .gt("expires_at", new Date().toISOString())
        .maybeSingle();

      if (cached) {
        console.log(`Cache hit for ${symbol} ${lens}`);
        return new Response(
          JSON.stringify({ summary: cached.summary, cached: true, messageCount: cached.message_count }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    console.log(`${skipCache ? 'Force refresh' : 'Cache miss'} for ${symbol} ${lens}, fetching messages...`);
    
    // Fetch recent messages from StockTwits (last 24 hours, limit 500)
    const stocktwitsUrl = `${SUPABASE_URL}/functions/v1/stocktwits-proxy?action=messages&symbol=${symbol}&limit=500`;
    
    const messagesResponse = await fetch(stocktwitsUrl, {
      headers: {
        "x-api-key": STOCKTWITS_API_KEY || "",
        "Content-Type": "application/json",
      },
    });

    if (!messagesResponse.ok) {
      console.error("Failed to fetch messages:", await messagesResponse.text());
      throw new Error("Failed to fetch StockTwits messages");
    }

    const messagesData = await messagesResponse.json();
    const messages = messagesData.data?.messages || messagesData.messages || [];

    if (messages.length === 0) {
      const noDataSummary = `No recent messages found for ${symbol.toUpperCase()} to analyze through the ${getLensDisplayName(lens)} lens.`;
      return new Response(
        JSON.stringify({ summary: noDataSummary, cached: false, messageCount: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Prepare message content for AI analysis
    const messageTexts = messages
      .slice(0, 300)
      .map((m: any) => m.body || m.content || "")
      .filter((text: string) => text.length > 10)
      .join("\n---\n");

    const lensContext = getLensPromptContext(lens as DecisionLens);
    const lensName = getLensDisplayName(lens as DecisionLens);

    console.log(`Generating ${lensName} summary for ${symbol} from ${messages.length} messages...`);

    // Call Lovable AI for lens-specific summary
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `You are a senior equity research analyst providing decision-support insights. Your analysis should be concise (2-3 sentences), actionable, and focused on the specific lens the user has selected. Write in a professional, authoritative tone.`,
          },
          {
            role: "user",
            content: `Analyze these ${messages.length} StockTwits messages about ${symbol.toUpperCase()} through the "${lensName}" lens.

${lensContext}

Provide a 2-3 sentence summary of what retail investors are saying that's relevant to this decision lens. Be specific about what you found (or didn't find). If there's limited discussion on this topic, say so clearly.

Messages:
${messageTexts}`,
          },
        ],
        max_tokens: 256,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI API error:", aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add funds." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`AI analysis failed: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const rawSummary = aiData.choices?.[0]?.message?.content?.trim();
    
    // Only cache if we got a valid AI response
    if (!rawSummary) {
      console.error("AI returned empty response for", symbol, lens);
      return new Response(
        JSON.stringify({ 
          summary: `Unable to generate ${lensName} insights for ${symbol.toUpperCase()} at this time.`,
          cached: false, 
          messageCount: messages.length,
          error: true
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Cache the valid result (30 minute expiry)
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    await supabase
      .from("lens_summary_cache")
      .upsert(
        {
          symbol: symbol.toUpperCase(),
          lens,
          summary: rawSummary,
          message_count: messages.length,
          expires_at: expiresAt,
        },
        { onConflict: "symbol,lens" }
      );

    console.log(`Cached ${lensName} summary for ${symbol}`);

    return new Response(
      JSON.stringify({ summary: rawSummary, cached: false, messageCount: messages.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("generate-lens-summary error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
