import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCallback, useState } from "react";

export interface EmotionScore {
  name: string;
  score: number;
  percentage: number;
  trend: "rising" | "falling" | "stable";
  examples?: string[];
}

export interface EmotionTimePoint {
  timestamp: string;
  label: string;
  emotions: Record<string, number>;
}

export interface EmotionAnalysisResult {
  emotions: EmotionScore[];
  dominantEmotion: string;
  emotionalIntensity: "low" | "moderate" | "high" | "extreme";
  historicalData: EmotionTimePoint[];
  messageCount: number;
  cached: boolean;
  aggregated?: boolean;
  snapshotCount?: number;
  timestamp?: string;
}

export function useEmotionAnalysis(symbol: string, timeRange: string = "24H") {
  const queryClient = useQueryClient();
  const [skipCache, setSkipCache] = useState(false);

  const query = useQuery({
    queryKey: ["emotion-analysis", symbol, timeRange],
    queryFn: async (): Promise<EmotionAnalysisResult> => {
      const { data, error } = await supabase.functions.invoke("analyze-emotions", {
        body: { symbol, timeRange, skipCache },
      });

      // Reset skipCache after fetch
      if (skipCache) {
        setSkipCache(false);
      }

      if (error) {
        console.error("Emotion analysis error:", error);
        throw error;
      }

      return {
        ...data,
        timestamp: new Date().toISOString(),
      } as EmotionAnalysisResult;
    },
    enabled: !!symbol,
    staleTime: 30 * 60 * 1000, // 30 minutes
    gcTime: 60 * 60 * 1000, // 1 hour
    refetchInterval: false, // Don't auto-refetch, rely on cache
    retry: 1,
  });

  const forceRefresh = useCallback(() => {
    setSkipCache(true);
    queryClient.invalidateQueries({ queryKey: ["emotion-analysis", symbol, timeRange] });
  }, [queryClient, symbol, timeRange]);

  return {
    ...query,
    forceRefresh,
  };
}
