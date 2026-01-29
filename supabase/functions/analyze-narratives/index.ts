import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createLogger, createTimer, reportError, recordMetric } from "../_shared/logger.ts";

// Cache version - increment this when making breaking changes to cache format
const CACHE_VERSION = 2;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logger = createLogger("analyze-narratives");

interface Narrative {
  name: string;
  count: number;
  sentiment: "bullish" | "bearish" | "neutral";
}

// Helper to convert timeRange to date parameters
function getDateRange(timeRange: string): { start: string; end: string; limit: number } {
  const now = new Date();
  let daysBack = 1;
  let limit = 500;

  switch (timeRange) {
    case "1H":
      daysBack = 1;
      limit = 500;
      break;
    case "6H":
      daysBack = 1;
      limit = 750;
      break;
    case "24H":
      daysBack = 1;
      limit = 1000;
      break;
    case "7D":
      daysBack = 7;
      limit = 1500;
      break;
    case "30D":
      daysBack = 30;
      limit = 2500;
      break;
    default:
      daysBack = 1;
      limit = 500;
  }

  const pastDate = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);
  return {
    start: pastDate.toISOString().split("T")[0],
    end: now.toISOString().split("T")[0],
    limit,
  };
}

// Sanitize text to remove non-ASCII characters and clean up
function sanitizeText(text: string): string {
  return text
    .replace(/[^\x00-\x7F]/g, "") // Remove non-ASCII characters
    .replace(/\s+/g, " ") // Normalize whitespace
    .trim();
}

// Normalize narrative names for aggregation
function normalizeNarrativeName(name: string): string {
  return sanitizeText(name)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .split(/\s+/)
    .filter(word => word.length > 2)
    .slice(0, 4)
    .join(" ")
    .trim();
}

// Get dominant sentiment from array of sentiments
function getDominantSentiment(sentiments: string[]): "bullish" | "bearish" | "neutral" {
  const counts = { bullish: 0, bearish: 0, neutral: 0 };
  sentiments.forEach(s => {
    if (s in counts) counts[s as keyof typeof counts]++;
  });
  
  if (counts.bullish >= counts.bearish && counts.bullish >= counts.neutral) return "bullish";
  if (counts.bearish >= counts.neutral) return "bearish";
  return "neutral";
}

