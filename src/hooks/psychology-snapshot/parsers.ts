import type {
  DataConfidence,
  ObservedState,
  Interpretation,
  HistoricalContext,
  NarrativeOutcome,
  NarrativeData,
  EmotionData,
  SignalData,
  DecisionOverlay,
  DecisionReadiness,
  SnapshotSummary,
  HistoricalMatch,
} from "./types";

// Parser functions with safe defaults

export function parseDataConfidence(raw: unknown): DataConfidence {
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

export function parseObservedState(raw: unknown): ObservedState {
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

export function parseInterpretation(raw: unknown): Interpretation {
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

export function parseHistoricalContext(raw: unknown): HistoricalContext {
  const data = raw as Record<string, unknown> | null;
  return {
    similar_periods: (data?.similar_periods as HistoricalMatch[]) ?? [],
    historical_bias: (data?.historical_bias as string) ?? "",
  };
}

export function parseNarrativeOutcomes(raw: unknown): NarrativeOutcome[] {
  if (!raw || !Array.isArray(raw)) return [];

  return raw.map((item: unknown) => {
    const data = item as Record<string, unknown>;
    const historical = data?.historical_outcomes as Record<string, unknown> | undefined;

    return {
      narrative_id: (data?.narrative_id as string) ?? "",
      label: (data?.label as string) ?? "",
      current_prevalence_pct: (data?.current_prevalence_pct as number) ?? 0,
      dominant_emotion: (data?.dominant_emotion as string) ?? "Unknown",
      persistence: (data?.persistence as "structural" | "event-driven" | "emerging") ?? "emerging",
      historical_outcomes: {
        episode_count: (historical?.episode_count as number) ?? 0,
        avg_price_move_5d: (historical?.avg_price_move_5d as number | null) ?? null,
        avg_price_move_10d: (historical?.avg_price_move_10d as number | null) ?? null,
        median_price_move_10d: (historical?.median_price_move_10d as number | null) ?? null,
        p25_price_move_10d: (historical?.p25_price_move_10d as number | null) ?? null,
        p75_price_move_10d: (historical?.p75_price_move_10d as number | null) ?? null,
        win_rate_5d: (historical?.win_rate_5d as number | null) ?? null,
        win_rate_10d: (historical?.win_rate_10d as number | null) ?? null,
        max_drawdown_avg: (historical?.max_drawdown_avg as number | null) ?? null,
      },
      confidence: (data?.confidence as number) ?? 0,
      confidence_label: (data?.confidence_label as "experimental" | "moderate" | "high") ?? "experimental",
    };
  });
}
