import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMemo } from "react";

// All tracked emotions including trading-specific
const ALL_EMOTIONS = [
  "Excitement", "Fear", "Hopefulness", "Frustration", "Conviction",
  "Disappointment", "Sarcasm", "Humor", "Grit", "Surprise",
  "FOMO", "Greed", "Capitulation", "Euphoria", "Regret"
];

// Signal emotions for market psychology
const SIGNAL_EMOTIONS = ["FOMO", "Greed", "Capitulation", "Euphoria", "Regret"];

export interface EmotionMomentum {
  emotion: string;
  currentScore: number;
  previousScore: number;
  velocity: number; // Rate of change (-100 to +100)
  acceleration: number; // Change in velocity
  trend: "surging" | "rising" | "stable" | "falling" | "crashing";
  isExtreme: boolean; // Velocity > 2 standard deviations
  isSignal: boolean; // Part of trading signal emotions
}

export interface EmotionDivergence {
  type: "bullish_divergence" | "bearish_divergence" | "confirmation";
  description: string;
  confidence: number; // 0-100
  emotions: string[];
  signal?: string;
}

export interface MomentumAnalysis {
  emotions: EmotionMomentum[];
  divergences: EmotionDivergence[];
  overallMomentum: "strongly_positive" | "positive" | "neutral" | "negative" | "strongly_negative";
  marketSignal?: {
    type: "potential_top" | "potential_bottom" | "overbought" | "oversold" | "exhaustion" | "neutral";
    confidence: number;
    description: string;
  };
  dataPoints: {
    timestamp: string;
    emotions: Record<string, number>;
    sentimentScore?: number;
  }[];
}

interface SentimentHistoryPoint {
  recorded_at: string;
  sentiment_score: number;
}

