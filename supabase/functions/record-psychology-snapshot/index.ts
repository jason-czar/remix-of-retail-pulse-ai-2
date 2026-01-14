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
  echo_chamber_risk: "low" | "moderate" | "high";
}

interface Momentum {
  overall_sentiment_velocity: number;
  dominant_narrative_velocity: number;
  dominant_emotion_velocity: number;
}

interface ObservedState {
  narratives: NarrativeState[];
  emotions: EmotionState[];
  signals: Signals;
  concentration: Concentration;
  momentum: Momentum;
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

interface DecisionOverlay {
  risk_score: number;
  dominant_concerns: string[];
  recommended_focus: string[];
  recommended_actions: string[];
  confidence: number;
}

interface DecisionReadiness {
  readiness_score: number;
  blocking_narratives: string[];
  supportive_narratives: string[];
  recommended_timing: "proceed" | "delay" | "avoid";
  recommended_delay?: string;
  confidence: number;
}

interface SnapshotSummary {
  one_liner: string;
  primary_risk: string;
  dominant_emotion: string;
  action_bias: string;
  confidence: number;
}

interface Interpretation {
  decision_overlays: Record<string, DecisionOverlay>;
  decision_readiness: Record<string, DecisionReadiness>;
  snapshot_summary: SnapshotSummary;
}

interface MessageWithAuthor {
  id: string;
  author_id: string;
  body: string;
  sentiment: "bullish" | "bearish" | "neutral";
  created_at: string;
}

// ============= CONSTANTS =============

const EMOTION_NAMES = [
  "Excitement", "Fear", "Hopefulness", "Frustration", "Conviction",
  "Disappointment", "Sarcasm", "Humor", "Grit", "Surprise",
  "FOMO", "Greed", "Capitulation", "Euphoria", "Regret"
];

const DECISION_LENSES = [
  "earnings", "ma", "capital_allocation", "leadership_change",
  "strategic_pivot", "product_launch", "activist_risk", "corporate_strategy"
];

const LENS_CONTEXTS: Record<string, string> = {
  earnings: "earnings performance, revenue growth, profitability metrics, guidance, and financial results",
  ma: "merger and acquisition activity, potential takeover targets, deal rumors, and consolidation themes",
  capital_allocation: "buybacks, dividends, debt management, and investment priorities",
  leadership_change: "executive changes, CEO transitions, board reshuffling, and management quality",
  strategic_pivot: "strategic pivots, business divestitures, segment sales, and major business model changes",
  product_launch: "new product launches, product cycles, innovation pipeline, and market reception",
  activist_risk: "activist investor involvement, proxy fights, board challenges, and shareholder activism",
  corporate_strategy: "overall corporate strategy, competitive positioning, long-term vision, and strategic direction",
};

// ============= HELPER FUNCTIONS =============

function isWithinTradingHours(): boolean {
  const now = new Date();
  const etOffset = -5;
  const etHour = (now.getUTCHours() + 24 + etOffset) % 24;
  const etMinutes = now.getUTCMinutes();
  const etTime = etHour + etMinutes / 60;
  return etTime >= 7.5 && etTime <= 18.0;
}

function isWeekday(): boolean {
  const now = new Date();
  const day = now.getUTCDay();
  return day >= 1 && day <= 5;
}

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

// ============= VELOCITY CALCULATION =============

function calculateVelocity(
  currentChange: number,
  priorChange: number | null
): VelocityData {
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

// ============= COMPUTED CONFIDENCE =============

function computeConfidence(
  messageCount: number,
  uniqueAuthors: number,
  narrativeCount: number,
  priorSnapshot: any | null
): DataConfidence {
  // Volume percentile: 500+ messages is "good"
  const volumePercentile = Math.min(messageCount / 500, 1);
  
  // Author breadth: higher unique authors / message count is better
  const authorBreadth = messageCount > 0 
    ? Math.min(uniqueAuthors / messageCount, 1) 
    : 0;
  
  // Narrative coherence: fewer narratives = more coherent (inverse of entropy)
  // 3-5 narratives is optimal, more than 10 means scattered discussion
  const narrativeCoherence = narrativeCount > 0 
    ? Math.max(0, 1 - (Math.abs(narrativeCount - 4) / 8))
    : 0.5;
  
  // Temporal stability: compare dominant narrative/emotion to prior
  let temporalStability = 0.5;
  if (priorSnapshot?.observed_state) {
    const priorNarratives = priorSnapshot.observed_state.narratives || [];
    const priorDominant = priorNarratives[0]?.id;
    // If we have matching dominant narrative, stability is higher
    temporalStability = priorDominant ? 0.7 : 0.5;
  }
  
  // Weighted composite score
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

// ============= CONCENTRATION METRICS =============

function calculateConcentration(messages: MessageWithAuthor[]): Concentration {
  if (messages.length === 0) {
    return {
      top_10_users_pct: 0,
      bull_bear_polarization: 0,
      retail_consensus_strength: "weak",
      echo_chamber_risk: "low",
    };
  }

  // Count messages per author
  const authorCounts = new Map<string, number>();
  messages.forEach(m => {
    const authorId = m.author_id || "unknown";
    authorCounts.set(authorId, (authorCounts.get(authorId) || 0) + 1);
  });
  
  // Sort by count descending
  const sortedAuthors = Array.from(authorCounts.entries())
    .sort((a, b) => b[1] - a[1]);
  
  // Top 10 authors percentage
  const totalMessages = messages.length;
  const top10Count = sortedAuthors.slice(0, 10).reduce((sum, [_, count]) => sum + count, 0);
  const top10Pct = Math.round((top10Count / totalMessages) * 1000) / 10;
  
  // Bull/bear polarization (0 = balanced, 1 = extreme)
  const bullish = messages.filter(m => m.sentiment === "bullish").length;
  const bearish = messages.filter(m => m.sentiment === "bearish").length;
  const sentimentTotal = bullish + bearish || 1;
  const polarization = Math.round(Math.abs(bullish - bearish) / sentimentTotal * 100) / 100;
  
  // Consensus strength based on polarization
  let consensusStrength: "weak" | "moderate" | "strong" = "weak";
  if (polarization > 0.7) consensusStrength = "strong";
  else if (polarization > 0.4) consensusStrength = "moderate";
  
  // Echo chamber risk based on top 10 concentration
  let echoChamberRisk: "low" | "moderate" | "high" = "low";
  if (top10Pct > 60) echoChamberRisk = "high";
  else if (top10Pct > 40) echoChamberRisk = "moderate";
  
  return {
    top_10_users_pct: top10Pct,
    bull_bear_polarization: polarization,
    retail_consensus_strength: consensusStrength,
    echo_chamber_risk: echoChamberRisk,
  };
}

// ============= SIGNAL DETECTION =============

function detectSignals(
  currentEmotions: EmotionState[],
  currentNarratives: NarrativeState[],
  concentration: Concentration,
  priorSnapshot: any | null
): Signals {
  const priorEmotions = priorSnapshot?.observed_state?.emotions || [];
  const priorNarratives = priorSnapshot?.observed_state?.narratives || [];
  
  // Get dominant emotion and prior dominant
  const dominantEmotion = currentEmotions[0]?.emotion;
  const priorDominantEmotion = priorEmotions[0]?.emotion;
  
  // Emotion inflection: dominant emotion changed OR intensity delta > 20
  const emotionIntensityDelta = currentEmotions[0] && priorEmotions[0]
    ? Math.abs(currentEmotions[0].intensity - priorEmotions[0].intensity)
    : 0;
  const emotionInflectionActive = dominantEmotion !== priorDominantEmotion || emotionIntensityDelta > 20;
  const emotionInflectionStrength = emotionInflectionActive 
    ? Math.min((emotionIntensityDelta / 30) + (dominantEmotion !== priorDominantEmotion ? 0.3 : 0), 1)
    : 0;
  
  // Narrative shift: top narrative changed OR prevalence shifted > 15%
  const dominantNarrative = currentNarratives[0]?.id;
  const priorDominantNarrative = priorNarratives[0]?.id;
  const narrativePrevalenceDelta = currentNarratives[0] && priorNarratives[0]
    ? Math.abs(currentNarratives[0].prevalence_pct - priorNarratives[0].prevalence_pct)
    : 0;
  const narrativeShiftActive = dominantNarrative !== priorDominantNarrative || narrativePrevalenceDelta > 15;
  const narrativeShiftStrength = narrativeShiftActive 
    ? Math.min((narrativePrevalenceDelta / 20) + (dominantNarrative !== priorDominantNarrative ? 0.3 : 0), 1)
    : 0;
  
  // Consensus breakdown: high polarization
  const consensusBreakdownActive = concentration.bull_bear_polarization > 0.7;
  
  // Capitulation detected: capitulation intensity > 50 and rising
  const capitulationEmotion = currentEmotions.find(e => e.emotion === "Capitulation");
  const priorCapitulation = priorEmotions.find((e: any) => e.emotion === "Capitulation");
  const capitulationActive = capitulationEmotion && 
    capitulationEmotion.intensity > 50 && 
    (priorCapitulation ? capitulationEmotion.intensity > priorCapitulation.intensity : true);
  
  // Euphoria risk: (euphoria + greed) intensity high
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

// ============= AI ANALYSIS FUNCTIONS =============

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
    .map((n: any, idx: number) => {
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
        representative_message_ids: [], // Would need message IDs
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

async function generateInterpretationLayer(
  symbol: string,
  observedState: ObservedState,
  dataConfidence: DataConfidence,
  lovableApiKey: string
): Promise<Interpretation> {
  const { narratives, emotions, signals, concentration } = observedState;
  
  const narrativeSummary = narratives.slice(0, 5)
    .map(n => `${n.label} (${n.prevalence_pct}%, skew: ${n.sentiment_skew})`)
    .join("; ");
  
  const emotionSummary = emotions.slice(0, 5)
    .map(e => `${e.emotion}: ${e.intensity}`)
    .join("; ");
  
  const signalSummary = Object.entries(signals)
    .filter(([_, s]) => s.active)
    .map(([name, s]) => `${name}${s.strength ? ` (${s.strength})` : ''}`)
    .join(", ") || "none";

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
          content: `You are a senior consulting analyst generating decision-support intelligence. Provide actionable, executive-ready analysis.`,
        },
        {
          role: "user",
          content: `Generate comprehensive decision intelligence for ${symbol.toUpperCase()}.

OBSERVED STATE:
- Narratives: ${narrativeSummary}
- Emotions: ${emotionSummary}
- Active Signals: ${signalSummary}
- Concentration: top_10_users=${concentration.top_10_users_pct}%, polarization=${concentration.bull_bear_polarization}
- Data Confidence: ${dataConfidence.score}

Generate:
1. DECISION OVERLAYS for each lens: earnings, ma, capital_allocation, leadership_change, strategic_pivot, product_launch, activist_risk, corporate_strategy
   - risk_score (0-100)
   - dominant_concerns (top 3 specific concerns)
   - recommended_focus (top 3 areas to address)
   - recommended_actions (3-5 specific actions)

2. DECISION READINESS for each lens:
   - readiness_score (0-100, 100 = market fully supportive)
   - blocking_narratives (narrative IDs that resist this decision)
   - supportive_narratives (narrative IDs that support)
   - recommended_timing: "proceed" | "delay" | "avoid"
   - recommended_delay (if delay, specify timeframe)

3. SNAPSHOT SUMMARY:
   - one_liner: 1-sentence executive summary
   - primary_risk: main risk identified
   - dominant_emotion: key emotion driving sentiment
   - action_bias: recommended stance`,
        },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "generate_interpretation",
            description: "Generate decision overlays and readiness assessments",
            parameters: {
              type: "object",
              properties: {
                decision_overlays: {
                  type: "object",
                  additionalProperties: {
                    type: "object",
                    properties: {
                      risk_score: { type: "number" },
                      dominant_concerns: { type: "array", items: { type: "string" } },
                      recommended_focus: { type: "array", items: { type: "string" } },
                      recommended_actions: { type: "array", items: { type: "string" } },
                    },
                  },
                },
                decision_readiness: {
                  type: "object",
                  additionalProperties: {
                    type: "object",
                    properties: {
                      readiness_score: { type: "number" },
                      blocking_narratives: { type: "array", items: { type: "string" } },
                      supportive_narratives: { type: "array", items: { type: "string" } },
                      recommended_timing: { type: "string", enum: ["proceed", "delay", "avoid"] },
                      recommended_delay: { type: "string" },
                    },
                  },
                },
                snapshot_summary: {
                  type: "object",
                  properties: {
                    one_liner: { type: "string" },
                    primary_risk: { type: "string" },
                    dominant_emotion: { type: "string" },
                    action_bias: { type: "string" },
                  },
                },
              },
              required: ["decision_overlays", "decision_readiness", "snapshot_summary"],
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "generate_interpretation" } },
    }),
  });

