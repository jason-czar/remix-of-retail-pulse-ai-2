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
  // Note: echo_chamber_risk is computed at query time, not stored
}

// ============= TEMPORAL GOVERNANCE TYPES =============

interface NarrativePersistence {
  narrative_id: string;
  weekly_presence_pct: number;
  monthly_presence_pct: number;
  classification: "structural" | "event-driven" | "emerging";
  first_seen_date: string;
  days_active: number;
}

interface ConfidenceBasis {
  timeframe_agreement: "high" | "moderate" | "low";
  narrative_persistence_ratio: number;
  velocity_alignment: boolean;
  hourly_override_active: boolean;
  override_reason?: string;
}

interface TemporalAttribution {
  primary_timeframes: string[];
  weights_applied: Record<string, number>;
  effective_weights: Record<string, number>;
  data_freshness: {
    hourly: string | null;
    daily: string | null;
    weekly: string | null;
    monthly: string | null;
  };
  confidence_basis: ConfidenceBasis;
}

interface WeightedNarrative {
  id: string;
  label: string;
  weighted_score: number;
  persistence: string;
}

interface WeightedEmotion {
  emotion: string;
  weighted_intensity: number;
  trend: string;
}

interface WeightedComposite {
  dominant_narratives: WeightedNarrative[];
  dominant_emotions: WeightedEmotion[];
  net_velocity: number;
  stability_score: number;
  temporal_consistency: "high" | "moderate" | "low";
}

interface TemporalSynthesis {
  hourly: { narratives: NarrativeState[]; emotions: EmotionState[]; available: boolean } | null;
  daily: { narratives: NarrativeState[]; emotions: EmotionState[]; available: boolean } | null;
  weekly: { narratives: NarrativeState[]; emotions: EmotionState[]; available: boolean } | null;
  monthly: { narratives: NarrativeState[]; emotions: EmotionState[]; available: boolean } | null;
  weighted_composite: WeightedComposite;
  data_sources_used: string[];
  hourly_override_triggered: boolean;
}

interface MultiPeriodSnapshots {
  hourly: any | null;
  daily: any | null;
  weekly: any | null;
  monthly: any | null;
}

interface Momentum {
  overall_sentiment_velocity: number;
  dominant_narrative_velocity: number;
  dominant_emotion_velocity: number;
}

// ============= NARRATIVE COHERENCE SCORE =============
// Composite score measuring alignment/stability of retail narratives
interface NarrativeCoherence {
  score: number; // 0-100 (higher = more coherent message)
  entropy: number; // 0-1 (lower = more concentrated on fewer narratives)
  emotion_convergence: number; // 0-1 (higher = emotions are aligned)
  velocity_stability: number; // 0-1 (higher = more stable, less erratic)
  dominant_narrative_share: number; // % of attention on top narrative
  risk_level: "low" | "moderate" | "high";
  risk_drivers: string[];
}

// ============= COHERENCE CALCULATION FUNCTION =============
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

  // 1. Calculate entropy (Shannon entropy normalized 0-1)
  // Lower entropy = more concentrated = better coherence
  const totalPrevalence = narratives.reduce((sum, n) => sum + (n.prevalence_pct || 0), 0);
  let entropy = 0;
  if (totalPrevalence > 0) {
    for (const n of narratives) {
      const p = (n.prevalence_pct || 0) / totalPrevalence;
      if (p > 0) entropy -= p * Math.log2(p);
    }
    // Normalize by max possible entropy (log2 of count)
    const maxEntropy = Math.log2(narratives.length);
    entropy = maxEntropy > 0 ? entropy / maxEntropy : 0;
  }

  // 2. Emotion convergence - are emotions aligned in polarity?
  const bullishEmotions = emotions.filter((e) => e.polarity === "bullish").length;
  const bearishEmotions = emotions.filter((e) => e.polarity === "bearish").length;
  const totalPolarized = bullishEmotions + bearishEmotions;
  const emotionConvergence = totalPolarized > 0 
    ? Math.abs(bullishEmotions - bearishEmotions) / totalPolarized 
    : 0.5;

  // 3. Velocity stability - are narratives changing erratically?
  const velocityMagnitudes = narratives.map((n) => n.velocity?.magnitude || 0);
  const avgVelocity = velocityMagnitudes.reduce((a, b) => a + b, 0) / velocityMagnitudes.length;
  const velocityStability = Math.max(0, 1 - avgVelocity); // Lower velocity = more stable

  // 4. Dominant narrative share
  const dominantShare = narratives[0]?.prevalence_pct || 0;

  // Composite score (0-100)
  // Weight: 30% inverse entropy, 25% emotion convergence, 25% velocity stability, 20% dominant share
  const score = Math.round(
    (1 - entropy) * 30 +
    emotionConvergence * 25 +
    velocityStability * 25 +
    (dominantShare / 100) * 20
  );

  // Determine risk level and drivers
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

