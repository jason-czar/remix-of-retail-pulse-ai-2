import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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
  created_at: string;
  interpretation_version: number;
}

interface UsePsychologySnapshotOptions {
  symbol: string;
  periodType?: PeriodType;
  limit?: number;
  enabled?: boolean;
}

export function usePsychologySnapshot({
  symbol,
  periodType = "hourly",
  limit = 1,
  enabled = true,
}: UsePsychologySnapshotOptions) {
  return useQuery({
    queryKey: ["psychology-snapshot", symbol, periodType, limit],
    queryFn: async (): Promise<PsychologySnapshot[]> => {
      const { data, error } = await supabase
        .from("psychology_snapshots")
        .select("*")
        .eq("symbol", symbol.toUpperCase())
        .eq("period_type", periodType)
        .order("snapshot_start", { ascending: false })
        .limit(limit);

      if (error) {
        console.error("Error fetching psychology snapshot:", error);
        throw error;
      }

      if (!data || data.length === 0) {
        return [];
      }

      // Parse JSONB fields with type safety
      return data.map((row) => ({
        id: row.id,
        symbol: row.symbol,
        period_type: row.period_type as PeriodType,
        snapshot_start: row.snapshot_start,
        snapshot_end: row.snapshot_end,
        message_count: row.message_count,
        unique_authors: row.unique_authors,
        data_confidence: parseDataConfidence(row.data_confidence),
        observed_state: parseObservedState(row.observed_state),
        interpretation: parseInterpretation(row.interpretation),
        historical_context: row.historical_context
          ? parseHistoricalContext(row.historical_context)
          : null,
        created_at: row.created_at,
        interpretation_version: row.interpretation_version,
      }));
    },
    enabled: enabled && !!symbol,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
}

// Get the latest snapshot for a symbol (any period type, most recent)
export function useLatestPsychologySnapshot(symbol: string, enabled = true) {
  return useQuery({
    queryKey: ["psychology-snapshot-latest", symbol],
    queryFn: async (): Promise<PsychologySnapshot | null> => {
      const { data, error } = await supabase
        .from("psychology_snapshots")
        .select("*")
        .eq("symbol", symbol.toUpperCase())
        .order("snapshot_start", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error("Error fetching latest psychology snapshot:", error);
        throw error;
      }

      if (!data) {
        return null;
      }

      return {
        id: data.id,
        symbol: data.symbol,
        period_type: data.period_type as PeriodType,
        snapshot_start: data.snapshot_start,
        snapshot_end: data.snapshot_end,
        message_count: data.message_count,
        unique_authors: data.unique_authors,
        data_confidence: parseDataConfidence(data.data_confidence),
        observed_state: parseObservedState(data.observed_state),
        interpretation: parseInterpretation(data.interpretation),
        historical_context: data.historical_context
          ? parseHistoricalContext(data.historical_context)
          : null,
        created_at: data.created_at,
        interpretation_version: data.interpretation_version,
      };
    },
    enabled: enabled && !!symbol,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

// Get historical snapshots for trend analysis
export function usePsychologySnapshotHistory({
  symbol,
  periodType = "daily",
  days = 30,
  enabled = true,
}: {
  symbol: string;
  periodType?: PeriodType;
  days?: number;
  enabled?: boolean;
}) {
  return useQuery({
    queryKey: ["psychology-snapshot-history", symbol, periodType, days],
    queryFn: async (): Promise<PsychologySnapshot[]> => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data, error } = await supabase
        .from("psychology_snapshots")
        .select("*")
        .eq("symbol", symbol.toUpperCase())
        .eq("period_type", periodType)
        .gte("snapshot_start", startDate.toISOString())
        .order("snapshot_start", { ascending: true });

      if (error) {
        console.error("Error fetching psychology snapshot history:", error);
        throw error;
      }

      if (!data || data.length === 0) {
        return [];
      }

      return data.map((row) => ({
        id: row.id,
        symbol: row.symbol,
        period_type: row.period_type as PeriodType,
        snapshot_start: row.snapshot_start,
        snapshot_end: row.snapshot_end,
        message_count: row.message_count,
        unique_authors: row.unique_authors,
        data_confidence: parseDataConfidence(row.data_confidence),
        observed_state: parseObservedState(row.observed_state),
        interpretation: parseInterpretation(row.interpretation),
        historical_context: row.historical_context
          ? parseHistoricalContext(row.historical_context)
          : null,
        created_at: row.created_at,
        interpretation_version: row.interpretation_version,
      }));
    },
    enabled: enabled && !!symbol,
    staleTime: 10 * 60 * 1000, // 10 minutes for history
    gcTime: 60 * 60 * 1000, // 1 hour
  });
}

// Parser functions with safe defaults
function parseDataConfidence(raw: unknown): DataConfidence {
  const data = raw as Record<string, unknown> | null;
  return {
    score: (data?.score as number) ?? 0,
    drivers: {
      volume_percentile:
        ((data?.drivers as Record<string, number>)?.volume_percentile as number) ?? 0,
      author_breadth:
        ((data?.drivers as Record<string, number>)?.author_breadth as number) ?? 0,
      narrative_coherence:
        ((data?.drivers as Record<string, number>)?.narrative_coherence as number) ?? 0,
      temporal_stability:
        ((data?.drivers as Record<string, number>)?.temporal_stability as number) ?? 0,
    },
  };
}

function parseObservedState(raw: unknown): ObservedState {
  const data = raw as Record<string, unknown> | null;
  return {
    narratives: (data?.narratives as NarrativeData[]) ?? [],
    emotions: (data?.emotions as EmotionData[]) ?? [],
    signals: {
      emotion_inflection: (data?.signals as Record<string, SignalData>)?.emotion_inflection ?? {
        active: false,
      },
      narrative_shift: (data?.signals as Record<string, SignalData>)?.narrative_shift ?? {
        active: false,
      },
      consensus_breakdown: (data?.signals as Record<string, SignalData>)?.consensus_breakdown ?? {
        active: false,
      },
      capitulation_detected: (data?.signals as Record<string, SignalData>)?.capitulation_detected ?? {
        active: false,
      },
      euphoria_risk: (data?.signals as Record<string, SignalData>)?.euphoria_risk ?? {
        active: false,
      },
    },
    concentration: {
      top_10_users_pct:
        ((data?.concentration as Record<string, unknown>)?.top_10_users_pct as number) ?? 0,
      bull_bear_polarization:
        ((data?.concentration as Record<string, unknown>)?.bull_bear_polarization as number) ?? 0,
      retail_consensus_strength:
        ((data?.concentration as Record<string, unknown>)?.retail_consensus_strength as
          | "weak"
          | "moderate"
          | "strong") ?? "weak",
      // Note: echo_chamber_risk is now computed via computeEchoChamberRisk()
    },
    momentum: {
      overall_sentiment_velocity:
        ((data?.momentum as Record<string, number>)?.overall_sentiment_velocity as number) ?? 0,
      dominant_narrative_velocity:
        ((data?.momentum as Record<string, number>)?.dominant_narrative_velocity as number) ?? 0,
      dominant_emotion_velocity:
        ((data?.momentum as Record<string, number>)?.dominant_emotion_velocity as number) ?? 0,
    },
  };
}

function parseInterpretation(raw: unknown): Interpretation {
  const data = raw as Record<string, unknown> | null;
  return {
    decision_overlays: (data?.decision_overlays as Record<string, DecisionOverlay>) ?? {},
    decision_readiness: (data?.decision_readiness as Record<string, DecisionReadiness>) ?? {},
    snapshot_summary: (data?.snapshot_summary as SnapshotSummary) ?? {
      one_liner: "",
      primary_risk: "",
      dominant_emotion: "",
      action_bias: "",
      confidence: 0,
    },
  };
}

function parseHistoricalContext(raw: unknown): HistoricalContext {
  const data = raw as Record<string, unknown> | null;
  return {
    similar_periods: (data?.similar_periods as HistoricalMatch[]) ?? [],
    historical_bias: (data?.historical_bias as string) ?? "",
  };
}
