import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCallback, useState } from "react";

export interface Narrative {
  name: string;
  count: number;
  sentiment: "bullish" | "bearish" | "neutral";
}

export interface NarrativeAnalysisResult {
  narratives: Narrative[];
  messageCount: number;
  cached: boolean;
  timestamp?: string;
}

export function useNarrativeAnalysis(symbol: string, timeRange: string = "24H") {
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
    enabled: !!symbol,
    staleTime: 30 * 60 * 1000, // 30 minutes
    gcTime: 60 * 60 * 1000, // 1 hour (formerly cacheTime)
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
