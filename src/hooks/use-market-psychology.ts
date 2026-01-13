import { useQueries } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMemo } from "react";
import { EmotionAnalysisResult, EmotionScore } from "./use-emotion-analysis";

// Signal emotions for market psychology
const SIGNAL_EMOTIONS = ["FOMO", "Greed", "Fear", "Capitulation", "Euphoria", "Regret"] as const;
const FEAR_EMOTIONS = ["Fear", "Capitulation", "Regret"];
const GREED_EMOTIONS = ["FOMO", "Greed", "Euphoria", "Excitement"];

export interface MarketPsychologyData {
  fearGreedIndex: number; // 0 = Extreme Fear, 100 = Extreme Greed
  fearGreedLabel: "Extreme Fear" | "Fear" | "Neutral" | "Greed" | "Extreme Greed";
  dominantSignal: string | null;
  signalStrength: "weak" | "moderate" | "strong" | "extreme";
  emotionBreakdown: EmotionScore[];
  symbolBreakdown: {
    symbol: string;
    dominantEmotion: string;
    fearGreed: number;
  }[];
  signals: {
    type: "bullish" | "bearish" | "neutral";
    label: string;
    description: string;
    confidence: number;
  }[];
  isLoading: boolean;
  hasData: boolean;
}

function calculateFearGreedIndex(emotions: EmotionScore[]): number {
  let fearScore = 0;
  let greedScore = 0;

  emotions.forEach((e) => {
    if (FEAR_EMOTIONS.includes(e.name)) {
      fearScore += e.score;
    } else if (GREED_EMOTIONS.includes(e.name)) {
      greedScore += e.score;
    }
  });

  const total = fearScore + greedScore;
  if (total === 0) return 50; // Neutral

  // Scale to 0-100 where 0 is fear, 100 is greed
  return Math.round((greedScore / total) * 100);
}

function getFearGreedLabel(index: number): MarketPsychologyData["fearGreedLabel"] {
  if (index <= 20) return "Extreme Fear";
  if (index <= 40) return "Fear";
  if (index <= 60) return "Neutral";
  if (index <= 80) return "Greed";
  return "Extreme Greed";
}

function getSignalStrength(emotions: EmotionScore[]): MarketPsychologyData["signalStrength"] {
  const maxScore = Math.max(...emotions.filter(e => SIGNAL_EMOTIONS.includes(e.name as typeof SIGNAL_EMOTIONS[number])).map(e => e.score), 0);
  if (maxScore >= 30) return "extreme";
  if (maxScore >= 20) return "strong";
  if (maxScore >= 10) return "moderate";
  return "weak";
}

function generateSignals(
  aggregatedEmotions: EmotionScore[],
  fearGreedIndex: number
): MarketPsychologyData["signals"] {
  const signals: MarketPsychologyData["signals"] = [];

  const fomo = aggregatedEmotions.find((e) => e.name === "FOMO");
  const fear = aggregatedEmotions.find((e) => e.name === "Fear");
  const capitulation = aggregatedEmotions.find((e) => e.name === "Capitulation");
  const euphoria = aggregatedEmotions.find((e) => e.name === "Euphoria");
  const greed = aggregatedEmotions.find((e) => e.name === "Greed");

  // Capitulation buy signal
  if (capitulation && capitulation.score >= 15) {
    signals.push({
      type: "bullish",
      label: "Capitulation Detected",
      description: "High capitulation suggests potential market bottom",
      confidence: Math.min(90, 50 + capitulation.score * 2),
    });
  }

  // Euphoria sell signal
  if (euphoria && euphoria.score >= 20) {
    signals.push({
      type: "bearish",
      label: "Euphoria Warning",
      description: "Extreme optimism may signal a market top",
      confidence: Math.min(85, 45 + euphoria.score * 2),
    });
  }

  // FOMO warning
  if (fomo && fomo.score >= 25) {
    signals.push({
      type: "bearish",
      label: "FOMO Surge",
      description: "Fear of missing out at elevated levels",
      confidence: Math.min(80, 40 + fomo.score * 1.5),
    });
  }

  // Fear opportunity
  if (fear && fear.score >= 25 && fearGreedIndex < 30) {
    signals.push({
      type: "bullish",
      label: "Extreme Fear",
      description: "Warren Buffett: Be greedy when others are fearful",
      confidence: Math.min(85, 45 + fear.score * 1.5),
    });
  }

  // Greed caution
  if (greed && greed.score >= 20 && fearGreedIndex > 70) {
    signals.push({
      type: "bearish",
      label: "Greed Alert",
      description: "Elevated greed levels suggest caution",
      confidence: Math.min(75, 40 + greed.score * 1.5),
    });
  }

  // Sort by confidence
  return signals.sort((a, b) => b.confidence - a.confidence).slice(0, 3);
}

