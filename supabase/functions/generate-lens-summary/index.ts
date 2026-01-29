import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

// Declare EdgeRuntime for background tasks
declare const EdgeRuntime: {
  waitUntil(promise: Promise<unknown>): void;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Sanitize text by removing non-ASCII characters and normalizing whitespace
function sanitizeText(text: string): string {
  return text
    .replace(/[^\x00-\x7F]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

type DecisionLens = 
  | 'summary'
  | 'corporate-strategy'
  | 'earnings'
  | 'ma'
  | 'capital-allocation'
  | 'leadership-change'
  | 'strategic-pivot'
  | 'product-launch'
  | 'activist-risk'
  | 'custom';

type ConfidenceLevel = 'high' | 'moderate' | 'low';

// Custom lens configuration from user
interface CustomLensConfig {
  name: string;
  decision_question: string;
  focus_areas: string[];
  exclusions: string[];
}

// Keywords for each lens to estimate topic relevance
const LENS_KEYWORDS: Record<Exclude<DecisionLens, 'custom'>, string[]> = {
  'summary': [], // Summary accepts all messages
  'corporate-strategy': ['strategy', 'vision', 'moat', 'competitive', 'positioning', 'market share', 'leadership', 'roadmap', 'ecosystem', 'advantage', 'disruption', 'innovation', 'growth plan', 'execution'],
  'earnings': ['earnings', 'revenue', 'eps', 'guidance', 'beat', 'miss', 'margin', 'profit', 'quarter', 'q1', 'q2', 'q3', 'q4', 'outlook', 'forecast', 'sales', 'income', 'ebitda'],
  'ma': ['merger', 'acquisition', 'takeover', 'buyout', 'deal', 'acquire', 'target', 'bid', 'synergy', 'consolidation', 'rumor'],
  'capital-allocation': ['buyback', 'dividend', 'debt', 'capital', 'cash', 'return', 'capex', 'share repurchase', 'balance sheet', 'investment', 'payout'],
  'leadership-change': ['ceo', 'cfo', 'executive', 'management', 'leadership', 'resign', 'appointed', 'succession', 'board', 'transition', 'chief'],
  'strategic-pivot': ['pivot', 'divestiture', 'spinoff', 'restructure', 'exit', 'segment', 'transformation', 'business model', 'sell off', 'reorganization'],
  'product-launch': ['launch', 'product', 'release', 'new', 'innovation', 'feature', 'update', 'rollout', 'announcement', 'beta', 'upgrade'],
  'activist-risk': ['activist', 'proxy', 'board fight', 'governance', 'shareholder proposal', 'vote', 'campaign', 'stake', 'icahn', 'ackman', 'peltz', 'elliott'],
};

// Get lens-specific prompt context with decision question, focus areas, and exclusions
function getLensPromptContext(lens: DecisionLens, customConfig?: CustomLensConfig): { question: string; context: string; name: string } {
  // Handle custom lens
  if (lens === 'custom' && customConfig) {
    const focusSection = customConfig.focus_areas.length > 0
      ? `Focus on:\n${customConfig.focus_areas.map(f => `- ${f}`).join('\n')}`
      : '';
    
    const exclusionSection = customConfig.exclusions.length > 0
      ? `\n\nExplicitly avoid:\n${customConfig.exclusions.map(e => `- ${e}`).join('\n')}`
      : '';
    
    return {
      name: customConfig.name,
      question: customConfig.decision_question,
      context: `${focusSection}${exclusionSection}

If discussion is sparse or inconclusive for this lens, state that clearly and briefly note what investors ARE focused on instead.`,
    };
  }
  
  const lensConfigs: Record<Exclude<DecisionLens, 'custom'>, { question: string; context: string }> = {
    'summary': {
      question: 'What is the current psychological state of retail investors?',
      context: `Provide a high-level synthesis of retail sentiment and psychological state.

Focus on:
- Dominant emotions and collective mood (fear, greed, confusion, conviction)
- Consensus vs fragmentation in views
- Near-term expectations, frustrations, or catalysts

Explicitly avoid:
- Strategic interpretation or long-term positioning
- Capital allocation judgments
- Specific earnings metrics`
    },
    'corporate-strategy': {
      question: 'How do retail investors perceive management\'s strategic direction?',
      context: `Focus strictly on perceived corporate strategy and long-term competitive positioning.

Highlight:
- How investors interpret management's strategic intent and vision
- Views on competitive moats, ecosystem control, or market position
- Whether strategic moves are seen as visionary, defensive, or reactive

Explicitly avoid:
- Short-term price action or trading sentiment
- Earnings beats/misses (unless directly tied to strategy)
- Emotional complaints unless they challenge strategic narrative`
    },
    'earnings': {
      question: 'What are retail expectations around financial performance?',
      context: `Focus on earnings-related discussion and financial performance expectations.

Highlight:
- Revenue, margins, guidance, or segment performance mentions
- Gap between expectations and perceived outcomes
- Forward earnings narratives and guidance interpretation

Explicitly avoid:
- Strategic positioning unrelated to financials
- Product discussions unless tied to revenue impact

If investors are NOT discussing earnings meaningfully, state this and note what they are focused on instead.`
    },
    'ma': {
      question: 'Is there meaningful speculation about acquisition activity?',
      context: `Focus on merger and acquisition speculation, deal activity, and consolidation themes.

Highlight:
- Specific deal rumors, buyout targets, or acquirer mentions
- Views on merger synergies, valuations, or strategic fit
- Concerns about overpaying or integration risks

Explicitly avoid:
- General competitive positioning (unless about being acquired/acquiring)
- Product launches or earnings performance
- Leadership changes (unless tied to deal probability)`
    },
    'capital-allocation': {
      question: 'How do investors view shareholder return priorities?',
      context: `Focus on capital deployment and shareholder return expectations.

Highlight:
- Discussion of buybacks, dividends, or special returns
- Views on debt management or balance sheet priorities
- Opinions on capex spending, investment levels, or cash hoarding

Explicitly avoid:
- Earnings performance metrics (unless about cash generation)
- Strategic pivots or M&A speculation`
    },
    'leadership-change': {
      question: 'What is retail sentiment on management quality and stability?',
      context: `Focus on leadership perception, executive changes, and management credibility.

Highlight:
- Discussion of CEO/executive performance or competence
- Succession planning concerns or transition speculation
- Management credibility on guidance or communication

Explicitly avoid:
- Strategic or product decisions (unless directly questioning leadership competence)
- Earnings metrics
- Activist involvement (separate lens)`
    },
    'strategic-pivot': {
      question: 'Are investors anticipating major business model changes?',
      context: `Focus on strategic pivots, divestitures, and business model transformation.

Highlight:
- Discussion of segment sales, spinoffs, or restructuring
- Views on business model changes or market exits
- Concerns about execution risk or strategic clarity

Explicitly avoid:
- Regular product launches or earnings
- Leadership changes (unless driving the pivot)`
    },
    'product-launch': {
      question: 'How is the market receiving new products or innovation pipeline?',
      context: `Focus on new product launches, innovation cycles, and market reception.

Highlight:
- Discussion of specific upcoming or recent product releases
- Views on innovation quality, market fit, or differentiation
- Concerns about delays, quality issues, or market reception

Explicitly avoid:
- Earnings metrics (unless directly tied to product revenue)
- Strategic repositioning beyond product scope`
    },
    'activist-risk': {
      question: 'Is there meaningful activist involvement or governance concern?',
      context: `Focus on activist investor involvement, proxy activity, and governance challenges.

Highlight:
- Discussion of specific activist investors or campaigns
- Views on board composition or governance quality
- Concerns about proxy fights, shareholder proposals, or forced changes

Explicitly avoid:
- General leadership criticism (unless activist-driven)
- Strategic disagreements from regular investors`
    },
  };
  
  const config = lensConfigs[lens as Exclude<DecisionLens, 'custom'>];
  const name = getLensDisplayName(lens as Exclude<DecisionLens, 'custom'>);
  return { ...config, name };
}

function getLensDisplayName(lens: Exclude<DecisionLens, 'custom'>): string {
  const names: Record<Exclude<DecisionLens, 'custom'>, string> = {
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

// Check if a message is relevant to the lens based on keyword matching
function isMessageRelevantToLens(messageText: string, lens: DecisionLens, customConfig?: CustomLensConfig): boolean {
  if (lens === 'summary') return true; // Summary accepts all
  
  const lowerText = messageText.toLowerCase();
  
  // For custom lenses, use focus_areas as keywords
  if (lens === 'custom' && customConfig) {
    return customConfig.focus_areas.some(focus => 
      lowerText.includes(focus.toLowerCase())
    );
  }
  
  const keywords = LENS_KEYWORDS[lens as Exclude<DecisionLens, 'custom'>];
  return keywords.some(keyword => lowerText.includes(keyword.toLowerCase()));
}

// Count narrative themes in messages (simple word clustering)
function countNarrativeThemes(messages: string[]): Record<string, number> {
  const themeCounts: Record<string, number> = {};
  
  // Common theme indicators
  const themePatterns = [
    { theme: 'bullish', patterns: ['bullish', 'moon', 'buy', 'long', 'undervalued', 'going up', 'rocket'] },
    { theme: 'bearish', patterns: ['bearish', 'sell', 'short', 'overvalued', 'going down', 'dump', 'crash'] },
    { theme: 'uncertainty', patterns: ['uncertain', 'confused', 'wait', 'unsure', 'dont know', 'not sure'] },
    { theme: 'earnings_focus', patterns: ['earnings', 'revenue', 'eps', 'profit', 'quarter', 'guidance'] },
    { theme: 'technical', patterns: ['support', 'resistance', 'chart', 'pattern', 'breakout', 'breakdown'] },
    { theme: 'news_driven', patterns: ['news', 'announced', 'report', 'breaking', 'rumor'] },
  ];
  
  for (const msg of messages) {
    const lowerMsg = msg.toLowerCase();
    for (const { theme, patterns } of themePatterns) {
      if (patterns.some(p => lowerMsg.includes(p))) {
        themeCounts[theme] = (themeCounts[theme] || 0) + 1;
      }
    }
  }
  
  return themeCounts;
}

// Calculate confidence level based on relevance ratio and theme concentration
function calculateConfidence(
  totalMessages: number,
  relevantCount: number,
  themeCounts: Record<string, number>
): { confidence: ConfidenceLevel; dominantThemeShare: number } {
  if (totalMessages === 0) {
    return { confidence: 'low', dominantThemeShare: 0 };
  }
  
  const relevantRatio = relevantCount / totalMessages;
  
  // Calculate dominant theme share
  const themeValues = Object.values(themeCounts);
  const maxThemeCount = themeValues.length > 0 ? Math.max(...themeValues) : 0;
  const dominantThemeShare = relevantCount > 0 ? maxThemeCount / relevantCount : 0;
  
  // Confidence logic incorporating both relevance and concentration
  let confidence: ConfidenceLevel;
  if (relevantRatio >= 0.35 && dominantThemeShare >= 0.40) {
    confidence = 'high';
  } else if (relevantRatio >= 0.20 && dominantThemeShare >= 0.25) {
    confidence = 'moderate';
  } else {
    confidence = 'low';
  }
  
  return { confidence, dominantThemeShare };
}

// New decision-intelligence focused system prompt
const SYSTEM_PROMPT = `You are a senior equity research analyst producing decision-support intelligence for institutional users.

Write with precision and compression. Avoid generic sentiment language.

Prioritize:
- What is CHANGING in retail perception
- Where investor expectations DIVERGE
- Why this matters for forward-looking decisions

Distinguish between dominant signals and minority-but-strategically-relevant views.
Do not give equal weight to all narratives.

Each sentence should introduce a distinct, decision-relevant insight.
Do NOT restate facts unless they are being actively debated.

If discussion is sparse or inconclusive for this lens, state that clearly and briefly note what investors ARE focused on instead.`;

// Output structure skeleton to append to user prompt
const OUTPUT_SKELETON = `
Structure your response as:
Sentence 1: Core retail narrative specific to this lens
Sentence 2: Source of tension or asymmetry—identify WHO holds opposing views (e.g., traders vs long-term holders, bulls vs skeptics)
Sentence 3 (optional): Forward-looking implication for decision-makers

If views are uniform, note the consensus strength in Sentence 2.
Limit output to exactly 3 sentences maximum.`;

// Background refresh function for stale-while-revalidate
async function refreshLensSummaryInBackground(
  supabase: SupabaseClient,
  symbol: string,
  cacheKey: string,
  lens: DecisionLens,
  customLensConfig: CustomLensConfig | undefined,
  lovableApiKey: string,
  stocktwitsApiKey: string | undefined
): Promise<void> {
  try {
    console.log(`[Background Refresh] Starting for ${symbol} ${cacheKey}`);
    
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    
    // Fetch messages
    const stocktwitsUrl = `${SUPABASE_URL}/functions/v1/stocktwits-proxy?action=messages&symbol=${symbol}&limit=500`;
    const messagesResponse = await fetch(stocktwitsUrl, {
      headers: {
        "x-api-key": stocktwitsApiKey || "",
        "Content-Type": "application/json",
      },
    });

    if (!messagesResponse.ok) {
      console.error("[Background Refresh] Failed to fetch messages");
      return;
    }

    const messagesData = await messagesResponse.json();
    const messages = messagesData.data?.messages || messagesData.messages || [];
    
    if (messages.length === 0) {
      console.log("[Background Refresh] No messages found");
      return;
    }

    const messageTexts = messages
      .slice(0, 300)
      .map((m: { body?: string; content?: string }) => m.body || m.content || "")
      .filter((text: string) => text.length > 10);

    const lensConfig = getLensPromptContext(lens, customLensConfig);

    // Call AI
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: `Analyze these ${messages.length} StockTwits messages about ${symbol.toUpperCase()} through the "${lensConfig.name}" lens.

Decision Question: ${lensConfig.question}

${lensConfig.context}
${OUTPUT_SKELETON}

Messages:
${messageTexts.join("\n---\n")}`,
          },
        ],
        max_tokens: 384,
      }),
    });

    if (!aiResponse.ok) {
      console.error("[Background Refresh] AI API error:", aiResponse.status);
      return;
    }

    const aiData = await aiResponse.json();
    const rawSummary = aiData.choices?.[0]?.message?.content?.trim();
    
    if (!rawSummary) {
      console.error("[Background Refresh] AI returned empty response");
      return;
    }

    const sanitizedSummary = sanitizeText(rawSummary);
    
    // Cache the result
    const cacheMinutes = lens === 'custom' ? 15 : 30;
    const expiresAt = new Date(Date.now() + cacheMinutes * 60 * 1000).toISOString();
    
    await supabase
      .from("lens_summary_cache")
      .upsert(
        {
          symbol: symbol.toUpperCase(),
          lens: cacheKey,
          summary: sanitizedSummary,
          message_count: messages.length,
          expires_at: expiresAt,
        },
        { onConflict: "symbol,lens" }
      );

    console.log(`[Background Refresh] Completed for ${symbol} ${cacheKey}`);
  } catch (error) {
    console.error("[Background Refresh] Error:", error);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { symbol, lens = 'corporate-strategy', skipCache = false, customLensConfig } = await req.json();

    if (!symbol) {
      return new Response(
        JSON.stringify({ error: "Symbol is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate custom lens config if lens is 'custom'
    if (lens === 'custom' && !customLensConfig) {
      return new Response(
        JSON.stringify({ error: "customLensConfig is required for custom lenses" }),
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
    
    // Generate cache key for custom lenses (use a hash of the config)
    const cacheKey = lens === 'custom' && customLensConfig 
      ? `custom-${customLensConfig.name.toLowerCase().replace(/\s+/g, '-')}`
      : lens;
    
    // Stale-while-revalidate: Check cache with grace period
    const SWR_GRACE_PERIOD = 5 * 60 * 1000; // 5 minutes
    
    if (!skipCache) {
      const { data: cached } = await supabase
        .from("lens_summary_cache")
        .select("summary, message_count, expires_at")
        .eq("symbol", symbol.toUpperCase())
        .eq("lens", cacheKey)
        .maybeSingle();

      if (cached) {
        const now = new Date();
        const expiresAt = new Date(cached.expires_at);
        const isExpired = expiresAt < now;
        const isWithinGrace = expiresAt.getTime() + SWR_GRACE_PERIOD > now.getTime();
        
        // Fresh cache - return immediately
        if (!isExpired) {
          console.log(`[Cache HIT] ${symbol} ${cacheKey}`);
          // Record cache hit (background)
          supabase.rpc('increment_cache_stat', { p_cache_name: 'lens_summary', p_column: 'hits' });
          
          return new Response(
            JSON.stringify({ 
              summary: cached.summary, 
              cached: true, 
              messageCount: cached.message_count,
              confidence: 'moderate' as ConfidenceLevel,
            }),
            { 
              headers: { 
                ...corsHeaders, 
                "Content-Type": "application/json",
                "X-Cache": "HIT",
              } 
            }
          );
        }
        
        // Stale but within grace period - return stale data and refresh in background
        if (isExpired && isWithinGrace) {
          console.log(`[Cache STALE] ${symbol} ${cacheKey} - serving stale, refreshing in background`);
          // Record stale hit (background)
          supabase.rpc('increment_cache_stat', { p_cache_name: 'lens_summary', p_column: 'stale_hits' });
          
          // Trigger background refresh (don't await)
          EdgeRuntime.waitUntil(refreshLensSummaryInBackground(
            supabase, symbol, cacheKey, lens as DecisionLens, customLensConfig, LOVABLE_API_KEY!, STOCKTWITS_API_KEY
          ));
          
          return new Response(
            JSON.stringify({ 
              summary: cached.summary, 
              cached: true, 
              messageCount: cached.message_count,
              confidence: 'moderate' as ConfidenceLevel,
              _stale: true,
            }),
            { 
              headers: { 
                ...corsHeaders, 
                "Content-Type": "application/json",
                "X-Cache": "STALE",
              } 
            }
          );
        }
      }
    }

    console.log(`[Cache MISS] ${skipCache ? 'Force refresh' : 'Cache miss'} for ${symbol} ${cacheKey}`);
    // Record cache miss (background)
    supabase.rpc('increment_cache_stat', { p_cache_name: 'lens_summary', p_column: 'misses' });
    
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

    const lensConfig = getLensPromptContext(lens as DecisionLens, customLensConfig);
    const lensName = lensConfig.name;

    if (messages.length === 0) {
      const noDataSummary = `No recent messages found for ${symbol.toUpperCase()} to analyze through the ${lensName} lens.`;
      return new Response(
        JSON.stringify({ 
          summary: noDataSummary, 
          cached: false, 
          messageCount: 0,
          confidence: 'low' as ConfidenceLevel,
          relevantCount: 0,
          dominantThemeShare: 0,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Extract message texts for analysis
    const messageTexts = messages
      .slice(0, 300)
      .map((m: any) => m.body || m.content || "")
      .filter((text: string) => text.length > 10);

    // Calculate lens relevance and confidence
    const relevantMessages = messageTexts.filter((text: string) => 
      isMessageRelevantToLens(text, lens as DecisionLens, customLensConfig)
    );
    const themeCounts = countNarrativeThemes(relevantMessages);
    const { confidence, dominantThemeShare } = calculateConfidence(
      messageTexts.length,
      relevantMessages.length,
      themeCounts
    );

    console.log(`Confidence for ${symbol} ${cacheKey}: ${confidence} (relevant: ${relevantMessages.length}/${messageTexts.length}, dominant theme: ${(dominantThemeShare * 100).toFixed(1)}%)`);

    console.log(`Generating ${lensName} summary for ${symbol} from ${messages.length} messages...`);

    // Call Lovable AI for lens-specific summary with enhanced prompt
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
            content: SYSTEM_PROMPT,
          },
          {
            role: "user",
            content: `Analyze these ${messages.length} StockTwits messages about ${symbol.toUpperCase()} through the "${lensName}" lens.

Decision Question: ${lensConfig.question}

${lensConfig.context}
${OUTPUT_SKELETON}

Messages:
${messageTexts.join("\n---\n")}`,
          },
        ],
        max_tokens: 384,
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
      console.error("AI returned empty response for", symbol, cacheKey);
      return new Response(
        JSON.stringify({ 
          summary: `Unable to generate ${lensName} insights for ${symbol.toUpperCase()} at this time.`,
          cached: false, 
          messageCount: messages.length,
          confidence: 'low' as ConfidenceLevel,
          error: true
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Sanitize AI-generated summary to remove non-ASCII characters
    const sanitizedSummary = sanitizeText(rawSummary);
    console.log(`Sanitized summary for ${symbol} ${cacheKey}: removed ${rawSummary.length - sanitizedSummary.length} chars`);

    // For custom lenses, generate AI-driven concerns and recommended actions
    let keyConcerns: string[] = [];
    let recommendedActions: string[] = [];
    
    if (lens === 'custom' && customLensConfig) {
      console.log(`Generating concerns and actions for custom lens ${customLensConfig.name}...`);
      
      const concernsActionsPrompt = `Based on this analysis of ${symbol.toUpperCase()} through the "${customLensConfig.name}" lens, generate specific concerns and recommended actions.

Summary: ${sanitizedSummary}

Focus Areas: ${customLensConfig.focus_areas.join(', ')}
Exclusions to monitor: ${customLensConfig.exclusions.join(', ')}
Decision Question: ${customLensConfig.decision_question}

Generate concerns and actions that are specific, actionable, and directly tied to the lens focus.`;

      try {
        const concernsResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
                content: "You are a senior equity research analyst. Extract key concerns and recommended actions from the analysis provided. Be specific and actionable.",
              },
              { role: "user", content: concernsActionsPrompt },
            ],
            tools: [
              {
                type: "function",
                function: {
                  name: "extract_concerns_actions",
                  description: "Extract key concerns and recommended actions from the analysis",
                  parameters: {
                    type: "object",
                    properties: {
                      key_concerns: {
                        type: "array",
                        items: { type: "string" },
                        description: "3 specific risks or concerns identified in the analysis, each under 100 characters"
                      },
                      recommended_actions: {
                        type: "array",
                        items: { type: "string" },
                        description: "3 actionable recommendations for decision-makers, each under 100 characters"
                      }
                    },
                    required: ["key_concerns", "recommended_actions"],
                    additionalProperties: false
                  }
                }
              }
            ],
            tool_choice: { type: "function", function: { name: "extract_concerns_actions" } },
            max_tokens: 500,
          }),
        });

        if (concernsResponse.ok) {
          const concernsData = await concernsResponse.json();
          const toolCall = concernsData.choices?.[0]?.message?.tool_calls?.[0];
          
          if (toolCall?.function?.arguments) {
            try {
              const parsed = JSON.parse(toolCall.function.arguments);
              keyConcerns = (parsed.key_concerns || []).slice(0, 3).map((c: string) => sanitizeText(c));
              recommendedActions = (parsed.recommended_actions || []).slice(0, 3).map((a: string) => sanitizeText(a));
              console.log(`Generated ${keyConcerns.length} concerns and ${recommendedActions.length} actions for ${symbol}`);
            } catch (parseError) {
              console.error("Failed to parse concerns/actions:", parseError);
            }
          }
        } else {
          console.error("Concerns/actions AI call failed:", concernsResponse.status);
        }
      } catch (concernsError) {
        console.error("Error generating concerns/actions:", concernsError);
      }
    }

    // Cache the valid result (30 minute expiry for default, 15 min for custom)
    const cacheMinutes = lens === 'custom' ? 15 : 30;
    const expiresAt = new Date(Date.now() + cacheMinutes * 60 * 1000).toISOString();
    await supabase
      .from("lens_summary_cache")
      .upsert(
        {
          symbol: symbol.toUpperCase(),
          lens: cacheKey,
          summary: sanitizedSummary,
          message_count: messages.length,
          expires_at: expiresAt,
        },
        { onConflict: "symbol,lens" }
      );

    console.log(`Cached ${lensName} summary for ${symbol}`);

    const responseData: Record<string, unknown> = { 
      summary: sanitizedSummary, 
      cached: false, 
      messageCount: messages.length,
      confidence,
      relevantCount: relevantMessages.length,
      dominantThemeShare,
    };
    
    // Include concerns and actions for custom lenses
    if (lens === 'custom') {
      responseData.keyConcerns = keyConcerns;
      responseData.recommendedActions = recommendedActions;
    }

    return new Response(
      JSON.stringify(responseData),
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
