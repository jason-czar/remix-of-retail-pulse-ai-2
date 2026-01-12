import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Narrative {
  name: string;
  count: number;
  sentiment: "bullish" | "bearish" | "neutral";
}

export interface NarrativeAnalysisResult {
  narratives: Narrative[];
  cached: boolean;
}

export function useNarrativeAnalysis(symbol: string, timeRange: string = "24H") {
  return useQuery({
    queryKey: ["narrative-analysis", symbol, timeRange],
    queryFn: async (): Promise<NarrativeAnalysisResult> => {
      const { data, error } = await supabase.functions.invoke("analyze-narratives", {
        body: { symbol, timeRange },
      });

      if (error) {
        console.error("Narrative analysis error:", error);
        throw error;
      }

      return data as NarrativeAnalysisResult;
    },
    enabled: !!symbol,
    staleTime: 30 * 60 * 1000, // 30 minutes
    gcTime: 60 * 60 * 1000, // 1 hour (formerly cacheTime)
    refetchInterval: false, // Don't auto-refetch, rely on cache
    retry: 1,
  });
}
