import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createLogger, createTimer, reportError, recordMetric } from "../_shared/logger.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logger = createLogger("ask-derive-street");

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

interface IntelligenceContext {
  lensSummary?: string;
  lensConfidence?: string;
  activeLens?: string;
  psychologyOneLiner?: string;
  primaryRisk?: string;
  dominantEmotion?: string;
  topNarratives?: { label: string; sentiment: number; confidence: number }[];
  topEmotions?: { emotion: string; intensity: number; momentum: string }[];
  coherenceScore?: number;
  dataTimestamp?: string;
}

function buildSystemPrompt(symbol: string, context: IntelligenceContext): string {
  const timestamp = context.dataTimestamp || new Date().toISOString();
  const isStale = context.dataTimestamp
    ? Date.now() - new Date(context.dataTimestamp).getTime() > 24 * 60 * 60 * 1000
    : false;

  let contextSection = "";

  if (context.psychologyOneLiner) {
    contextSection += `\n\nCURRENT PSYCHOLOGY SUMMARY:\n${context.psychologyOneLiner}`;
  }

  if (context.primaryRisk) {
    contextSection += `\nPRIMARY RISK: ${context.primaryRisk}`;
  }

  if (context.dominantEmotion) {
    contextSection += `\nDOMINANT EMOTION: ${context.dominantEmotion}`;
  }

  if (context.lensSummary) {
    contextSection += `\n\nDECISION LENS (${context.activeLens || "Summary"}):\n${context.lensSummary}`;
    if (context.lensConfidence) {
      contextSection += `\nConfidence: ${context.lensConfidence}`;
    }
  }

  if (context.topNarratives && context.topNarratives.length > 0) {
    contextSection += "\n\nDOMINANT NARRATIVES:";
    context.topNarratives.forEach((n, i) => {
      const sentimentLabel = n.sentiment > 0.6 ? "bullish" : n.sentiment < 0.4 ? "bearish" : "neutral";
      contextSection += `\n${i + 1}. "${n.label}" - ${sentimentLabel} sentiment, ${Math.round(n.confidence * 100)}% confidence`;
    });
  }

  if (context.topEmotions && context.topEmotions.length > 0) {
    contextSection += "\n\nEMOTION SIGNALS:";
    context.topEmotions.forEach((e) => {
      contextSection += `\n- ${e.emotion}: ${Math.round(e.intensity * 100)}% intensity (${e.momentum})`;
    });
  }

  if (context.coherenceScore !== undefined) {
    const coherenceLabel =
      context.coherenceScore > 0.7
        ? "high (unified narrative)"
        : context.coherenceScore > 0.4
        ? "moderate (some fragmentation)"
        : "low (fragmented)";
    contextSection += `\n\nNARRATIVE COHERENCE: ${Math.round(context.coherenceScore * 100)}% - ${coherenceLabel}`;
  }

  const stalenessWarning = isStale
    ? `\n\n⚠️ DATA FRESHNESS WARNING: Intelligence data is from ${new Date(timestamp).toLocaleString()}. Current sentiment may have shifted.`
    : "";

  return `You are DeriveStreet's Stock Intelligence Assistant for ${symbol}.

Your role is to answer questions using ONLY DeriveStreet's intelligence data.
You are NOT a general market assistant. Do NOT use external knowledge.

GROUNDING SOURCES (always cite these):
- "Based on dominant narratives..." (from narrative analysis)
- "Psychology signals indicate..." (from psychology snapshots)
- "Message volume suggests..." (from activity data)
- "The ${context.activeLens || "summary"} lens shows..." (from decision lens summaries)

RESPONSE STYLE:
- Clear, analytical, institutional
- No hype, emojis, or trading recommendations
- Acknowledge uncertainty when signals are mixed
- Use phrasing like "Retail sentiment currently suggests..." or 
  "A minority but growing cohort believes..."

CONFIDENCE SIGNALING:
When appropriate, state confidence qualitatively:
- "High confidence: Strong signal alignment across narratives"
- "Moderate confidence: Mixed signals require validation"
- "Limited data: Sparse discussion on this topic"

If a question cannot be answered using DeriveStreet data:
- State explicitly what is missing
- Do NOT speculate beyond the platform's scope

DATA FRESHNESS:
Current context timestamp: ${timestamp}${stalenessWarning}

PRIMARY GOAL:
Help users understand how retail investors are thinking, feeling, 
and positioning - and what that implies for risk and decision-making.
${contextSection}`;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID();
  const requestTimer = createTimer();
  logger.startRequest(requestId);

  try {
    const { symbol, messages, context } = (await req.json()) as {
      symbol: string;
      messages: Message[];
      context?: IntelligenceContext;
    };

    if (!symbol) {
      logger.warn("Missing symbol parameter", { request_id: requestId });
      return new Response(
        JSON.stringify({ error: "Symbol is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    logger.info("Processing chat request", { 
      symbol: symbol.toUpperCase(), 
      request_id: requestId,
      message_count: messages.length,
      has_context: !!context 
    });

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      logger.error("LOVABLE_API_KEY is not configured", { request_id: requestId });
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build system prompt with context
    const systemPrompt = buildSystemPrompt(symbol.toUpperCase(), context || {});

    // Prepare messages for AI
    const aiMessages: Message[] = [
      { role: "system", content: systemPrompt },
      ...messages.slice(-20), // Keep last 20 messages for context
    ];

    logger.info("Calling AI gateway with streaming", { 
      symbol: symbol.toUpperCase(), 
      conversation_length: aiMessages.length 
    });

    // Call Lovable AI Gateway with streaming
    const aiTimer = createTimer();
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: aiMessages,
        stream: true,
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    // Initialize Supabase for metrics (after getting response to not delay)
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Record AI call metric
    recordMetric(supabase, {
      metric_type: 'ai_call',
      function_name: 'ask-derive-street',
      endpoint: 'gemini-3-flash-preview',
      duration_ms: aiTimer.elapsed(),
      symbol: symbol.toUpperCase(),
      status_code: response.status,
    });

    if (!response.ok) {
      logger.error("AI gateway error", { 
        symbol: symbol.toUpperCase(), 
        status_code: response.status 
      });
      
      await reportError(supabase, {
        error_type: 'edge_function',
        error_code: String(response.status),
        error_message: `AI gateway returned ${response.status}`,
        function_name: 'ask-derive-street',
        request_id: requestId,
        symbol: symbol.toUpperCase(),
        severity: response.status >= 500 ? 'error' : 'warning',
      });
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limits exceeded, please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required, please add funds to your Lovable AI workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      logger.error("AI gateway response error", { 
        symbol: symbol.toUpperCase(), 
        error: errorText 
      });
      return new Response(
        JSON.stringify({ error: "AI gateway error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    logger.info("Streaming response initiated", { 
      symbol: symbol.toUpperCase(), 
      request_id: requestId 
    });

    // Record API latency metric
    recordMetric(supabase, {
      metric_type: 'api_latency',
      function_name: 'ask-derive-street',
      endpoint: 'chat',
      duration_ms: requestTimer.elapsed(),
      symbol: symbol.toUpperCase(),
      status_code: 200,
    });

    // Return streaming response
    return new Response(response.body, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    logger.error("ask-derive-street error", { 
      request_id: requestId, 
      error: error instanceof Error ? error.message : String(error) 
    });
    
    // Try to report error
    try {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );
      await reportError(supabase, {
        error_type: 'edge_function',
        error_message: error instanceof Error ? error.message : String(error),
        stack_trace: error instanceof Error ? error.stack : undefined,
        function_name: 'ask-derive-street',
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
