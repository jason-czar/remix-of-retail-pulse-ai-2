import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ============= TYPES =============

interface VelocityData {
  direction: "accelerating" | "decelerating" | "stable";
  magnitude: number;
}

interface NarrativeState {
  id: string;
  label: string;
  prevalence_pct: number;
  change_vs_prior: number;
  velocity: VelocityData;
  sentiment_skew: number;
  dominant_emotions: string[];
  co_occurring_narratives: string[];
  representative_message_ids: string[];
  confidence: number;
}

interface EmotionState {
  emotion: string;
  intensity: number;
  change_vs_prior: number;
  volatility: "low" | "moderate" | "high";
  velocity: VelocityData;
  associated_narratives: string[];
  polarity: "bullish" | "bearish" | "neutral";
  confidence: number;
}

interface Signal {
  active: boolean;
  strength?: number;
}

interface Signals {
  emotion_inflection: Signal;
  narrative_shift: Signal;
  consensus_breakdown: Signal;
  capitulation_detected: Signal;
  euphoria_risk: Signal;
}

interface Concentration {
  top_10_users_pct: number;
  bull_bear_polarization: number;
  retail_consensus_strength: "weak" | "moderate" | "strong";
}

interface Momentum {
  overall_sentiment_velocity: number;
  dominant_narrative_velocity: number;
  dominant_emotion_velocity: number;
}

interface NarrativeCoherence {
  score: number;
  entropy: number;
  emotion_convergence: number;
  velocity_stability: number;
  dominant_narrative_share: number;
  risk_level: "low" | "moderate" | "high";
  risk_drivers: string[];
}

interface DataConfidence {
  score: number;
  drivers: {
    volume_percentile: number;
    author_breadth: number;
    narrative_coherence: number;
    temporal_stability: number;
  };
}

interface MessageWithAuthor {
  id: string;
  author_id: string;
  body: string;
  sentiment: "bullish" | "bearish" | "neutral";
  created_at: string;
}

const EMOTION_NAMES = [
  "Excitement", "Fear", "Hopefulness", "Frustration", "Conviction",
  "Disappointment", "Sarcasm", "Humor", "Grit", "Surprise",
  "FOMO", "Greed", "Capitulation", "Euphoria", "Regret"
];

const ADMIN_EMAIL = "admin@czar.ing";

// ============= HELPER FUNCTIONS =============

function normalizeNarrativeId(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .split(/\s+/)
    .filter(word => word.length > 2)
    .slice(0, 4)
    .join("_")
    .trim();
}

function calculateVelocity(currentChange: number, priorChange: number | null): VelocityData {
  if (priorChange === null) {
    return { direction: "stable", magnitude: 0 };
  }
  const acceleration = currentChange - priorChange;
  const magnitude = Math.abs(acceleration) / Math.max(Math.abs(priorChange), 1);
  if (magnitude < 0.1) {
    return { direction: "stable", magnitude: Math.round(magnitude * 100) / 100 };
  }
  return {
    direction: acceleration > 0 ? "accelerating" : "decelerating",
    magnitude: Math.round(magnitude * 100) / 100
  };
}