export function useEmotionMomentum(
  symbol: string,
  days: number = 7,
  windowSize: number = 3 // Number of data points for momentum calculation
) {
  // Fetch emotion history
  const emotionQuery = useQuery({
    queryKey: ["emotion-momentum-data", symbol, days],
    queryFn: async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data, error } = await supabase
        .from("emotion_history")
        .select("*")
        .eq("symbol", symbol.toUpperCase())
        .gte("recorded_at", startDate.toISOString())
        .order("recorded_at", { ascending: true });

      if (error) throw new Error(`Failed to fetch emotion history: ${error.message}`);
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!symbol,
  });

  // Fetch sentiment history for divergence detection
  const sentimentQuery = useQuery({
    queryKey: ["sentiment-momentum-data", symbol, days],
    queryFn: async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data, error } = await supabase
        .from("sentiment_history")
        .select("recorded_at, sentiment_score")
        .eq("symbol", symbol.toUpperCase())
        .gte("recorded_at", startDate.toISOString())
        .order("recorded_at", { ascending: true });

      if (error) throw new Error(`Failed to fetch sentiment history: ${error.message}`);
      return (data || []) as SentimentHistoryPoint[];
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!symbol,
  });

  // Calculate momentum analysis
  const analysis = useMemo((): MomentumAnalysis | null => {
    if (!emotionQuery.data || emotionQuery.data.length < 2) return null;

    const rawData = emotionQuery.data;
    const sentimentData = sentimentQuery.data || [];

    // Parse emotion data points
    const dataPoints = rawData.map((row) => {
      let emotionsObj: Record<string, number> = {};
      
      if (Array.isArray(row.emotions)) {
        row.emotions.forEach((e: any) => {
          if (e.name && typeof e.score === 'number') {
            emotionsObj[e.name] = e.score;
          }
        });
      } else if (row.emotions && typeof row.emotions === 'object') {
        emotionsObj = row.emotions as Record<string, number>;
      }

      // Find matching sentiment score
      const sentimentPoint = sentimentData.find(s => {
        const sDiff = Math.abs(new Date(s.recorded_at).getTime() - new Date(row.recorded_at).getTime());
        return sDiff < 2 * 60 * 60 * 1000; // Within 2 hours
      });

      return {
        timestamp: row.recorded_at,
        emotions: emotionsObj,
        sentimentScore: sentimentPoint?.sentiment_score,
      };
    });

    // Calculate momentum for each emotion
    const emotionMomentums: EmotionMomentum[] = ALL_EMOTIONS.map((emotion) => {
      const scores = dataPoints.map(dp => dp.emotions[emotion] || 0);
      
      // Get recent and previous windows
      const recentWindow = scores.slice(-windowSize);
      const previousWindow = scores.slice(-windowSize * 2, -windowSize);
      
      const currentScore = recentWindow.length > 0 
        ? Math.round(recentWindow.reduce((a, b) => a + b, 0) / recentWindow.length)
        : 0;
      
      const previousScore = previousWindow.length > 0
        ? Math.round(previousWindow.reduce((a, b) => a + b, 0) / previousWindow.length)
        : currentScore;

      // Calculate velocity (rate of change)
      const velocity = currentScore - previousScore;
      
      // Calculate acceleration (change in velocity)
      const olderWindow = scores.slice(-windowSize * 3, -windowSize * 2);
      const olderScore = olderWindow.length > 0
        ? Math.round(olderWindow.reduce((a, b) => a + b, 0) / olderWindow.length)
        : previousScore;
      const previousVelocity = previousScore - olderScore;
      const acceleration = velocity - previousVelocity;

      // Determine trend
      let trend: EmotionMomentum["trend"] = "stable";
      if (velocity > 15) trend = "surging";
      else if (velocity > 5) trend = "rising";
      else if (velocity < -15) trend = "crashing";
      else if (velocity < -5) trend = "falling";

      // Check for extreme momentum (> 2 std dev)
      const allVelocities = [];
      for (let i = windowSize; i < scores.length; i++) {
        const window = scores.slice(i - windowSize, i);
        const prevWin = scores.slice(Math.max(0, i - windowSize * 2), i - windowSize);
        if (window.length > 0 && prevWin.length > 0) {
          const curr = window.reduce((a, b) => a + b, 0) / window.length;
          const prev = prevWin.reduce((a, b) => a + b, 0) / prevWin.length;
          allVelocities.push(curr - prev);
        }
      }
      
      const mean = allVelocities.length > 0 
        ? allVelocities.reduce((a, b) => a + b, 0) / allVelocities.length 
        : 0;
      const stdDev = Math.sqrt(
        allVelocities.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / (allVelocities.length || 1)
      );
      const isExtreme = Math.abs(velocity) > mean + 2 * stdDev;

      return {
        emotion,
        currentScore,
        previousScore,
        velocity,
        acceleration,
        trend,
        isExtreme,
        isSignal: SIGNAL_EMOTIONS.includes(emotion),
      };
    }).filter(m => m.currentScore > 0 || m.previousScore > 0);

    // Detect divergences
    const divergences: EmotionDivergence[] = [];
    
    // Get sentiment trend
    const recentSentiment = sentimentData.slice(-windowSize);
    const previousSentiment = sentimentData.slice(-windowSize * 2, -windowSize);
    
    const avgRecentSentiment = recentSentiment.length > 0
      ? recentSentiment.reduce((a, b) => a + Number(b.sentiment_score), 0) / recentSentiment.length
      : 50;
    const avgPrevSentiment = previousSentiment.length > 0
      ? previousSentiment.reduce((a, b) => a + Number(b.sentiment_score), 0) / previousSentiment.length
      : 50;
    
    const sentimentDirection = avgRecentSentiment > avgPrevSentiment + 3 ? "rising" 
      : avgRecentSentiment < avgPrevSentiment - 3 ? "falling" 
      : "stable";

    // Check for Fear + Bullish sentiment divergence (capitulation buy signal)
    const fearMomentum = emotionMomentums.find(e => e.emotion === "Fear");
    const capitulationMomentum = emotionMomentums.find(e => e.emotion === "Capitulation");
    const convictionMomentum = emotionMomentums.find(e => e.emotion === "Conviction");
    
    if (fearMomentum && sentimentDirection === "rising" && fearMomentum.velocity > 10) {
      divergences.push({
        type: "bullish_divergence",
        description: "Fear rising while sentiment improves - potential capitulation bottom",
        confidence: Math.min(80, 50 + Math.abs(fearMomentum.velocity)),
        emotions: ["Fear"],
        signal: "Capitulation Buy Signal",
      });
    }

    if (capitulationMomentum && capitulationMomentum.currentScore > 40 && sentimentDirection === "rising") {
      divergences.push({
        type: "bullish_divergence",
        description: "High capitulation with improving sentiment - classic bottom pattern",
        confidence: Math.min(85, 60 + capitulationMomentum.currentScore / 3),
        emotions: ["Capitulation"],
        signal: "Strong Buy Signal",
      });
    }

    // Check for Euphoria + Greed (top signal)
    const euphoriaMomentum = emotionMomentums.find(e => e.emotion === "Euphoria");
    const greedMomentum = emotionMomentums.find(e => e.emotion === "Greed");
    const fomoMomentum = emotionMomentums.find(e => e.emotion === "FOMO");

    if (euphoriaMomentum && greedMomentum && 
        euphoriaMomentum.currentScore > 40 && greedMomentum.currentScore > 40) {
      divergences.push({
        type: "bearish_divergence",
        description: "High euphoria and greed - potential top forming",
        confidence: Math.min(80, (euphoriaMomentum.currentScore + greedMomentum.currentScore) / 2),
        emotions: ["Euphoria", "Greed"],
        signal: "Potential Top Signal",
      });
    }

    // Check for FOMO surge
    if (fomoMomentum && fomoMomentum.velocity > 15 && fomoMomentum.isExtreme) {
      divergences.push({
        type: "bearish_divergence",
        description: "FOMO surging rapidly - late-stage momentum",
        confidence: Math.min(75, 50 + fomoMomentum.velocity),
        emotions: ["FOMO"],
        signal: "FOMO Alert",
      });
    }

    // Check for Conviction divergence
    if (convictionMomentum && sentimentDirection === "falling" && convictionMomentum.velocity > 5) {
      divergences.push({
        type: "bullish_divergence",
        description: "Conviction rising despite falling sentiment - accumulation signal",
        confidence: Math.min(70, 45 + convictionMomentum.velocity),
        emotions: ["Conviction"],
        signal: "Accumulation Signal",
      });
    }

    // Calculate overall momentum
    const signalEmotionMomentums = emotionMomentums.filter(e => SIGNAL_EMOTIONS.includes(e.emotion));
    const avgVelocity = signalEmotionMomentums.length > 0
      ? signalEmotionMomentums.reduce((a, b) => a + b.velocity, 0) / signalEmotionMomentums.length
      : 0;

    let overallMomentum: MomentumAnalysis["overallMomentum"] = "neutral";
    if (avgVelocity > 10) overallMomentum = "strongly_positive";
    else if (avgVelocity > 3) overallMomentum = "positive";
    else if (avgVelocity < -10) overallMomentum = "strongly_negative";
    else if (avgVelocity < -3) overallMomentum = "negative";

    // Determine market signal
    let marketSignal: MomentumAnalysis["marketSignal"] = undefined;
    
    const totalEuphoria = euphoriaMomentum?.currentScore || 0;
    const totalGreed = greedMomentum?.currentScore || 0;
    const totalFOMO = fomoMomentum?.currentScore || 0;
    const totalCapitulation = capitulationMomentum?.currentScore || 0;
    const totalFear = fearMomentum?.currentScore || 0;

    if (totalEuphoria > 50 && totalGreed > 50 && totalFOMO > 40) {
      marketSignal = {
        type: "potential_top",
        confidence: Math.round((totalEuphoria + totalGreed + totalFOMO) / 3),
        description: "Extreme euphoria, greed, and FOMO suggest a potential market top",
      };
    } else if (totalCapitulation > 50 && totalFear > 50) {
      marketSignal = {
        type: "potential_bottom",
        confidence: Math.round((totalCapitulation + totalFear) / 2),
        description: "High capitulation and fear suggest a potential market bottom",
      };
    } else if (totalGreed > 60) {
      marketSignal = {
        type: "overbought",
        confidence: totalGreed,
        description: "Elevated greed levels indicate overbought conditions",
      };
    } else if (totalFear > 60 && totalCapitulation < 30) {
      marketSignal = {
        type: "oversold",
        confidence: totalFear,
        description: "High fear without capitulation suggests oversold conditions",
      };
    } else if (emotionMomentums.find(e => e.emotion === "Regret")?.currentScore || 0 > 50) {
      marketSignal = {
        type: "exhaustion",
        confidence: emotionMomentums.find(e => e.emotion === "Regret")?.currentScore || 0,
        description: "High regret indicates trend exhaustion",
      };
    }

    return {
      emotions: emotionMomentums.sort((a, b) => Math.abs(b.velocity) - Math.abs(a.velocity)),
      divergences,
      overallMomentum,
      marketSignal,
      dataPoints,
    };
  }, [emotionQuery.data, sentimentQuery.data, windowSize]);

  return {
    data: analysis,
    isLoading: emotionQuery.isLoading || sentimentQuery.isLoading,
    error: emotionQuery.error || sentimentQuery.error,
    refetch: () => {
      emotionQuery.refetch();
      sentimentQuery.refetch();
    },
  };
}