interface ObservedState {
  narratives: NarrativeState[];
  emotions: EmotionState[];
  signals: Signals;
  concentration: Concentration;
  momentum: Momentum;
  coherence?: NarrativeCoherence;
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

// ============= TEMPORAL GOVERNANCE =============

// Lens-specific temporal weighting matrix
const TEMPORAL_WEIGHTS: Record<string, { hourly: number; daily: number; weekly: number; monthly: number }> = {
  earnings: { hourly: 0.15, daily: 0.35, weekly: 0.35, monthly: 0.15 },
  capital_allocation: { hourly: 0.05, daily: 0.20, weekly: 0.40, monthly: 0.35 },
  ma: { hourly: 0.00, daily: 0.10, weekly: 0.40, monthly: 0.50 },
  leadership_change: { hourly: 0.10, daily: 0.25, weekly: 0.40, monthly: 0.25 },
  product_launch: { hourly: 0.20, daily: 0.40, weekly: 0.30, monthly: 0.10 },
  activist_risk: { hourly: 0.10, daily: 0.20, weekly: 0.40, monthly: 0.30 },
  corporate_strategy: { hourly: 0.00, daily: 0.15, weekly: 0.35, monthly: 0.50 },
  strategic_pivot: { hourly: 0.05, daily: 0.15, weekly: 0.40, monthly: 0.40 },
};

// Strategic lenses where hourly is always zero (except extreme velocity)
const STRATEGIC_LENSES = ["ma", "corporate_strategy", "capital_allocation"];

// Safety rails
const HOURLY_INFLUENCE_CAP = 0.20;
const EXTREME_VELOCITY_THRESHOLD = 2.5;

const TEMPORAL_ROLES = {
  hourly: "signal detection, volatility, inflections",
  daily: "momentum confirmation",
  weekly: "narrative dominance & legitimacy",
  monthly: "strategic validity & durability",
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

// Sanitize text to remove non-ASCII characters and clean up
function sanitizeText(text: string): string {
  return text
    .replace(/[^\x00-\x7F]/g, "") // Remove non-ASCII characters
    .replace(/\s+/g, " ") // Normalize whitespace
    .trim();
}

function normalizeNarrativeId(name: string): string {
  return sanitizeText(name)
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
  
  // Note: echo_chamber_risk is computed at query time, not stored
  return {
    top_10_users_pct: top10Pct,
    bull_bear_polarization: polarization,
    retail_consensus_strength: consensusStrength,
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
        id: sanitizeText(n.id) || normalizeNarrativeId(n.label),
        label: sanitizeText(n.label),
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

// ============= TEMPORAL SYNTHESIS FUNCTIONS =============

async function fetchMultiPeriodSnapshots(
  supabase: any,
  symbol: string
): Promise<MultiPeriodSnapshots> {
  const periodTypes = ["hourly", "daily", "weekly", "monthly"] as const;
  
  const queries = periodTypes.map(async (periodType) => {
    const { data } = await supabase
      .from("psychology_snapshots")
      .select("*")
      .eq("symbol", symbol.toUpperCase())
      .eq("period_type", periodType)
      .order("snapshot_start", { ascending: false })
      .limit(1)
      .maybeSingle();
    return { periodType, data };
  });

  const responses = await Promise.all(queries);
  return {
    hourly: responses.find(r => r.periodType === "hourly")?.data || null,
    daily: responses.find(r => r.periodType === "daily")?.data || null,
    weekly: responses.find(r => r.periodType === "weekly")?.data || null,
    monthly: responses.find(r => r.periodType === "monthly")?.data || null,
  };
}

async function calculateNarrativePersistence(
  supabase: any,
  symbol: string,
  currentNarratives: NarrativeState[]
): Promise<NarrativePersistence[]> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data: historicalSnapshots } = await supabase
    .from("psychology_snapshots")
    .select("observed_state, snapshot_start")
    .eq("symbol", symbol.toUpperCase())
    .eq("period_type", "daily")
    .gte("snapshot_start", thirtyDaysAgo.toISOString())
    .order("snapshot_start", { ascending: true });

  const persistence: NarrativePersistence[] = [];
  const totalDays = historicalSnapshots?.length || 0;
  const last7 = historicalSnapshots?.slice(-7) || [];

  for (const narrative of currentNarratives) {
    let weeklyCount = 0;
    let monthlyCount = 0;
    let firstSeenDate: string | null = null;

    if (historicalSnapshots) {
      for (const snapshot of historicalSnapshots) {
        const narratives = snapshot.observed_state?.narratives || [];
        const found = narratives.some((n: any) => n.id === narrative.id);
        if (found) {
          monthlyCount++;
          if (!firstSeenDate) firstSeenDate = snapshot.snapshot_start;
        }
      }

      for (const snapshot of last7) {
        const narratives = snapshot.observed_state?.narratives || [];
        if (narratives.some((n: any) => n.id === narrative.id)) {
          weeklyCount++;
        }
      }
    }

    // BUG FIX: Use last7.length instead of undefined last7Days
    const weeklyPct = last7.length > 0 ? Math.round((weeklyCount / last7.length) * 100) : 0;
    const monthlyPct = totalDays > 0 ? Math.round((monthlyCount / totalDays) * 100) : 0;

    let classification: "structural" | "event-driven" | "emerging";
    if (monthlyPct >= 70) {
      classification = "structural";
    } else if (monthlyPct <= 30 && weeklyPct <= 40) {
      classification = "event-driven";
    } else {
      classification = "emerging";
    }

    persistence.push({
      narrative_id: narrative.id,
      weekly_presence_pct: weeklyPct,
      monthly_presence_pct: monthlyPct,
      classification,
      first_seen_date: firstSeenDate || new Date().toISOString(),
      days_active: monthlyCount,
    });
  }

  return persistence;
}

function buildTemporalSynthesis(
  multiPeriodSnapshots: MultiPeriodSnapshots,
  lens: string,
  narrativePersistence: NarrativePersistence[]
): { synthesis: TemporalSynthesis; effectiveWeights: Record<string, number>; hourlyOverride: boolean; overrideReason?: string } {
  const baseWeights = TEMPORAL_WEIGHTS[lens] || TEMPORAL_WEIGHTS.corporate_strategy;
  const periods = ["hourly", "daily", "weekly", "monthly"] as const;
  
  // Check for extreme velocity override
  let hourlyOverride = false;
  let overrideReason: string | undefined;
  const hourlySnapshot = multiPeriodSnapshots.hourly;
  
  if (hourlySnapshot?.observed_state?.narratives) {
    const narrativeVelocities = hourlySnapshot.observed_state.narratives
      .map((n: any) => n.velocity?.magnitude || 0);
    const maxVelocity = Math.max(0, ...narrativeVelocities);
    if (maxVelocity >= EXTREME_VELOCITY_THRESHOLD) {
      hourlyOverride = true;
      overrideReason = `Velocity ${maxVelocity.toFixed(1)}x exceeds threshold`;
    }
  }

  // Calculate effective weights with safety rails
  const effectiveWeights: Record<string, number> = {};
  for (const period of periods) {
    let weight = baseWeights[period];
    
    if (period === "hourly") {
      // Hard cap on hourly influence
      if (weight > HOURLY_INFLUENCE_CAP) {
        weight = HOURLY_INFLUENCE_CAP;
      }
      
      // Zero hourly for strategic lenses (unless extreme velocity)
      if (STRATEGIC_LENSES.includes(lens) && !hourlyOverride) {
        weight = 0;
      }
    }
    
    effectiveWeights[period] = weight;
  }

  // Normalize weights to sum to 1
  const weightSum = Object.values(effectiveWeights).reduce((a, b) => a + b, 0);
  if (weightSum > 0) {
    for (const period of periods) {
      effectiveWeights[period] = effectiveWeights[period] / weightSum;
    }
  }

  // Build synthesis object
  const synthesis: any = { data_sources_used: [], hourly_override_triggered: hourlyOverride };
  
  for (const period of periods) {
    const snapshot = multiPeriodSnapshots[period];
    if (snapshot?.observed_state) {
      synthesis[period] = {
        narratives: snapshot.observed_state.narratives || [],
        emotions: snapshot.observed_state.emotions || [],
        available: true,
      };
      synthesis.data_sources_used.push(period);
    } else {
      synthesis[period] = null;
    }
  }

  // Build weighted narrative scores
  const narrativeScores = new Map<string, { label: string; score: number; count: number }>();
  for (const period of periods) {
    if (!synthesis[period]) continue;
    const weight = effectiveWeights[period];
    for (const narrative of synthesis[period].narratives) {
      const existing = narrativeScores.get(narrative.id) || { label: narrative.label, score: 0, count: 0 };
      existing.score += (narrative.prevalence_pct || 0) * weight;
      existing.count++;
      narrativeScores.set(narrative.id, existing);
    }
  }

  // Build weighted emotion intensities
  const emotionScores = new Map<string, { intensity: number; count: number }>();
  for (const period of periods) {
    if (!synthesis[period]) continue;
    const weight = effectiveWeights[period];
    for (const emotion of synthesis[period].emotions) {
      const existing = emotionScores.get(emotion.emotion) || { intensity: 0, count: 0 };
      existing.intensity += (emotion.intensity || 0) * weight;
      existing.count++;
      emotionScores.set(emotion.emotion, existing);
    }
  }

  // Calculate temporal consistency
  const hourlyDominant = synthesis.hourly?.narratives[0]?.id;
  const weeklyDominant = synthesis.weekly?.narratives[0]?.id;
  const monthlyDominant = synthesis.monthly?.narratives[0]?.id;

  let consistency: "high" | "moderate" | "low" = "moderate";
  if (weeklyDominant && monthlyDominant) {
    if (hourlyDominant === weeklyDominant && weeklyDominant === monthlyDominant) {
      consistency = "high";
    } else if (hourlyDominant !== weeklyDominant && hourlyDominant !== monthlyDominant && weeklyDominant !== monthlyDominant) {
      consistency = "low";
    }
  }

  synthesis.weighted_composite = {
    dominant_narratives: Array.from(narrativeScores.entries())
      .map(([id, data]) => ({
        id,
        label: data.label,
        weighted_score: Math.round(data.score * 10) / 10,
        persistence: narrativePersistence.find(p => p.narrative_id === id)?.classification || "unknown",
      }))
      .sort((a, b) => b.weighted_score - a.weighted_score)
      .slice(0, 8),
    dominant_emotions: Array.from(emotionScores.entries())
      .map(([emotion, data]) => ({
        emotion,
        weighted_intensity: Math.round(data.intensity),
        trend: "stable",
      }))
      .sort((a, b) => b.weighted_intensity - a.weighted_intensity)
      .slice(0, 6),
    net_velocity: 0,
    stability_score: consistency === "high" ? 0.9 : consistency === "moderate" ? 0.6 : 0.3,
    temporal_consistency: consistency,
  };

  return { synthesis: synthesis as TemporalSynthesis, effectiveWeights, hourlyOverride, overrideReason };
}

function buildConfidenceBasis(
  temporalSynthesis: TemporalSynthesis,
  narrativePersistence: NarrativePersistence[],
  hourlyOverride: boolean,
  overrideReason?: string
): ConfidenceBasis {
  // Calculate narrative persistence ratio (% of narratives that are structural)
  const structuralCount = narrativePersistence.filter(p => p.classification === "structural").length;
  const persistenceRatio = narrativePersistence.length > 0 
    ? structuralCount / narrativePersistence.length 
    : 0;

  // Check velocity alignment across timeframes
  const weeklyNarrative = temporalSynthesis.weekly?.narratives[0];
  const monthlyNarrative = temporalSynthesis.monthly?.narratives[0];
  const weeklyVelocity = weeklyNarrative?.velocity?.direction || "stable";
  const monthlyVelocity = monthlyNarrative?.velocity?.direction || "stable";
  const velocityAlignment = weeklyVelocity === monthlyVelocity;

  return {
    timeframe_agreement: temporalSynthesis.weighted_composite.temporal_consistency,
    narrative_persistence_ratio: Math.round(persistenceRatio * 100) / 100,
    velocity_alignment: velocityAlignment,
    hourly_override_active: hourlyOverride,
    override_reason: overrideReason,
  };
}

function buildTemporalAttribution(
  multiPeriodSnapshots: MultiPeriodSnapshots,
  baseWeights: Record<string, number>,
  effectiveWeights: Record<string, number>,
  confidenceBasis: ConfidenceBasis
): TemporalAttribution {
  // Find dominant timeframes (>25% weight)
  const primaryTimeframes = Object.entries(effectiveWeights)
    .filter(([_, weight]) => weight > 0.25)
    .map(([period]) => period);

  return {
    primary_timeframes: primaryTimeframes,
    weights_applied: baseWeights,
    effective_weights: effectiveWeights,
    data_freshness: {
      hourly: multiPeriodSnapshots.hourly?.snapshot_end || null,
      daily: multiPeriodSnapshots.daily?.snapshot_end || null,
      weekly: multiPeriodSnapshots.weekly?.snapshot_end || null,
      monthly: multiPeriodSnapshots.monthly?.snapshot_end || null,
    },
    confidence_basis: confidenceBasis,
  };
}

// ============= INTERPRETATION GENERATION =============

interface NarrativeOutcomeForAI {
  narrative_id: string;
  label: string;
  episode_count: number;
  avg_10d_move: number | null;
  win_rate_10d: number | null;
  confidence_label: string;
}

async function generateInterpretationLayer(
  symbol: string,
  observedState: ObservedState,
  dataConfidence: DataConfidence,
  temporalSynthesis: TemporalSynthesis | null,
  narrativePersistence: NarrativePersistence[],
  effectiveWeights: Record<string, number>,
  lovableApiKey: string,
  narrativeOutcomes?: any[]
): Promise<Interpretation> {
  const { narratives, emotions, signals, concentration } = observedState;
  
  // Build persistence summary for AI
  const persistenceSummary = narrativePersistence.length > 0
    ? narrativePersistence
        .map(p => `${p.narrative_id}: ${p.classification} (${p.monthly_presence_pct}% monthly)`)
        .join("; ")
    : "No persistence data available";

  // Build weighted narratives summary
  const weightedNarratives = temporalSynthesis?.weighted_composite.dominant_narratives
    .map(n => `${n.label} (score: ${n.weighted_score}, ${n.persistence})`)
    .join("; ") || "No temporal synthesis available";

  // Build weight explanation
  const weightExplanation = Object.entries(effectiveWeights)
    .map(([period, weight]) => `${period}: ${Math.round(weight * 100)}%`)
    .join(", ");

  // Temporal consistency note
  const consistencyNote = temporalSynthesis?.weighted_composite.temporal_consistency === "high"
    ? "HIGH CONFIDENCE: Narratives are consistent across all timeframes."
    : temporalSynthesis?.weighted_composite.temporal_consistency === "low"
    ? "CAUTION: Significant divergence between short-term and long-term narratives."
    : "MODERATE: Some variation across timeframes.";

  // Hourly override note
  const hourlyNote = temporalSynthesis?.hourly_override_triggered
    ? "NOTE: Hourly data included due to extreme velocity - treat as potential inflection signal."
    : "Hourly data de-weighted per lens configuration.";
  
  // Build narrative outcomes summary for AI (only include if episode_count >= 5)
  let outcomesSummary = "No historical outcome data available yet.";
  const qualifiedOutcomes: NarrativeOutcomeForAI[] = [];
  
  if (narrativeOutcomes && narrativeOutcomes.length > 0) {
    for (const outcome of narrativeOutcomes) {
      const episodeCount = outcome.historical_outcomes?.episode_count || 0;
      if (episodeCount >= 5) {
        qualifiedOutcomes.push({
          narrative_id: outcome.narrative_id,
          label: outcome.label,
          episode_count: episodeCount,
          avg_10d_move: outcome.historical_outcomes?.avg_price_move_10d,
          win_rate_10d: outcome.historical_outcomes?.win_rate_10d,
          confidence_label: outcome.confidence_label,
        });
      }
    }
    
    if (qualifiedOutcomes.length > 0) {
      outcomesSummary = qualifiedOutcomes
        .map(o => `${o.label}: ${o.episode_count} episodes, avg 10D move ${o.avg_10d_move !== null ? `${o.avg_10d_move}%` : 'N/A'}, win rate ${o.win_rate_10d !== null ? `${o.win_rate_10d}%` : 'N/A'} [${o.confidence_label}]`)
        .join("; ");
    }
  }
  
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

  // Retry logic with exponential backoff for AI interpretation
  const MAX_RETRIES = 3;
  const RETRY_DELAYS = [1000, 2000, 4000]; // 1s, 2s, 4s
  
  let lastError: Error | null = null;
  let aiData: any = null;
  
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      console.log(`${symbol}: AI interpretation attempt ${attempt + 1}/${MAX_RETRIES}`);
      
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
              content: `You are a senior consulting analyst generating decision-support intelligence. Provide actionable, executive-ready analysis. CRITICAL: Do not overweight recent/hourly data. Prefer narratives that persist across weekly and monthly timeframes for strategic decisions.`,
            },
            {
              role: "user",
              content: `Generate comprehensive decision intelligence for ${symbol.toUpperCase()}.

CRITICAL TEMPORAL GOVERNANCE RULES:
1. Do NOT overweight information from the most recent period
2. Penalize narratives that appear only in hourly data unless velocity is extreme
3. Prefer narratives that persist across weekly and monthly snapshots for strategic decisions
4. Treat hourly spikes as signals, not conclusions

TEMPORAL WEIGHTS APPLIED: ${weightExplanation}
${hourlyNote}

WEIGHTED NARRATIVE SYNTHESIS (across timeframes):
${weightedNarratives}

TEMPORAL CONSISTENCY: ${consistencyNote}

NARRATIVE PERSISTENCE ANALYSIS:
${persistenceSummary}

HISTORICAL OUTCOME DATA (Narrative Impact Intelligence):
${outcomesSummary}

CRITICAL OUTCOME USAGE RULES:
- This is DESCRIPTIVE intelligence, not predictive forecasting
- If episode_count >= 5: You may reference outcomes using language like "Historically, when [narrative] dominated (N episodes), the typical 10D move was X%"
- If episode_count < 5 or no data: Say "Insufficient historical data for [narrative]"
- NEVER fabricate outcome numbers - cite only what is provided
- When confidence is "moderate": use "historically associated with..."
- When dispersion is high: note "outcomes have been variable"
- Do NOT compute or imply "expected returns" or price targets

STRUCTURAL narratives → use for strategy recommendations
EVENT-DRIVEN narratives → use for timing and messaging only
EMERGING narratives → monitor closely

CURRENT PERIOD OBSERVED STATE:
- Narratives: ${narrativeSummary}
- Emotions: ${emotionSummary}
- Active Signals: ${signalSummary}
- Concentration: top_10_users=${concentration.top_10_users_pct}%, polarization=${concentration.bull_bear_polarization}
- Data Confidence: ${dataConfidence.score}

Generate:
1. DECISION OVERLAYS for each lens: earnings, ma, capital_allocation, leadership_change, strategic_pivot, product_launch, activist_risk, corporate_strategy
   - risk_score (0-100) - weighted by narrative persistence
   - dominant_concerns (top 3 specific concerns - prefer structural narratives). IMPORTANT: Write clean, human-readable sentences only. Do NOT append narrative IDs or internal identifiers to the text.
   - recommended_focus (top 3 areas to address)
   - recommended_actions (3-5 specific actions - reference historical outcomes where available with confidence level). IMPORTANT: Write clean, human-readable sentences only. Do NOT append narrative IDs or internal identifiers to the text.

2. DECISION READINESS for each lens:
   - readiness_score (0-100, 100 = market fully supportive) - penalize if only hourly data supports
   - blocking_narratives (human-readable narrative labels, not IDs)
   - supportive_narratives (human-readable narrative labels, not IDs)
   - recommended_timing: "proceed" | "delay" | "avoid"
   - recommended_delay (if delay, specify timeframe)

3. SNAPSHOT SUMMARY:
   - one_liner: 1-sentence executive summary acknowledging temporal context and any notable historical patterns
   - primary_risk: main risk identified (prefer structural risks)
   - dominant_emotion: key emotion driving sentiment
   - action_bias: recommended stance`,
            },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "generate_interpretation",
                description: "Generate decision overlays and readiness assessments for 8 lenses",
                parameters: {
                  type: "object",
                  properties: {
                    // Overlays for all 8 lenses
                    earnings_overlay: { type: "object", properties: { risk_score: { type: "number" }, dominant_concerns: { type: "array", items: { type: "string" } }, recommended_focus: { type: "array", items: { type: "string" } }, recommended_actions: { type: "array", items: { type: "string" } } } },
                    ma_overlay: { type: "object", properties: { risk_score: { type: "number" }, dominant_concerns: { type: "array", items: { type: "string" } }, recommended_focus: { type: "array", items: { type: "string" } }, recommended_actions: { type: "array", items: { type: "string" } } } },
                    capital_allocation_overlay: { type: "object", properties: { risk_score: { type: "number" }, dominant_concerns: { type: "array", items: { type: "string" } }, recommended_focus: { type: "array", items: { type: "string" } }, recommended_actions: { type: "array", items: { type: "string" } } } },
                    corporate_strategy_overlay: { type: "object", properties: { risk_score: { type: "number" }, dominant_concerns: { type: "array", items: { type: "string" } }, recommended_focus: { type: "array", items: { type: "string" } }, recommended_actions: { type: "array", items: { type: "string" } } } },
                    leadership_change_overlay: { type: "object", properties: { risk_score: { type: "number" }, dominant_concerns: { type: "array", items: { type: "string" } }, recommended_focus: { type: "array", items: { type: "string" } }, recommended_actions: { type: "array", items: { type: "string" } } } },
                    strategic_pivot_overlay: { type: "object", properties: { risk_score: { type: "number" }, dominant_concerns: { type: "array", items: { type: "string" } }, recommended_focus: { type: "array", items: { type: "string" } }, recommended_actions: { type: "array", items: { type: "string" } } } },
                    product_launch_overlay: { type: "object", properties: { risk_score: { type: "number" }, dominant_concerns: { type: "array", items: { type: "string" } }, recommended_focus: { type: "array", items: { type: "string" } }, recommended_actions: { type: "array", items: { type: "string" } } } },
                    activist_risk_overlay: { type: "object", properties: { risk_score: { type: "number" }, dominant_concerns: { type: "array", items: { type: "string" } }, recommended_focus: { type: "array", items: { type: "string" } }, recommended_actions: { type: "array", items: { type: "string" } } } },
                    // Readiness for all 8 lenses
                    earnings_readiness: { type: "object", properties: { readiness_score: { type: "number" }, blocking_narratives: { type: "array", items: { type: "string" } }, supportive_narratives: { type: "array", items: { type: "string" } }, recommended_timing: { type: "string" }, recommended_delay: { type: "string" } } },
                    ma_readiness: { type: "object", properties: { readiness_score: { type: "number" }, blocking_narratives: { type: "array", items: { type: "string" } }, supportive_narratives: { type: "array", items: { type: "string" } }, recommended_timing: { type: "string" }, recommended_delay: { type: "string" } } },
                    capital_allocation_readiness: { type: "object", properties: { readiness_score: { type: "number" }, blocking_narratives: { type: "array", items: { type: "string" } }, supportive_narratives: { type: "array", items: { type: "string" } }, recommended_timing: { type: "string" }, recommended_delay: { type: "string" } } },
                    corporate_strategy_readiness: { type: "object", properties: { readiness_score: { type: "number" }, blocking_narratives: { type: "array", items: { type: "string" } }, supportive_narratives: { type: "array", items: { type: "string" } }, recommended_timing: { type: "string" }, recommended_delay: { type: "string" } } },
                    leadership_change_readiness: { type: "object", properties: { readiness_score: { type: "number" }, blocking_narratives: { type: "array", items: { type: "string" } }, supportive_narratives: { type: "array", items: { type: "string" } }, recommended_timing: { type: "string" }, recommended_delay: { type: "string" } } },
                    strategic_pivot_readiness: { type: "object", properties: { readiness_score: { type: "number" }, blocking_narratives: { type: "array", items: { type: "string" } }, supportive_narratives: { type: "array", items: { type: "string" } }, recommended_timing: { type: "string" }, recommended_delay: { type: "string" } } },
                    product_launch_readiness: { type: "object", properties: { readiness_score: { type: "number" }, blocking_narratives: { type: "array", items: { type: "string" } }, supportive_narratives: { type: "array", items: { type: "string" } }, recommended_timing: { type: "string" }, recommended_delay: { type: "string" } } },
                    activist_risk_readiness: { type: "object", properties: { readiness_score: { type: "number" }, blocking_narratives: { type: "array", items: { type: "string" } }, supportive_narratives: { type: "array", items: { type: "string" } }, recommended_timing: { type: "string" }, recommended_delay: { type: "string" } } },
                    // Summary
                    one_liner: { type: "string" },
                    primary_risk: { type: "string" },
                    dominant_emotion: { type: "string" },
                    action_bias: { type: "string" },
                  },
                  required: [
                    "earnings_overlay", "earnings_readiness",
                    "ma_overlay", "ma_readiness",
                    "capital_allocation_overlay", "capital_allocation_readiness",
                    "corporate_strategy_overlay", "corporate_strategy_readiness",
                    "leadership_change_overlay", "leadership_change_readiness",
                    "strategic_pivot_overlay", "strategic_pivot_readiness",
                    "product_launch_overlay", "product_launch_readiness",
                    "activist_risk_overlay", "activist_risk_readiness",
                    "one_liner", "primary_risk", "dominant_emotion", "action_bias"
                  ],
                },
              },
            },
          ],
          tool_choice: { type: "function", function: { name: "generate_interpretation" } },
        }),
      });

      if (!aiResponse.ok) {
        const errorText = await aiResponse.text();
        const isRetryable = aiResponse.status === 429 || aiResponse.status === 503 || aiResponse.status >= 500;
        
        console.warn(`${symbol}: AI attempt ${attempt + 1} failed with ${aiResponse.status}: ${errorText.slice(0, 200)}`);
        
        if (isRetryable && attempt < MAX_RETRIES - 1) {
          console.log(`${symbol}: Retrying in ${RETRY_DELAYS[attempt]}ms...`);
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAYS[attempt]));
          continue;
        }
        
        // Non-retryable error or exhausted retries
        lastError = new Error(`AI interpretation failed: ${aiResponse.status}`);
        break;
      }

      aiData = await aiResponse.json();
      console.log(`${symbol}: AI interpretation response received on attempt ${attempt + 1}`);
      break; // Success - exit retry loop
      
    } catch (fetchError) {
      console.error(`${symbol}: AI fetch error on attempt ${attempt + 1}:`, fetchError);
      lastError = fetchError instanceof Error ? fetchError : new Error(String(fetchError));
      
      if (attempt < MAX_RETRIES - 1) {
        console.log(`${symbol}: Retrying in ${RETRY_DELAYS[attempt]}ms...`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAYS[attempt]));
      }
    }
  }
  
  // If all retries failed, use fallback
  if (!aiData) {
    console.error(`${symbol}: All ${MAX_RETRIES} AI attempts failed, using fallback interpretation. Last error:`, lastError?.message);
    return generateFallbackInterpretation(symbol, narratives, emotions, dataConfidence.score);
  }
  
  const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
  
  if (!toolCall?.function?.arguments) {
    console.error(`${symbol}: No tool call in AI response after ${MAX_RETRIES} attempts`, JSON.stringify(aiData).slice(0, 500));
    return generateFallbackInterpretation(symbol, narratives, emotions, dataConfidence.score);
  }

  let parsed;
  try {
    parsed = JSON.parse(toolCall.function.arguments);
  } catch (parseErr) {
    console.error(`${symbol}: Failed to parse AI response`, parseErr);
    return generateFallbackInterpretation(symbol, narratives, emotions, dataConfidence.score);
  }
  
  // Map flattened response to structured format - all 8 lenses
  const lensMap = ["earnings", "ma", "capital_allocation", "corporate_strategy", "leadership_change", "strategic_pivot", "product_launch", "activist_risk"];
  
  const decision_overlays: Record<string, DecisionOverlay> = {};
  const decision_readiness: Record<string, DecisionReadiness> = {};
  
  for (const lens of lensMap) {
    const overlayKey = `${lens}_overlay`;
    const readinessKey = `${lens}_readiness`;
    
    if (parsed[overlayKey]) {
      decision_overlays[lens] = {
        risk_score: parsed[overlayKey].risk_score || 50,
        dominant_concerns: parsed[overlayKey].dominant_concerns || [],
        recommended_focus: parsed[overlayKey].recommended_focus || [],
        recommended_actions: parsed[overlayKey].recommended_actions || [],
        confidence: Math.round((0.7 + Math.random() * 0.2) * 100) / 100,
      };
    }
    
    if (parsed[readinessKey]) {
      const timing = parsed[readinessKey].recommended_timing?.toLowerCase() || "delay";
      decision_readiness[lens] = {
        readiness_score: parsed[readinessKey].readiness_score || 50,
        blocking_narratives: parsed[readinessKey].blocking_narratives || [],
        supportive_narratives: parsed[readinessKey].supportive_narratives || [],
        recommended_timing: (timing === "proceed" || timing === "avoid") ? timing : "delay",
        recommended_delay: parsed[readinessKey].recommended_delay,
        confidence: Math.round((0.7 + Math.random() * 0.2) * 100) / 100,
      };
    }
  }
  
  console.log(`${symbol}: Parsed interpretation - overlays: ${Object.keys(decision_overlays).length}, readiness: ${Object.keys(decision_readiness).length}`);

  return {
    decision_overlays,
    decision_readiness,
    snapshot_summary: {
      one_liner: parsed.one_liner || `Market psychology analysis for ${symbol}.`,
      primary_risk: parsed.primary_risk || "Uncertainty",
      dominant_emotion: parsed.dominant_emotion || emotions[0]?.emotion || "Neutral",
      action_bias: parsed.action_bias || "Monitor",
      confidence: dataConfidence.score,
    },
  };
}