function calculateNarrativeCoherence(
  narratives: NarrativeState[],
  emotions: EmotionState[]
): NarrativeCoherence {
  if (!narratives.length) {
    return {
      score: 0,
      entropy: 1,
      emotion_convergence: 0,
      velocity_stability: 0,
      dominant_narrative_share: 0,
      risk_level: "high",
      risk_drivers: ["No narrative data available"],
    };
  }

  const totalPrevalence = narratives.reduce((sum, n) => sum + (n.prevalence_pct || 0), 0);
  let entropy = 0;
  if (totalPrevalence > 0) {
    for (const n of narratives) {
      const p = (n.prevalence_pct || 0) / totalPrevalence;
      if (p > 0) entropy -= p * Math.log2(p);
    }
    const maxEntropy = Math.log2(narratives.length);
    entropy = maxEntropy > 0 ? entropy / maxEntropy : 0;
  }

  const bullishEmotions = emotions.filter((e) => e.polarity === "bullish").length;
  const bearishEmotions = emotions.filter((e) => e.polarity === "bearish").length;
  const totalPolarized = bullishEmotions + bearishEmotions;
  const emotionConvergence = totalPolarized > 0 
    ? Math.abs(bullishEmotions - bearishEmotions) / totalPolarized 
    : 0.5;

  const velocityMagnitudes = narratives.map((n) => n.velocity?.magnitude || 0);
  const avgVelocity = velocityMagnitudes.reduce((a, b) => a + b, 0) / velocityMagnitudes.length;
  const velocityStability = Math.max(0, 1 - avgVelocity);

  const dominantShare = narratives[0]?.prevalence_pct || 0;

  const score = Math.round(
    (1 - entropy) * 30 +
    emotionConvergence * 25 +
    velocityStability * 25 +
    (dominantShare / 100) * 20
  );

  const riskDrivers: string[] = [];
  let riskLevel: "low" | "moderate" | "high" = "low";

  if (entropy > 0.7) riskDrivers.push("Scattered narrative attention");
  if (emotionConvergence < 0.3) riskDrivers.push("Conflicting emotional signals");
  if (velocityStability < 0.4) riskDrivers.push("Rapid narrative shifts");
  if (dominantShare < 20) riskDrivers.push("No dominant narrative");

  if (riskDrivers.length >= 3 || score < 30) riskLevel = "high";
  else if (riskDrivers.length >= 1 || score < 50) riskLevel = "moderate";

  return {
    score,
    entropy: Math.round(entropy * 100) / 100,
    emotion_convergence: Math.round(emotionConvergence * 100) / 100,
    velocity_stability: Math.round(velocityStability * 100) / 100,
    dominant_narrative_share: dominantShare,
    risk_level: riskLevel,
    risk_drivers: riskDrivers,
  };
}

function calculateConcentration(messages: MessageWithAuthor[]): Concentration {
  if (messages.length === 0) {
    return {
      top_10_users_pct: 0,
      bull_bear_polarization: 0,
      retail_consensus_strength: "weak",
    };
  }

  const authorCounts = new Map<string, number>();
  messages.forEach(m => {
    const authorId = m.author_id || "unknown";
    authorCounts.set(authorId, (authorCounts.get(authorId) || 0) + 1);
  });
  
  const sortedAuthors = Array.from(authorCounts.entries())
    .sort((a, b) => b[1] - a[1]);
  
  const totalMessages = messages.length;
  const top10Count = sortedAuthors.slice(0, 10).reduce((sum, [_, count]) => sum + count, 0);
  const top10Pct = Math.round((top10Count / totalMessages) * 1000) / 10;
  
  const bullish = messages.filter(m => m.sentiment === "bullish").length;
  const bearish = messages.filter(m => m.sentiment === "bearish").length;
  const sentimentTotal = bullish + bearish || 1;
  const polarization = Math.round(Math.abs(bullish - bearish) / sentimentTotal * 100) / 100;
  
  let consensusStrength: "weak" | "moderate" | "strong" = "weak";
  if (polarization > 0.7) consensusStrength = "strong";
  else if (polarization > 0.4) consensusStrength = "moderate";
  
  return {
    top_10_users_pct: top10Pct,
    bull_bear_polarization: polarization,
    retail_consensus_strength: consensusStrength,
  };
}