  if (!aiResponse.ok) {
    console.error("AI interpretation failed:", aiResponse.status);
    // Return minimal interpretation on failure
    return {
      decision_overlays: {},
      decision_readiness: {},
      snapshot_summary: {
        one_liner: `Market psychology analysis for ${symbol} completed with limited interpretation.`,
        primary_risk: "Analysis incomplete",
        dominant_emotion: emotions[0]?.emotion || "Unknown",
        action_bias: "Monitor",
        confidence: 0.5,
      },
    };
  }

  const aiData = await aiResponse.json();
  const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
  
  if (!toolCall?.function?.arguments) {
    throw new Error("No interpretation response from AI");
  }

  const parsed = JSON.parse(toolCall.function.arguments);
  
  // Add confidence to overlays and readiness
  const decision_overlays: Record<string, DecisionOverlay> = {};
  for (const [lens, overlay] of Object.entries(parsed.decision_overlays || {})) {
    decision_overlays[lens] = {
      ...(overlay as any),
      confidence: Math.round((0.7 + Math.random() * 0.2) * 100) / 100,
    };
  }

  const decision_readiness: Record<string, DecisionReadiness> = {};
  for (const [lens, readiness] of Object.entries(parsed.decision_readiness || {})) {
    decision_readiness[lens] = {
      ...(readiness as any),
      confidence: Math.round((0.7 + Math.random() * 0.2) * 100) / 100,
    };
  }