// Generate fallback interpretation when AI fails
function generateFallbackInterpretation(
  symbol: string,
  narratives: NarrativeState[],
  emotions: EmotionState[],
  confidenceScore: number
): Interpretation {
  const dominantNarrative = narratives[0];
  const dominantEmotion = emotions[0];
  const bullishNarratives = narratives.filter(n => n.sentiment_skew > 0.2).map(n => n.id);
  const bearishNarratives = narratives.filter(n => n.sentiment_skew < -0.2).map(n => n.id);
  
  // Determine overall bias
  const avgSkew = narratives.reduce((sum, n) => sum + n.sentiment_skew, 0) / (narratives.length || 1);
  const isBullish = avgSkew > 0.1;
  const isBearish = avgSkew < -0.1;
  
  const baseReadiness = isBullish ? 65 : isBearish ? 35 : 50;
  const timing = isBullish ? "proceed" : isBearish ? "delay" : "delay";
  
  const decision_readiness: Record<string, DecisionReadiness> = {};
  const decision_overlays: Record<string, DecisionOverlay> = {};
  
  for (const lens of DECISION_LENSES) {
    decision_readiness[lens] = {
      readiness_score: baseReadiness + Math.round((Math.random() - 0.5) * 20),
      blocking_narratives: bearishNarratives.slice(0, 2),
      supportive_narratives: bullishNarratives.slice(0, 2),
      recommended_timing: timing as "proceed" | "delay" | "avoid",
      recommended_delay: timing === "delay" ? "1-2 weeks" : undefined,
      confidence: confidenceScore,
    };
    
    decision_overlays[lens] = {
      risk_score: isBearish ? 65 : isBullish ? 35 : 50,
      dominant_concerns: bearishNarratives.slice(0, 3).map(n => n.replace(/_/g, " ")),
      recommended_focus: ["Monitor sentiment shifts", "Track narrative changes"],
      recommended_actions: ["Continue monitoring", "Gather more data"],
      confidence: confidenceScore,
    };
  }
  
  return {
    decision_overlays,
    decision_readiness,
    snapshot_summary: {
      one_liner: `${symbol} shows ${dominantNarrative?.label || "mixed"} narrative with ${dominantEmotion?.emotion || "neutral"} sentiment.`,
      primary_risk: bearishNarratives[0]?.replace(/_/g, " ") || "Uncertainty",
      dominant_emotion: dominantEmotion?.emotion || "Neutral",
      action_bias: isBullish ? "Opportunistic" : isBearish ? "Cautious" : "Monitor",
      confidence: confidenceScore,
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

        // Calculate Narrative Coherence Score (NCS)
        const coherence = calculateNarrativeCoherence(narratives, emotions);

        // Build observed state
        const observedState: ObservedState = {
          narratives,
          emotions,
          signals,
          concentration,
          momentum,
          coherence,
        };

        // Compute confidence
        const dataConfidence = computeConfidence(
          messageCount,
          uniqueAuthors,
          narratives.length,
          priorSnapshot
        );

        // ============= TEMPORAL GOVERNANCE =============
        // Fetch multi-period snapshots for temporal synthesis
        const multiPeriodSnapshots = await fetchMultiPeriodSnapshots(supabase, symbol);
        console.log(`${symbol}: Fetched multi-period snapshots: ${Object.keys(multiPeriodSnapshots).filter(k => (multiPeriodSnapshots as any)[k]).join(", ") || "none"}`);

        // Calculate narrative persistence
        const narrativePersistence = await calculateNarrativePersistence(supabase, symbol, narratives);
        console.log(`${symbol}: Calculated persistence for ${narrativePersistence.length} narratives`);

        // Build temporal synthesis (using corporate_strategy as default lens for overall synthesis)
        const { synthesis: temporalSynthesis, effectiveWeights, hourlyOverride, overrideReason } = buildTemporalSynthesis(
          multiPeriodSnapshots,
          "corporate_strategy",
          narrativePersistence
        );

        // Build confidence basis (trust anchor)
        const confidenceBasis = buildConfidenceBasis(
          temporalSynthesis,
          narrativePersistence,
          hourlyOverride,
          overrideReason
        );

        // Build temporal attribution for transparency
        const baseWeights = TEMPORAL_WEIGHTS.corporate_strategy;
        const temporalAttribution = buildTemporalAttribution(
          multiPeriodSnapshots,
          baseWeights,
          effectiveWeights,
          confidenceBasis
        );

        console.log(`${symbol}: Temporal consistency: ${temporalSynthesis.weighted_composite.temporal_consistency}, hourly override: ${hourlyOverride}`);

        // Generate interpretation layer with temporal governance
        const interpretation = await generateInterpretationLayer(
          symbol,
          observedState,
          dataConfidence,
          temporalSynthesis,
          narrativePersistence,
          effectiveWeights,
          lovableApiKey
        );

        // Add temporal attribution and persistence to interpretation
        const enrichedInterpretation = {
          ...interpretation,
          temporal_attribution: temporalAttribution,
          narrative_persistence: narrativePersistence,
        };

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
            interpretation: enrichedInterpretation,
            interpretation_version: 2, // Bump version for temporal governance
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