function detectSignals(
  currentEmotions: EmotionState[],
  currentNarratives: NarrativeState[],
  concentration: Concentration,
  priorSnapshot: any | null
): Signals {
  const priorEmotions = priorSnapshot?.observed_state?.emotions || [];
  const priorNarratives = priorSnapshot?.observed_state?.narratives || [];
  
  const dominantEmotion = currentEmotions[0]?.emotion;
  const priorDominantEmotion = priorEmotions[0]?.emotion;
  
  const emotionIntensityDelta = currentEmotions[0] && priorEmotions[0]
    ? Math.abs(currentEmotions[0].intensity - priorEmotions[0].intensity)
    : 0;
  const emotionInflectionActive = dominantEmotion !== priorDominantEmotion || emotionIntensityDelta > 20;
  const emotionInflectionStrength = emotionInflectionActive 
    ? Math.min((emotionIntensityDelta / 30) + (dominantEmotion !== priorDominantEmotion ? 0.3 : 0), 1)
    : 0;
  
  const dominantNarrative = currentNarratives[0]?.id;
  const priorDominantNarrative = priorNarratives[0]?.id;
  const narrativePrevalenceDelta = currentNarratives[0] && priorNarratives[0]
    ? Math.abs(currentNarratives[0].prevalence_pct - priorNarratives[0].prevalence_pct)
    : 0;
  const narrativeShiftActive = dominantNarrative !== priorDominantNarrative || narrativePrevalenceDelta > 15;
  const narrativeShiftStrength = narrativeShiftActive 
    ? Math.min((narrativePrevalenceDelta / 20) + (dominantNarrative !== priorDominantNarrative ? 0.3 : 0), 1)
    : 0;
  
  const consensusBreakdownActive = concentration.bull_bear_polarization > 0.7;
  
  const capitulationEmotion = currentEmotions.find(e => e.emotion === "Capitulation");
  const priorCapitulation = priorEmotions.find((e: any) => e.emotion === "Capitulation");
  const capitulationActive = capitulationEmotion && 
    capitulationEmotion.intensity > 50 && 
    (priorCapitulation ? capitulationEmotion.intensity > priorCapitulation.intensity : true);
  
  const euphoriaEmotion = currentEmotions.find(e => e.emotion === "Euphoria");
  const greedEmotion = currentEmotions.find(e => e.emotion === "Greed");
  const combinedEuphoria = (euphoriaEmotion?.intensity || 0) + (greedEmotion?.intensity || 0);
  const euphoriaRiskActive = combinedEuphoria > 100;
  const euphoriaRiskStrength = euphoriaRiskActive ? Math.min(combinedEuphoria / 150, 1) : 0;
  
  return {
    emotion_inflection: { 
      active: emotionInflectionActive, 
      strength: Math.round(emotionInflectionStrength * 100) / 100 
    },
    narrative_shift: { 
      active: narrativeShiftActive, 
      strength: Math.round(narrativeShiftStrength * 100) / 100 
    },
    consensus_breakdown: { active: consensusBreakdownActive },
    capitulation_detected: { active: capitulationActive || false },
    euphoria_risk: { 
      active: euphoriaRiskActive, 
      strength: Math.round(euphoriaRiskStrength * 100) / 100 
    },
  };
}

function computeConfidence(
  messageCount: number,
  uniqueAuthors: number,
  narrativeCount: number,
  priorSnapshot: any | null
): DataConfidence {
  const volumePercentile = Math.min(messageCount / 500, 1);
  
  const authorBreadth = messageCount > 0 
    ? Math.min(uniqueAuthors / messageCount, 1) 
    : 0;
  
  const narrativeCoherence = narrativeCount > 0 
    ? Math.max(0, 1 - (Math.abs(narrativeCount - 4) / 8))
    : 0.5;
  
  let temporalStability = 0.5;
  if (priorSnapshot?.observed_state) {
    const priorNarratives = priorSnapshot.observed_state.narratives || [];
    const priorDominant = priorNarratives[0]?.id;
    temporalStability = priorDominant ? 0.7 : 0.5;
  }
  
  const score = Math.round((
    volumePercentile * 0.3 +
    authorBreadth * 0.25 +
    narrativeCoherence * 0.25 +
    temporalStability * 0.2
  ) * 100) / 100;
  
  return {
    score,
    drivers: {
      volume_percentile: Math.round(volumePercentile * 100) / 100,
      author_breadth: Math.round(authorBreadth * 100) / 100,
      narrative_coherence: Math.round(narrativeCoherence * 100) / 100,
      temporal_stability: Math.round(temporalStability * 100) / 100,
    }
  };
}

// ============= AI EXTRACTION =============

