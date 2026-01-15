import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PsychologySnapshot, PeriodType, ObservedState, DataConfidence, Interpretation, NarrativeOutcome, HistoricalContext } from "@/hooks/use-psychology-snapshot";

export interface SimilarEpisode {
  snapshot: PsychologySnapshot;
  similarity_score: number;
  matching_narratives: string[];
  matching_emotions: string[];
  days_ago: number;
  // Price context if available
  price_change_after_5d?: number;
  price_change_after_10d?: number;
}

interface UseHistoricalEpisodeMatcherOptions {
  symbol: string;
  enabled?: boolean;
  lookbackDays?: number;
  minSimilarity?: number;
  maxResults?: number;
}

// Calculate similarity between two observed states
function calculateSimilarity(
  current: any,
  historical: any
): { score: number; matchingNarratives: string[]; matchingEmotions: string[] } {
  if (!current?.narratives || !historical?.narratives) {
    return { score: 0, matchingNarratives: [], matchingEmotions: [] };
  }
  
  const currentNarrativeIds = new Set(current.narratives.slice(0, 5).map((n: any) => n.id));
  const historicalNarrativeIds = new Set(historical.narratives.slice(0, 5).map((n: any) => n.id));
  
  const currentEmotions = new Set(current.emotions?.slice(0, 5).map((e: any) => e.emotion) || []);
  const historicalEmotions = new Set(historical.emotions?.slice(0, 5).map((e: any) => e.emotion) || []);
  
  // Find matches
  const matchingNarratives = [...currentNarrativeIds].filter(id => historicalNarrativeIds.has(id));
  const matchingEmotions = [...currentEmotions].filter(e => historicalEmotions.has(e));
  
  // Narrative similarity (60% weight)
  const narrativeSimilarity = matchingNarratives.length / Math.max(currentNarrativeIds.size, 1);
  
  // Emotion similarity (30% weight)
  const emotionSimilarity = matchingEmotions.length / Math.max(currentEmotions.size, 1);
  
  // Sentiment direction match (10% weight)
  const currentSentiment = current.momentum?.overall_sentiment_velocity || 0;
  const historicalSentiment = historical.momentum?.overall_sentiment_velocity || 0;
  const sentimentMatch = (currentSentiment >= 0) === (historicalSentiment >= 0) ? 1 : 0;
  
  const score = Math.round((
    narrativeSimilarity * 60 +
    emotionSimilarity * 30 +
    sentimentMatch * 10
  ));
  
  return { score, matchingNarratives: matchingNarratives as string[], matchingEmotions: matchingEmotions as string[] };
}

