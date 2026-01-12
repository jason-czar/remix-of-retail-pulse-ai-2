import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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
  cached: boolean;
}

export function useEmotionAnalysis(symbol: string, timeRange: string = "24H") {
  return useQuery({
    queryKey: ["emotion-analysis", symbol, timeRange],
    queryFn: async (): Promise<EmotionAnalysisResult> => {
      const { data, error } = await supabase.functions.invoke("analyze-emotions", {
        body: { symbol, timeRange },
      });

      if (error) {
        console.error("Emotion analysis error:", error);
        throw error;
      }

      return data as EmotionAnalysisResult;
    },
    enabled: !!symbol,
    staleTime: 30 * 60 * 1000, // 30 minutes
    gcTime: 60 * 60 * 1000, // 1 hour
    refetchInterval: false, // Don't auto-refetch, rely on cache
    retry: 1,
  });
}