async function extractObservedStateViaAI(
  messages: MessageWithAuthor[],
  symbol: string,
  priorSnapshot: any | null,
  lovableApiKey: string
): Promise<{ narratives: NarrativeState[]; emotions: EmotionState[] }> {
  const messageTexts = messages
    .slice(0, 800)
    .map((m, i) => `[${i}] ${m.body}`)
    .join("\n");

  const priorNarratives = priorSnapshot?.observed_state?.narratives || [];
  const priorEmotions = priorSnapshot?.observed_state?.emotions || [];

  const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${lovableApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        {
          role: "system",
          content: `You are a financial analyst extracting structured market psychology data from StockTwits messages. Extract BOTH narratives AND emotions in a single analysis. Be specific to the stock - avoid generic labels.`,
        },
        {
          role: "user",
          content: `Analyze these ${messages.length} StockTwits messages about ${symbol.toUpperCase()}.

PRIOR PERIOD DATA (for comparison):
- Prior narratives: ${priorNarratives.slice(0, 5).map((n: any) => `${n.id}: ${n.prevalence_pct}%`).join(", ") || "none"}
- Prior emotions: ${priorEmotions.slice(0, 5).map((e: any) => `${e.emotion}: ${e.intensity}`).join(", ") || "none"}

Extract the following:

1. TOP 8 NARRATIVES with:
- id: snake_case identifier (e.g., "valuation_too_high", "earnings_beat")
- label: Human-readable name (e.g., "Valuation concerns")
- prevalence_pct: % of messages discussing this (0-100)
- sentiment_skew: -1 (bearish) to +1 (bullish)
- dominant_emotions: top 2 emotions associated
- co_occurring_narratives: other narratives mentioned together

2. TOP 10 EMOTIONS with intensity (0-100):
${EMOTION_NAMES.join(", ")}
For each emotion, identify:
- intensity: 0-100 score
- volatility: low/moderate/high (based on variation in messages)
- associated_narratives: which narratives trigger this emotion
- polarity: bullish/bearish/neutral

Messages:
${messageTexts}`,
        },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "extract_psychology",
            description: "Extract narratives and emotions from stock messages",
            parameters: {
              type: "object",
              properties: {
                narratives: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      id: { type: "string" },
                      label: { type: "string" },
                      prevalence_pct: { type: "number" },
                      sentiment_skew: { type: "number" },
                      dominant_emotions: { type: "array", items: { type: "string" } },
                      co_occurring_narratives: { type: "array", items: { type: "string" } },
                    },
                    required: ["id", "label", "prevalence_pct", "sentiment_skew", "dominant_emotions", "co_occurring_narratives"],
                  },
                },
                emotions: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      emotion: { type: "string" },
                      intensity: { type: "number" },
                      volatility: { type: "string", enum: ["low", "moderate", "high"] },
                      associated_narratives: { type: "array", items: { type: "string" } },
                      polarity: { type: "string", enum: ["bullish", "bearish", "neutral"] },
                    },
                    required: ["emotion", "intensity", "volatility", "associated_narratives", "polarity"],
                  },
                },
              },
              required: ["narratives", "emotions"],
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "extract_psychology" } },
    }),
  });

  if (!aiResponse.ok) {
    console.error("AI extraction failed:", aiResponse.status);
    throw new Error(`AI extraction failed: ${aiResponse.status}`);
  }

  const aiData = await aiResponse.json();
  const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
  
  if (!toolCall?.function?.arguments) {
    throw new Error("No tool call response from AI");
  }

  const parsed = JSON.parse(toolCall.function.arguments);
  const rawNarratives = parsed.narratives || [];
  const rawEmotions = parsed.emotions || [];

  // Enhance narratives with velocity calculation
  const narratives: NarrativeState[] = rawNarratives
    .filter((n: any) => n.id && n.prevalence_pct > 0)
    .slice(0, 8)
    .map((n: any) => {
      const priorNarrative = priorNarratives.find((p: any) => p.id === n.id);
      const priorPrevalence = priorNarrative?.prevalence_pct || 0;
      const priorChange = priorNarrative?.change_vs_prior || 0;
      const currentChange = n.prevalence_pct - priorPrevalence;
      
      return {
        id: n.id || normalizeNarrativeId(n.label),
        label: n.label,
        prevalence_pct: Math.round(n.prevalence_pct * 10) / 10,
        change_vs_prior: Math.round(currentChange * 10) / 10,
        velocity: calculateVelocity(currentChange, priorChange),
        sentiment_skew: Math.round(n.sentiment_skew * 100) / 100,
        dominant_emotions: n.dominant_emotions?.slice(0, 2) || [],
        co_occurring_narratives: n.co_occurring_narratives?.slice(0, 3) || [],
        representative_message_ids: [],
        confidence: Math.round((0.7 + Math.random() * 0.25) * 100) / 100,
      };
    });

  // Enhance emotions with velocity calculation
  const emotions: EmotionState[] = rawEmotions
    .filter((e: any) => EMOTION_NAMES.includes(e.emotion) && e.intensity > 0)
    .sort((a: any, b: any) => b.intensity - a.intensity)
    .slice(0, 10)
    .map((e: any) => {
      const priorEmotion = priorEmotions.find((p: any) => p.emotion === e.emotion);
      const priorIntensity = priorEmotion?.intensity || 0;
      const priorChange = priorEmotion?.change_vs_prior || 0;
      const currentChange = e.intensity - priorIntensity;
      
      return {
        emotion: e.emotion,
        intensity: Math.round(e.intensity),
        change_vs_prior: Math.round(currentChange),
        volatility: e.volatility || "moderate",
        velocity: calculateVelocity(currentChange, priorChange),
        associated_narratives: e.associated_narratives?.slice(0, 3) || [],
        polarity: e.polarity || "neutral",
        confidence: Math.round((0.7 + Math.random() * 0.25) * 100) / 100,
      };
    });

  return { narratives, emotions };
}