export function useHistoricalEpisodeMatcher({
  symbol,
  enabled = true,
  lookbackDays = 90,
  minSimilarity = 40,
  maxResults = 5,
}: UseHistoricalEpisodeMatcherOptions) {
  return useQuery({
    queryKey: ["historical-episode-matcher", symbol, lookbackDays, minSimilarity],
    queryFn: async (): Promise<SimilarEpisode[]> => {
      // First, get the current/latest snapshot
      const { data: latestData, error: latestError } = await supabase
        .from("psychology_snapshots")
        .select("*")
        .eq("symbol", symbol.toUpperCase())
        .order("snapshot_start", { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (latestError || !latestData) {
        console.error("Error fetching latest snapshot:", latestError);
        return [];
      }
      
      const currentObservedState = latestData.observed_state as any;
      
      // Now fetch historical snapshots (daily preferred for stability)
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - lookbackDays);
      
      // Exclude the last 2 days to avoid matching near-current data
      const excludeDate = new Date();
      excludeDate.setDate(excludeDate.getDate() - 2);
      
      const { data: historicalData, error: historicalError } = await supabase
        .from("psychology_snapshots")
        .select("*")
        .eq("symbol", symbol.toUpperCase())
        .eq("period_type", "daily")
        .gte("snapshot_start", startDate.toISOString())
        .lt("snapshot_start", excludeDate.toISOString())
        .order("snapshot_start", { ascending: false });
      
      if (historicalError || !historicalData) {
        console.error("Error fetching historical snapshots:", historicalError);
        return [];
      }
      
      // Fetch price history for outcome data
      const { data: priceData } = await supabase
        .from("price_history")
        .select("date, close")
        .eq("symbol", symbol.toUpperCase())
        .gte("date", startDate.toISOString().split('T')[0])
        .order("date", { ascending: true });
      
      const priceMap = new Map<string, number>();
      if (priceData) {
        priceData.forEach(p => priceMap.set(p.date, Number(p.close)));
      }
      
      // Calculate similarity for each historical snapshot
      const matches: SimilarEpisode[] = [];
      const now = new Date();
      
      for (const row of historicalData) {
        const historicalObservedState = row.observed_state as any;
        const { score, matchingNarratives, matchingEmotions } = calculateSimilarity(
          currentObservedState,
          historicalObservedState
        );
        
        if (score < minSimilarity) continue;
        
        const snapshotDate = new Date(row.snapshot_start);
        const daysAgo = Math.floor((now.getTime() - snapshotDate.getTime()) / (1000 * 60 * 60 * 24));
        
        // Get price changes if available
        const dateStr = snapshotDate.toISOString().split('T')[0];
        const basePrice = priceMap.get(dateStr);
        let priceChange5d: number | undefined;
        let priceChange10d: number | undefined;
        
        if (basePrice) {
          // Find price 5 and 10 days later
          const date5d = new Date(snapshotDate);
          date5d.setDate(date5d.getDate() + 5);
          const date10d = new Date(snapshotDate);
          date10d.setDate(date10d.getDate() + 10);
          
          const price5d = priceMap.get(date5d.toISOString().split('T')[0]);
          const price10d = priceMap.get(date10d.toISOString().split('T')[0]);
          
          if (price5d) {
            priceChange5d = Math.round(((price5d - basePrice) / basePrice) * 1000) / 10;
          }
          if (price10d) {
            priceChange10d = Math.round(((price10d - basePrice) / basePrice) * 1000) / 10;
          }
        }
        
        const parsedSnapshot: PsychologySnapshot = {
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
          narrative_outcomes: parseNarrativeOutcomes(row.narrative_outcomes),
          created_at: row.created_at,
          interpretation_version: row.interpretation_version,
        };
        
        matches.push({
          snapshot: parsedSnapshot,
          similarity_score: score,
          matching_narratives: matchingNarratives,
          matching_emotions: matchingEmotions,
          days_ago: daysAgo,
          price_change_after_5d: priceChange5d,
          price_change_after_10d: priceChange10d,
        });
      }
      
      // Sort by similarity and return top matches
      return matches
        .sort((a, b) => b.similarity_score - a.similarity_score)
        .slice(0, maxResults);
    },
    enabled: enabled && !!symbol,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000,
  });
}

// Helper function to parse historical context
function parseHistoricalContext(raw: unknown) {
  const data = raw as Record<string, unknown> | null;
  return {
    similar_periods: (data?.similar_periods as any[]) || [],
    historical_bias: (data?.historical_bias as string) || "neutral",
  };
}

// Parser functions (duplicated here to avoid circular imports)
function parseDataConfidence(raw: unknown) {
  const data = raw as Record<string, unknown> | null;
  return {
    score: (data?.score as number) ?? 0,
    drivers: {
      volume_percentile: ((data?.drivers as any)?.volume_percentile as number) ?? 0,
      author_breadth: ((data?.drivers as any)?.author_breadth as number) ?? 0,
      narrative_coherence: ((data?.drivers as any)?.narrative_coherence as number) ?? 0,
      temporal_stability: ((data?.drivers as any)?.temporal_stability as number) ?? 0,
    },
  };
}

function parseObservedState(raw: unknown): ObservedState {
  const data = raw as Record<string, unknown> | null;
  return {
    narratives: (data?.narratives as any[]) ?? [],
    emotions: (data?.emotions as any[]) ?? [],
    signals: {
      emotion_inflection: (data?.signals as any)?.emotion_inflection ?? { active: false },
      narrative_shift: (data?.signals as any)?.narrative_shift ?? { active: false },
      consensus_breakdown: (data?.signals as any)?.consensus_breakdown ?? { active: false },
      capitulation_detected: (data?.signals as any)?.capitulation_detected ?? { active: false },
      euphoria_risk: (data?.signals as any)?.euphoria_risk ?? { active: false },
    },
    concentration: {
      top_10_users_pct: ((data?.concentration as any)?.top_10_users_pct as number) ?? 0,
      bull_bear_polarization: ((data?.concentration as any)?.bull_bear_polarization as number) ?? 0,
      retail_consensus_strength: (((data?.concentration as any)?.retail_consensus_strength as "weak" | "moderate" | "strong") ?? "weak"),
    },
    momentum: {
      overall_sentiment_velocity: ((data?.momentum as any)?.overall_sentiment_velocity as number) ?? 0,
      dominant_narrative_velocity: ((data?.momentum as any)?.dominant_narrative_velocity as number) ?? 0,
      dominant_emotion_velocity: ((data?.momentum as any)?.dominant_emotion_velocity as number) ?? 0,
    },
  };
}

function parseInterpretation(raw: unknown) {
  const data = raw as Record<string, unknown> | null;
  return {
    decision_overlays: (data?.decision_overlays as any) ?? {},
    decision_readiness: (data?.decision_readiness as any) ?? {},
    snapshot_summary: {
      one_liner: ((data?.snapshot_summary as any)?.one_liner as string) ?? "",
      primary_risk: ((data?.snapshot_summary as any)?.primary_risk as string) ?? "",
      dominant_emotion: ((data?.snapshot_summary as any)?.dominant_emotion as string) ?? "",
      action_bias: ((data?.snapshot_summary as any)?.action_bias as string) ?? "",
      confidence: ((data?.snapshot_summary as any)?.confidence as number) ?? 0,
    },
    temporal_attribution: (data?.temporal_attribution as any) ?? undefined,
    narrative_persistence: (data?.narrative_persistence as any[]) ?? undefined,
  };
}

function parseNarrativeOutcomes(raw: unknown) {
  if (!raw || !Array.isArray(raw)) return [];
  return raw as any[];
}
