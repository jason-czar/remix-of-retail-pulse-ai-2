import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCallback, useState } from "react";
import { CACHE_TTL } from "@/lib/cache-config";

export interface Narrative {
  name: string;
  count: number;
  sentiment: "bullish" | "bearish" | "neutral";
}

export interface NarrativeAnalysisResult {
  narratives: Narrative[];
  messageCount: number;
  cached: boolean;
  aggregated?: boolean;
  snapshotCount?: number;
  timestamp?: string;
  _stale?: boolean;
}

export function useNarrativeAnalysis(
  symbol: string, 
  timeRange: string = "24H",
  options?: { enabled?: boolean }
) {
  const queryClient = useQueryClient();
  const [skipCache, setSkipCache] = useState(false);

  const query = useQuery({
    queryKey: ["narrative-analysis", symbol, timeRange],
    queryFn: async (): Promise<NarrativeAnalysisResult> => {
      const { data, error } = await supabase.functions.invoke("analyze-narratives", {
        body: { symbol, timeRange, skipCache },
      });

      // Reset skipCache after fetch
      if (skipCache) {
        setSkipCache(false);
      }

      if (error) {
        console.error("Narrative analysis error:", error);
        throw error;
      }

      return {
        ...data,
        timestamp: new Date().toISOString(),
      } as NarrativeAnalysisResult;
    },
    enabled: options?.enabled !== false && !!symbol,
    staleTime: CACHE_TTL.NARRATIVE_ANALYSIS.staleTime,
    gcTime: CACHE_TTL.NARRATIVE_ANALYSIS.gcTime,
    refetchInterval: false, // Don't auto-refetch, rely on cache
    retry: 1,
  });

  const forceRefresh = useCallback(() => {
    setSkipCache(true);
    queryClient.invalidateQueries({ queryKey: ["narrative-analysis", symbol, timeRange] });
  }, [queryClient, symbol, timeRange]);

  return {
    ...query,
    forceRefresh,
  };
}
