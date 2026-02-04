export type PeriodType = "hourly" | "daily" | "weekly" | "monthly";

export interface VelocityData {
  direction: "accelerating" | "decelerating" | "stable";
  magnitude: number;
}

export interface NarrativeData {
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

export interface EmotionData {
  emotion: string;
  intensity: number;
  change_vs_prior: number;
  volatility: "low" | "moderate" | "high";
  velocity: VelocityData;
  associated_narratives: string[];
  polarity: "bullish" | "bearish" | "neutral";
  confidence: number;
}

export interface SignalData {
  active: boolean;
  strength?: number;
}

export interface ObservedState {
  narratives: NarrativeData[];
  emotions: EmotionData[];
  signals: {
    emotion_inflection: SignalData;
    narrative_shift: SignalData;
    consensus_breakdown: SignalData;
    capitulation_detected: SignalData;
    euphoria_risk: SignalData;
  };
  concentration: {
    top_10_users_pct: number;
    bull_bear_polarization: number;
    retail_consensus_strength: "weak" | "moderate" | "strong";
    // Note: echo_chamber_risk is now computed via computeEchoChamberRisk()
  };
  momentum: {
    overall_sentiment_velocity: number;
    dominant_narrative_velocity: number;
    dominant_emotion_velocity: number;
  };
}

export interface DecisionOverlay {
  risk_score: number;
  dominant_concerns: string[];
  recommended_focus: string[];
  recommended_actions: string[];
  confidence: number;
}

export interface DecisionReadiness {
  readiness_score: number;
  blocking_narratives: string[];
  supportive_narratives: string[];
  recommended_timing: "proceed" | "delay" | "avoid";
  recommended_delay?: string;
  confidence: number;
}

export interface SnapshotSummary {
  one_liner: string;
  primary_risk: string;
  dominant_emotion: string;
  action_bias: string;
  confidence: number;
}

// ============= TEMPORAL GOVERNANCE TYPES =============

export interface NarrativePersistence {
  narrative_id: string;
  weekly_presence_pct: number;
  monthly_presence_pct: number;
  classification: "structural" | "event-driven" | "emerging";
  first_seen_date: string;
  days_active: number;
}

export interface ConfidenceBasis {
  timeframe_agreement: "high" | "moderate" | "low";
  narrative_persistence_ratio: number;
  velocity_alignment: boolean;
  hourly_override_active: boolean;
  override_reason?: string;
}

export interface TemporalAttribution {
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

export interface Interpretation {
  decision_overlays: Record<string, DecisionOverlay>;
  decision_readiness: Record<string, DecisionReadiness>;
  snapshot_summary: SnapshotSummary;
  temporal_attribution?: TemporalAttribution;
  narrative_persistence?: NarrativePersistence[];
}

export interface DataConfidence {
  score: number;
  drivers: {
    volume_percentile: number;
    author_breadth: number;
    narrative_coherence: number;
    temporal_stability: number;
  };
}

export interface HistoricalMatch {
  date: string;
  similarity_score: number;
  outcome_7d_pct: number;
  outcome_30d_pct: number;
}

export interface HistoricalContext {
  similar_periods: HistoricalMatch[];
  historical_bias: string;
}

// ============= NARRATIVE OUTCOME TYPES =============

export interface NarrativeOutcome {
  narrative_id: string;
  label: string;
  current_prevalence_pct: number;
  dominant_emotion: string;
  persistence: "structural" | "event-driven" | "emerging";

  historical_outcomes: {
    episode_count: number;
    avg_price_move_5d: number | null;
    avg_price_move_10d: number | null;
    median_price_move_10d: number | null;
    p25_price_move_10d: number | null;
    p75_price_move_10d: number | null;
    win_rate_5d: number | null;
    win_rate_10d: number | null;
    max_drawdown_avg: number | null;
  };

  confidence: number;
  confidence_label: "experimental" | "moderate" | "high";
}

export interface PsychologySnapshot {
  id: string;
  symbol: string;
  period_type: PeriodType;
  snapshot_start: string;
  snapshot_end: string;
  message_count: number;
  unique_authors: number;
  data_confidence: DataConfidence;
  observed_state: ObservedState;
  interpretation: Interpretation;
  historical_context: HistoricalContext | null;
  narrative_outcomes: NarrativeOutcome[];
  created_at: string;
  interpretation_version: number;
}

export interface UsePsychologySnapshotOptions {
  symbol: string;
  periodType?: PeriodType;
  limit?: number;
  enabled?: boolean;
}

// Derived computation - echo chamber risk computed at query time
export function computeEchoChamberRisk(concentration: {
  top_10_users_pct: number;
  bull_bear_polarization: number;
}): { risk_level: "high" | "moderate" | "low"; explanation: string } {
  const { top_10_users_pct, bull_bear_polarization } = concentration;

  if (top_10_users_pct > 60 && bull_bear_polarization > 0.7) {
    return {
      risk_level: "high",
      explanation: `Top 10 users drive ${top_10_users_pct}% of volume with ${Math.round(bull_bear_polarization * 100)}% polarization`,
    };
  }

  if (top_10_users_pct > 40 || bull_bear_polarization > 0.5) {
    return {
      risk_level: "moderate",
      explanation: "Moderate concentration - validate against broader sources",
    };
  }

  return {
    risk_level: "low",
    explanation: "Broad participation with balanced sentiment",
  };
}