export function useMarketPsychology(symbols: string[]): MarketPsychologyData {
  const queries = useQueries({
    queries: symbols.map((symbol) => ({
      queryKey: ["emotion-analysis", symbol, "24H"],
      queryFn: async (): Promise<EmotionAnalysisResult> => {
        const { data, error } = await supabase.functions.invoke("analyze-emotions", {
          body: { symbol, timeRange: "24H" },
        });
        if (error) throw error;
        return data as EmotionAnalysisResult;
      },
      staleTime: 30 * 60 * 1000,
      gcTime: 60 * 60 * 1000,
      retry: 1,
    })),
  });

  const isLoading = queries.some((q) => q.isLoading);
  const successfulData = queries
    .filter((q) => q.isSuccess && q.data)
    .map((q, idx) => ({ symbol: symbols[idx], data: q.data! }));

  const result = useMemo((): MarketPsychologyData => {
    if (successfulData.length === 0) {
      return {
        fearGreedIndex: 50,
        fearGreedLabel: "Neutral",
        dominantSignal: null,
        signalStrength: "weak",
        emotionBreakdown: [],
        symbolBreakdown: [],
        signals: [],
        isLoading,
        hasData: false,
      };
    }

    // Aggregate emotions across all symbols
    const emotionTotals: Record<string, { total: number; count: number }> = {};

    successfulData.forEach(({ data }) => {
      data.emotions.forEach((emotion) => {
        if (!emotionTotals[emotion.name]) {
          emotionTotals[emotion.name] = { total: 0, count: 0 };
        }
        emotionTotals[emotion.name].total += emotion.score;
        emotionTotals[emotion.name].count += 1;
      });
    });

    // Calculate averages
    const aggregatedEmotions: EmotionScore[] = Object.entries(emotionTotals)
      .map(([name, { total, count }]) => ({
        name,
        score: Math.round(total / count),
        percentage: Math.round((total / count) * 10) / 10,
        trend: "stable" as const,
      }))
      .sort((a, b) => b.score - a.score);

    // Calculate symbol breakdown
    const symbolBreakdown = successfulData.map(({ symbol, data }) => ({
      symbol,
      dominantEmotion: data.dominantEmotion,
      fearGreed: calculateFearGreedIndex(data.emotions),
    }));

    const fearGreedIndex = calculateFearGreedIndex(aggregatedEmotions);
    const fearGreedLabel = getFearGreedLabel(fearGreedIndex);
    const signalStrength = getSignalStrength(aggregatedEmotions);

    // Find dominant signal emotion
    const signalEmotions = aggregatedEmotions.filter((e) =>
      SIGNAL_EMOTIONS.includes(e.name as typeof SIGNAL_EMOTIONS[number])
    );
    const dominantSignal = signalEmotions.length > 0 ? signalEmotions[0].name : null;

    const signals = generateSignals(aggregatedEmotions, fearGreedIndex);

    return {
      fearGreedIndex,
      fearGreedLabel,
      dominantSignal,
      signalStrength,
      emotionBreakdown: aggregatedEmotions,
      symbolBreakdown,
      signals,
      isLoading,
      hasData: true,
    };
  }, [successfulData, isLoading]);

  return result;
}