// ============= MAIN HANDLER =============

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    const stocktwitsApiKey = Deno.env.get("STOCKTWITS_API_KEY");

    if (!lovableApiKey) {
      throw new Error("LOVABLE_API_KEY not configured");
    }
    if (!stocktwitsApiKey) {
      throw new Error("STOCKTWITS_API_KEY not configured");
    }

    // Parse auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const supabaseAuth = createClient(supabaseUrl, supabaseServiceKey);
    
    // Verify the user from the auth token
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid authentication" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check admin email
    if (user.email !== ADMIN_EMAIL) {
      return new Response(
        JSON.stringify({ error: "Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const { action, symbol, startDate, endDate, dryRun = false, skipInsufficientData = true, computeNcs = true } = body;

    if (!symbol) {
      return new Response(
        JSON.stringify({ error: "Symbol is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const upperSymbol = symbol.toUpperCase();
    
    // Action: recompute_ncs - only recompute NCS on existing snapshots
    if (action === "recompute_ncs") {
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      const { data: snapshots, error: fetchError } = await supabaseAdmin
        .from("psychology_snapshots")
        .select("*")
        .eq("symbol", upperSymbol)
        .gte("snapshot_start", start.toISOString())
        .lte("snapshot_end", end.toISOString())
        .order("snapshot_start", { ascending: true });

      if (fetchError) {
        throw new Error(`Failed to fetch snapshots: ${fetchError.message}`);
      }

      if (!snapshots || snapshots.length === 0) {
        return new Response(
          JSON.stringify({ 
            success: true, 
            action: "recompute_ncs",
            dryRun,
            snapshotsFound: 0,
            updated: 0 
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (dryRun) {
        return new Response(
          JSON.stringify({ 
            success: true, 
            action: "recompute_ncs",
            dryRun: true,
            snapshotsFound: snapshots.length,
            wouldUpdate: snapshots.length
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      let updated = 0;
      for (const snapshot of snapshots) {
        const narratives = snapshot.observed_state?.narratives || [];
        const emotions = snapshot.observed_state?.emotions || [];
        
        const newCoherence = calculateNarrativeCoherence(narratives, emotions);
        
        const updatedObservedState = {
          ...snapshot.observed_state,
          coherence: newCoherence,
        };

        const { error: updateError } = await supabaseAdmin
          .from("psychology_snapshots")
          .update({ observed_state: updatedObservedState })
          .eq("id", snapshot.id);

        if (!updateError) {
          updated++;
        } else {
          console.error(`Failed to update snapshot ${snapshot.id}:`, updateError.message);
        }
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          action: "recompute_ncs",
          dryRun: false,
          snapshotsFound: snapshots.length,
          updated
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Action: backfill - create new snapshots for historical dates (with SSE streaming)
    if (action === "backfill") {
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      // Generate list of dates (daily only)
      const dates: Date[] = [];
      const currentDate = new Date(start);
      while (currentDate <= end) {
        // Skip weekends
        const day = currentDate.getDay();
        if (day !== 0 && day !== 6) {
          dates.push(new Date(currentDate));
        }
        currentDate.setDate(currentDate.getDate() + 1);
      }

      if (dates.length === 0) {
        return new Response(
          JSON.stringify({ error: "No valid dates in range (weekdays only)" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check existing snapshots
      const { data: existingSnapshots } = await supabaseAdmin
        .from("psychology_snapshots")
        .select("snapshot_start")
        .eq("symbol", upperSymbol)
        .eq("period_type", "daily")
        .gte("snapshot_start", start.toISOString())
        .lte("snapshot_start", end.toISOString());

      const existingDates = new Set(
        (existingSnapshots || []).map(s => 
          new Date(s.snapshot_start).toISOString().split("T")[0]
        )
      );

      // Set up SSE streaming
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          const sendEvent = (data: any) => {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
          };

          const results = {
            created: 0,
            skipped_existing: 0,
            skipped_insufficient: 0,
            failed: 0,
            errors: [] as string[],
          };

          // Send initial progress
          sendEvent({
            type: "start",
            symbol: upperSymbol,
            totalDates: dates.length,
            existingCount: existingDates.size,
          });

          for (let i = 0; i < dates.length; i++) {
            const date = dates[i];
            const dateStr = date.toISOString().split("T")[0];
            
            // Send progress update
            sendEvent({
              type: "progress",
              currentDate: dateStr,
              processed: i + 1,
              total: dates.length,
              created: results.created,
              skipped: results.skipped_existing + results.skipped_insufficient,
              failed: results.failed,
            });

            // Skip if already exists
            if (existingDates.has(dateStr)) {
              results.skipped_existing++;
              sendEvent({
                type: "skipped",
                date: dateStr,
                reason: "existing",
              });
              continue;
            }

            try {
              // Calculate snapshot window (market hours for that day)
              const snapshotStart = new Date(date);
              snapshotStart.setUTCHours(14, 30, 0, 0); // ~9:30 AM ET
              const snapshotEnd = new Date(date);
              snapshotEnd.setUTCHours(21, 0, 0, 0); // ~4:00 PM ET

              // Fetch historical messages for this date
              const messagesUrl = `${supabaseUrl}/functions/v1/stocktwits-proxy?action=messages&symbol=${upperSymbol}&limit=800&start=${dateStr}&end=${dateStr}`;
              
              const messagesResponse = await fetch(messagesUrl, {
                headers: {
                  "x-api-key": stocktwitsApiKey,
                  "Content-Type": "application/json",
                },
              });

              if (!messagesResponse.ok) {
                throw new Error(`Failed to fetch messages: ${messagesResponse.status}`);
              }

              const messagesData = await messagesResponse.json();
              const rawMessages = messagesData.data?.messages || messagesData.messages || [];
              
              const messages: MessageWithAuthor[] = rawMessages.map((m: any) => ({
                id: m.id?.toString() || "",
                author_id: m.user?.id?.toString() || m.author_id || "",
                body: m.body || m.content || "",
                sentiment: m.entities?.sentiment?.basic?.toLowerCase() || "neutral",
                created_at: m.created_at || date.toISOString(),
              })).filter((m: MessageWithAuthor) => m.body.length > 10);

              const messageCount = messages.length;
              const uniqueAuthors = new Set(messages.map(m => m.author_id)).size;

              // Check minimum volume
              if (messageCount < 5) {
                if (skipInsufficientData) {
                  results.skipped_insufficient++;
                  sendEvent({
                    type: "skipped",
                    date: dateStr,
                    reason: "insufficient",
                    messageCount,
                  });
                  continue;
                } else {
                  throw new Error(`Insufficient messages: ${messageCount}`);
                }
              }

              // Fetch prior snapshot for comparison
              const { data: priorSnapshot } = await supabaseAdmin
                .from("psychology_snapshots")
                .select("*")
                .eq("symbol", upperSymbol)
                .eq("period_type", "daily")
                .lt("snapshot_end", snapshotStart.toISOString())
                .order("snapshot_end", { ascending: false })
                .limit(1)
                .maybeSingle();

              // Extract psychology via AI
              const { narratives, emotions } = await extractObservedStateViaAI(
                messages,
                upperSymbol,
                priorSnapshot,
                lovableApiKey
              );

              if (narratives.length === 0 && emotions.length === 0) {
                if (skipInsufficientData) {
                  results.skipped_insufficient++;
                  sendEvent({
                    type: "skipped",
                    date: dateStr,
                    reason: "no_ai_data",
                  });
                  continue;
                } else {
                  throw new Error("AI extraction returned no data");
                }
              }

              // Calculate all metrics
              const concentration = calculateConcentration(messages);
              const signals = detectSignals(emotions, narratives, concentration, priorSnapshot);
              const momentum: Momentum = {
                overall_sentiment_velocity: narratives[0]?.velocity.magnitude || 0,
                dominant_narrative_velocity: narratives[0]?.velocity.magnitude || 0,
                dominant_emotion_velocity: emotions[0]?.velocity.magnitude || 0,
              };

              // Calculate NCS if requested
              const coherence = computeNcs ? calculateNarrativeCoherence(narratives, emotions) : undefined;

              const observedState = {
                narratives,
                emotions,
                signals,
                concentration,
                momentum,
                ...(coherence && { coherence }),
              };

              const dataConfidence = computeConfidence(
                messageCount,
                uniqueAuthors,
                narratives.length,
                priorSnapshot
              );

              // Insert snapshot with backdated created_at
              const { error: insertError } = await supabaseAdmin
                .from("psychology_snapshots")
                .insert({
                  symbol: upperSymbol,
                  period_type: "daily",
                  snapshot_start: snapshotStart.toISOString(),
                  snapshot_end: snapshotEnd.toISOString(),
                  message_count: messageCount,
                  unique_authors: uniqueAuthors,
                  data_confidence: dataConfidence,
                  observed_state: observedState,
                  interpretation: {
                    snapshot_origin: "admin_backfill",
                    backfill_timestamp: new Date().toISOString(),
                    backfill_admin: user.email,
                  },
                  interpretation_version: 2,
                  created_at: snapshotEnd.toISOString(), // Backdate created_at
                });

              if (insertError) {
                throw new Error(`Insert failed: ${insertError.message}`);
              }

              results.created++;
              sendEvent({
                type: "created",
                date: dateStr,
                messageCount,
                narrativeCount: narratives.length,
                emotionCount: emotions.length,
                ncsScore: coherence?.score,
              });

              // Rate limit
              await new Promise(r => setTimeout(r, 1500));

            } catch (err) {
              results.failed++;
              const errorMsg = err instanceof Error ? err.message : String(err);
              results.errors.push(`${dateStr}: ${errorMsg}`);
              sendEvent({
                type: "error",
                date: dateStr,
                error: errorMsg,
              });
            }
          }

          // Send completion event
          sendEvent({
            type: "complete",
            success: true,
            action: "backfill",
            symbol: upperSymbol,
            dateRange: { start: startDate, end: endDate },
            totalDates: dates.length,
            ...results,
          });

          controller.close();
        },
      });

      return new Response(stream, {
        headers: {
          ...corsHeaders,
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
        },
      });
    }

    return new Response(
      JSON.stringify({ error: "Invalid action. Use 'backfill' or 'recompute_ncs'" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("Admin backfill error:", err);
    const errorMessage = err instanceof Error ? err.message : String(err);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
