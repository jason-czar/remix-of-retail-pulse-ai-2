import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { PsychologySnapshot, PeriodType, UsePsychologySnapshotOptions } from "./types";
import {
  parseDataConfidence,
  parseObservedState,
  parseInterpretation,
  parseHistoricalContext,
  parseNarrativeOutcomes,
} from "./parsers";

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
        narrative_outcomes: parseNarrativeOutcomes(row.narrative_outcomes),
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
        narrative_outcomes: parseNarrativeOutcomes(data.narrative_outcomes),
        created_at: data.created_at,
        interpretation_version: data.interpretation_version,
      };
    },
    enabled: enabled && !!symbol,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

// Get the latest snapshot that has narrative outcomes data
export function useLatestSnapshotWithOutcomes(symbol: string, enabled = true) {
  return useQuery({
    queryKey: ["psychology-snapshot-with-outcomes", symbol],
    queryFn: async (): Promise<PsychologySnapshot | null> => {
      // Get the most recent snapshot that has non-empty narrative_outcomes
      const { data, error } = await supabase
        .from("psychology_snapshots")
        .select("*")
        .eq("symbol", symbol.toUpperCase())
        .not("narrative_outcomes", "is", null)
        .neq("narrative_outcomes", "[]")
        .order("snapshot_start", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error("Error fetching snapshot with outcomes:", error);
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
        narrative_outcomes: parseNarrativeOutcomes(data.narrative_outcomes),
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
        narrative_outcomes: parseNarrativeOutcomes(row.narrative_outcomes),
        created_at: row.created_at,
        interpretation_version: row.interpretation_version,
      }));
    },
    enabled: enabled && !!symbol,
    staleTime: 10 * 60 * 1000, // 10 minutes for history
    gcTime: 60 * 60 * 1000, // 1 hour
  });
}