// Aggregate narratives from multiple history snapshots
function aggregateNarratives(historyData: any[]): Narrative[] {
  const narrativeTotals = new Map<string, { count: number; sentiments: string[]; originalNames: string[] }>();
  
  historyData.forEach(snapshot => {
    const narratives = snapshot.narratives || [];
    narratives.forEach((n: any) => {
      const normalized = normalizeNarrativeName(n.name);
      if (!normalized) return;
      
      if (!narrativeTotals.has(normalized)) {
        narrativeTotals.set(normalized, { count: 0, sentiments: [], originalNames: [] });
      }
      const entry = narrativeTotals.get(normalized)!;
      entry.count += n.count || 1;
      entry.sentiments.push(n.sentiment);
      if (!entry.originalNames.includes(n.name)) {
        entry.originalNames.push(n.name);
      }
    });
  });
  
  // Build final narratives with dominant sentiment
  return Array.from(narrativeTotals.entries())
    .map(([normalized, data]) => ({
      name: data.originalNames[0] || normalized, // Use first original name
      count: data.count,
      sentiment: getDominantSentiment(data.sentiments)
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID();
  const requestTimer = createTimer();
  logger.startRequest(requestId);

  try {
    const { symbol, timeRange = "24H", skipCache = false } = await req.json();

    if (!symbol) {
      logger.warn("Missing symbol parameter", { request_id: requestId });
      return new Response(
        JSON.stringify({ error: "Symbol is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    logger.info("Processing narrative analysis request", { 
      symbol: symbol.toUpperCase(), 
      request_id: requestId,
      time_range: timeRange,
      skip_cache: skipCache 
    });

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const STOCKTWITS_API_KEY = Deno.env.get("STOCKTWITS_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Initialize Supabase client with service role for cache operations
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Check cache first (unless skipCache is true)
    if (!skipCache) {
      const { data: cached } = await supabase
        .from("narrative_cache")
        .select("*")
        .eq("symbol", symbol.toUpperCase())
        .eq("time_range", timeRange)
        .gt("expires_at", new Date().toISOString())
        .maybeSingle();

      if (cached) {
        const cachedNarratives = cached.narratives;
        const cacheVersion = typeof cachedNarratives === 'object' && cachedNarratives !== null && !Array.isArray(cachedNarratives)
          ? cachedNarratives.cacheVersion
          : undefined;
        
        // Check if it's the new format with version embedded, or old array format
        const narrativesData = Array.isArray(cachedNarratives) ? cachedNarratives : cachedNarratives?.narratives || cachedNarratives;
        
        if (cacheVersion !== CACHE_VERSION) {
          logger.info("Cache version mismatch, regenerating", { 
            symbol: symbol.toUpperCase(), 
            have_version: cacheVersion, 
            need_version: CACHE_VERSION 
          });
          // Continue to regenerate cache
        } else {
          logger.info("Cache hit", { 
            symbol: symbol.toUpperCase(), 
            cache_status: 'hit',
            time_range: timeRange 
          });
          
          // Record cache hit metric
          recordMetric(supabase, {
            metric_type: 'cache_operation',
            function_name: 'analyze-narratives',
            endpoint: 'narrative_cache',
            duration_ms: requestTimer.elapsed(),
            symbol: symbol.toUpperCase(),
            cache_status: 'hit',
            status_code: 200,
          });
          
          const messageCount = cached.message_count || 0;
          logger.endRequest(requestTimer.elapsed(), 200);
          return new Response(
            JSON.stringify({ narratives: narrativesData, messageCount, cached: true }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
    }

    // For 7D and 30D time ranges, try to aggregate from historical snapshots first
    if (timeRange === "7D" || timeRange === "30D") {
      const daysBack = timeRange === "7D" ? 7 : 30;
      const startDate = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);
      
      logger.info("Checking narrative history for aggregation", { 
        symbol: symbol.toUpperCase(), 
        since: startDate.toISOString() 
      });
      
      const { data: historyData, error: historyError } = await supabase
        .from("narrative_history")
        .select("narratives, message_count, recorded_at")
        .eq("symbol", symbol.toUpperCase())
        .gte("recorded_at", startDate.toISOString())
        .order("recorded_at", { ascending: false });
      
      if (!historyError && historyData && historyData.length > 0) {
        // We need at least some snapshots to make aggregation worthwhile
        // For 7D: ideally 8+ hourly snapshots (1 per business day)
        // For 30D: ideally 20+ snapshots
        const minSnapshots = timeRange === "7D" ? 8 : 20;
        
        if (historyData.length >= minSnapshots) {
          logger.info("Aggregating narrative snapshots", { 
            symbol: symbol.toUpperCase(), 
            snapshot_count: historyData.length,
            time_range: timeRange 
          });
          
          const aggregatedNarratives = aggregateNarratives(historyData);
          const totalMessages = historyData.reduce((sum, h) => sum + (h.message_count || 0), 0);
          
          // Cache the aggregated result (2 hour expiry for aggregated data)
          const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
          const cachePayload = {
            narratives: aggregatedNarratives,
            cacheVersion: CACHE_VERSION,
          };
          await supabase
            .from("narrative_cache")
            .upsert(
              {
                symbol: symbol.toUpperCase(),
                time_range: timeRange,
                narratives: cachePayload,
                message_count: totalMessages,
                expires_at: expiresAt,
              },
              { onConflict: "symbol,time_range" }
            );
          
          // Record aggregation metric
          recordMetric(supabase, {
            metric_type: 'api_latency',
            function_name: 'analyze-narratives',
            endpoint: 'aggregation',
            duration_ms: requestTimer.elapsed(),
            symbol: symbol.toUpperCase(),
            cache_status: 'miss',
            status_code: 200,
          });
          
          logger.endRequest(requestTimer.elapsed(), 200);
          return new Response(
            JSON.stringify({ 
              narratives: aggregatedNarratives, 
              messageCount: totalMessages,
              snapshotCount: historyData.length,
              cached: false, 
              aggregated: true 
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        } else {
          logger.info("Insufficient snapshots for aggregation", { 
            symbol: symbol.toUpperCase(), 
            found: historyData.length, 
            needed: minSnapshots 
          });
        }
      }
    }

    logger.info("Cache miss, fetching messages", { 
      symbol: symbol.toUpperCase(), 
      cache_status: 'miss',
      time_range: timeRange 
    });

    // Get date range based on timeRange
    const { start, end, limit } = getDateRange(timeRange);

    // Fetch messages from StockTwits proxy with date range
    const stocktwitsUrl = `${SUPABASE_URL}/functions/v1/stocktwits-proxy?action=messages&symbol=${symbol}&limit=${limit}&start=${start}&end=${end}`;
    const upstreamTimer = createTimer();
    
    const messagesResponse = await fetch(stocktwitsUrl, {
      headers: {
        "x-api-key": STOCKTWITS_API_KEY || "",
        "Content-Type": "application/json",
      },
    });

    // Record upstream call metric
    recordMetric(supabase, {
      metric_type: 'upstream_call',
      function_name: 'analyze-narratives',
      endpoint: 'stocktwits-proxy',
      duration_ms: upstreamTimer.elapsed(),
      symbol: symbol.toUpperCase(),
      status_code: messagesResponse.status,
    });

    if (!messagesResponse.ok) {
      const errorText = await messagesResponse.text();
      logger.error("Failed to fetch messages from StockTwits", { 
        symbol: symbol.toUpperCase(), 
        status_code: messagesResponse.status,
        error: errorText 
      });
      
      await reportError(supabase, {
        error_type: 'edge_function',
        error_code: String(messagesResponse.status),
        error_message: `StockTwits proxy returned ${messagesResponse.status}`,
        function_name: 'analyze-narratives',
        request_id: requestId,
        symbol: symbol.toUpperCase(),
        severity: messagesResponse.status >= 500 ? 'error' : 'warning',
      });
      
      throw new Error("Failed to fetch StockTwits messages");
    }

    const messagesData = await messagesResponse.json();
    const messages = messagesData.data?.messages || messagesData.messages || [];

    if (messages.length === 0) {
      logger.info("No messages found for analysis", { symbol: symbol.toUpperCase() });
      return new Response(
        JSON.stringify({ narratives: [], messageCount: 0, message: "No messages found for analysis" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const totalMessages = messages.length;
    logger.info("Fetched messages for analysis", { 
      symbol: symbol.toUpperCase(), 
      message_count: totalMessages 
    });

    // Prepare message content for AI analysis
    const messageTexts = messages
      .slice(0, 1000)
      .map((m: any) => m.body || m.content || "")
      .filter((text: string) => text.length > 10)
      .join("\n---\n");

    logger.info("Calling AI for narrative analysis", { 
      symbol: symbol.toUpperCase(), 
      message_count: messages.length 
    });

    // Call Lovable AI with tool calling for structured output
    const aiTimer = createTimer();
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
            content: `You are a financial analyst specializing in social media sentiment analysis for stocks. You analyze StockTwits messages to identify the most discussed narratives and themes for a specific stock. Be SPECIFIC to the stock - avoid generic narratives. Focus on what traders are actually discussing.`,
          },
          {
            role: "user",
            content: `Analyze these ${messages.length} StockTwits messages about ${symbol.toUpperCase()} and identify the TOP 8 most discussed narratives/themes.

For each narrative, identify:
- A SHORT, SPECIFIC name (e.g., "iPhone 16 Sales", "AI Chip Delays", "Q4 Earnings Beat", "China Tariff Risk")
- How many messages roughly discuss this theme
- Overall sentiment (bullish/bearish/neutral)

Focus on:
- Product-specific events and launches
- Earnings and financial results
- Competitive dynamics and market share
- Technical/chart patterns being discussed
- News-driven themes (lawsuits, regulations, partnerships)
- Macro factors affecting the stock

Be SPECIFIC to ${symbol.toUpperCase()}. Do NOT use generic labels like "Market Position" or "Growth Outlook".

Messages:
${messageTexts}`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_narratives",
              description: "Extract the top narratives from stock messages",
              parameters: {
                type: "object",
                properties: {
                  narratives: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: {
                          type: "string",
                          description: "Short, specific narrative name (max 4 words)",
                        },
                        count: {
                          type: "number",
                          description: "Approximate number of messages discussing this narrative",
                        },
                        sentiment: {
                          type: "string",
                          enum: ["bullish", "bearish", "neutral"],
                          description: "Overall sentiment of messages about this narrative",
                        },
                      },
                      required: ["name", "count", "sentiment"],
                    },
                  },
                },
                required: ["narratives"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "extract_narratives" } },
      }),
    });

    // Record AI call metric
    recordMetric(supabase, {
      metric_type: 'ai_call',
      function_name: 'analyze-narratives',
      endpoint: 'gemini-3-flash-preview',
      duration_ms: aiTimer.elapsed(),
      symbol: symbol.toUpperCase(),
      status_code: aiResponse.status,
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      logger.error("AI API error", { 
        symbol: symbol.toUpperCase(), 
        status_code: aiResponse.status, 
        error: errorText 
      });
      
      await reportError(supabase, {
        error_type: 'edge_function',
        error_code: String(aiResponse.status),
        error_message: `AI gateway returned ${aiResponse.status}`,
        function_name: 'analyze-narratives',
        request_id: requestId,
        symbol: symbol.toUpperCase(),
        severity: 'error',
      });
      
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
    logger.debug("AI narrative response received", { symbol: symbol.toUpperCase() });

    // Extract narratives from tool call response
    let narratives: Narrative[] = [];
    
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      try {
        const parsed = JSON.parse(toolCall.function.arguments);
        narratives = parsed.narratives || [];
      } catch (e) {
        logger.error("Failed to parse AI tool call arguments", { 
          symbol: symbol.toUpperCase(), 
          error: String(e) 
        });
      }
    }

    // Sanitize and ensure we have at least some narratives, sort by count
    narratives = narratives
      .filter((n: Narrative) => n.name && n.count > 0)
      .map((n: Narrative) => ({
        ...n,
        name: sanitizeText(n.name), // Clean non-ASCII from narrative names
      }))
      .sort((a: Narrative, b: Narrative) => b.count - a.count)
      .slice(0, 8);

    // Cache the results (1 hour expiry)
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    const cachePayload = {
      narratives,
      cacheVersion: CACHE_VERSION,
    };
    
    await supabase
      .from("narrative_cache")
      .upsert(
        {
          symbol: symbol.toUpperCase(),
          time_range: timeRange,
          narratives: cachePayload,
          message_count: totalMessages,
          expires_at: expiresAt,
        },
        { onConflict: "symbol,time_range" }
      );

    logger.info("Cached narrative analysis", { 
      symbol: symbol.toUpperCase(), 
      time_range: timeRange,
      narrative_count: narratives.length 
    });

    // Record final API latency metric
    recordMetric(supabase, {
      metric_type: 'api_latency',
      function_name: 'analyze-narratives',
      endpoint: 'analyze',
      duration_ms: requestTimer.elapsed(),
      symbol: symbol.toUpperCase(),
      cache_status: 'miss',
      status_code: 200,
    });

    logger.endRequest(requestTimer.elapsed(), 200);
    return new Response(
      JSON.stringify({ narratives, messageCount: totalMessages, cached: false, aggregated: false }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    logger.error("analyze-narratives error", { 
      request_id: requestId, 
      error: error instanceof Error ? error.message : String(error) 
    });
    
    // Try to report error if we have supabase client
    try {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );
      await reportError(supabase, {
        error_type: 'edge_function',
        error_message: error instanceof Error ? error.message : String(error),
        stack_trace: error instanceof Error ? error.stack : undefined,
        function_name: 'analyze-narratives',
        request_id: requestId,
        severity: 'error',
      });
    } catch (e) {
      // Silent fail for error reporting
    }
    
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