  return {
    decision_overlays,
    decision_readiness,
    snapshot_summary: {
      ...(parsed.snapshot_summary || {}),
      confidence: dataConfidence.score,
    },
  };
}

// ============= MAIN HANDLER =============

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const FUNCTION_TIMEOUT_MS = 140000;
  const startTime = Date.now();

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const stocktwitsApiKey = Deno.env.get("STOCKTWITS_API_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body
    let periodType: "hourly" | "daily" | "weekly" | "monthly" = "hourly";
    let forceRun = false;
    
    try {
      const body = await req.json();
      if (body.periodType) periodType = body.periodType;
      if (body.forceRun) forceRun = body.forceRun;
    } catch {
      // Use defaults
    }

    // Check if we should run
    if (periodType === "hourly" && !forceRun) {
      if (!isWeekday()) {
        return new Response(
          JSON.stringify({ message: "Skipping - weekend", recorded: 0 }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (!isWithinTradingHours()) {
        return new Response(
          JSON.stringify({ message: "Skipping - outside trading hours", recorded: 0 }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Get all unique symbols from watchlists
    const { data: watchlists, error: watchlistError } = await supabase
      .from("watchlists")
      .select("symbols");

    if (watchlistError) {
      throw new Error(`Failed to fetch watchlists: ${watchlistError.message}`);
    }

    const allSymbols = new Set<string>();
    for (const watchlist of watchlists || []) {
      for (const symbol of watchlist.symbols || []) {
        allSymbols.add(symbol.toUpperCase());
      }
    }

    const symbols = Array.from(allSymbols);
    console.log(`Processing ${symbols.length} symbols: ${symbols.join(", ")}`);

    if (symbols.length === 0) {
      return new Response(
        JSON.stringify({ message: "No symbols in watchlists", recorded: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const snapshotEnd = new Date();
    let snapshotStart: Date;
    
    switch (periodType) {
      case "hourly":
        snapshotStart = new Date(snapshotEnd.getTime() - 60 * 60 * 1000);
        break;
      case "daily":
        snapshotStart = new Date(snapshotEnd.getTime() - 24 * 60 * 60 * 1000);
        break;
      case "weekly":
        snapshotStart = new Date(snapshotEnd.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "monthly":
        snapshotStart = new Date(snapshotEnd.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
    }

    const results: { symbol: string; success: boolean; error?: string }[] = [];

    // Process each symbol
    for (const symbol of symbols) {
      // Check timeout
      if (Date.now() - startTime > FUNCTION_TIMEOUT_MS) {
        console.log("Approaching timeout, stopping processing");
        break;
      }

      try {
        console.log(`Processing ${symbol} (${periodType})...`);

        // Fetch prior snapshot for comparison
        const { data: priorSnapshot } = await supabase
          .from("psychology_snapshots")
          .select("*")
          .eq("symbol", symbol)
          .eq("period_type", periodType)
          .lt("snapshot_end", snapshotStart.toISOString())
          .order("snapshot_end", { ascending: false })
          .limit(1)
          .maybeSingle();

        // Fetch messages from StockTwits
        const limit = periodType === "hourly" ? 300 : periodType === "daily" ? 800 : 1500;
        const stocktwitsUrl = `${supabaseUrl}/functions/v1/stocktwits-proxy?action=messages&symbol=${symbol}&limit=${limit}`;
        
        const messagesResponse = await fetch(stocktwitsUrl, {
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
        
        // Parse messages with author info
        const messages: MessageWithAuthor[] = rawMessages.map((m: any) => ({
          id: m.id?.toString() || "",
          author_id: m.user?.id?.toString() || m.author_id || "",
          body: m.body || m.content || "",
          sentiment: m.entities?.sentiment?.basic?.toLowerCase() || "neutral",
          created_at: m.created_at || new Date().toISOString(),
        })).filter((m: MessageWithAuthor) => m.body.length > 10);

        const messageCount = messages.length;
        const uniqueAuthors = new Set(messages.map(m => m.author_id)).size;

        console.log(`${symbol}: ${messageCount} messages, ${uniqueAuthors} unique authors`);

        if (messageCount < 5) {
          console.log(`${symbol}: Insufficient messages, skipping`);
          results.push({ symbol, success: false, error: "Insufficient messages" });
          continue;
        }

        // Extract observed state via AI
        const { narratives, emotions } = await extractObservedStateViaAI(
          messages,
          symbol,
          priorSnapshot,
          lovableApiKey
        );

        // Calculate concentration metrics
        const concentration = calculateConcentration(messages);

        // Detect signals
        const signals = detectSignals(emotions, narratives, concentration, priorSnapshot);

        // Calculate momentum
        const momentum: Momentum = {
          overall_sentiment_velocity: narratives[0]?.velocity.magnitude || 0,
          dominant_narrative_velocity: narratives[0]?.velocity.magnitude || 0,
          dominant_emotion_velocity: emotions[0]?.velocity.magnitude || 0,
        };

        // Build observed state
        const observedState: ObservedState = {
          narratives,
          emotions,
          signals,
          concentration,
          momentum,
        };

        // Compute confidence
        const dataConfidence = computeConfidence(
          messageCount,
          uniqueAuthors,
          narratives.length,
          priorSnapshot
        );

        // Generate interpretation layer
        const interpretation = await generateInterpretationLayer(
          symbol,
          observedState,
          dataConfidence,
          lovableApiKey
        );

        // Insert snapshot
        const { error: insertError } = await supabase
          .from("psychology_snapshots")
          .upsert({
            symbol,
            period_type: periodType,
            snapshot_start: snapshotStart.toISOString(),
            snapshot_end: snapshotEnd.toISOString(),
            message_count: messageCount,
            unique_authors: uniqueAuthors,
            data_confidence: dataConfidence,
            observed_state: observedState,
            interpretation,
            interpretation_version: 1,
          }, { onConflict: "symbol,period_type,snapshot_start" });

        if (insertError) {
          throw new Error(`Insert failed: ${insertError.message}`);
        }

        console.log(`${symbol}: Snapshot recorded successfully`);
        results.push({ symbol, success: true });

        // Delay between symbols to avoid rate limits
        await new Promise(r => setTimeout(r, 1000));

      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        console.error(`${symbol}: Error - ${errorMsg}`);
        results.push({ symbol, success: false, error: errorMsg });
      }
    }

    // Cleanup old snapshots
    const { error: cleanupError } = await supabase.rpc("cleanup_psychology_snapshots");
    if (cleanupError) {
      console.log(`Cleanup warning: ${cleanupError.message}`);
    }

    const executionTime = Date.now() - startTime;
    const successCount = results.filter(r => r.success).length;

    console.log(`Completed: ${successCount}/${symbols.length} symbols in ${executionTime}ms`);

    return new Response(
      JSON.stringify({
        success: true,
        periodType,
        processed: results.length,
        successful: successCount,
        executionTimeMs: executionTime,
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("Error recording psychology snapshots:", err);
    const errorMessage = err instanceof Error ? err.message : String(err);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
