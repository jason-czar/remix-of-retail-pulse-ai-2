import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface EmotionHistoryPoint {
  id: string;
  symbol: string;
  recorded_at: string;
  period_type: "hourly" | "daily";
  emotions: Record<string, number>;
  dominant_emotion: string | null;
  message_count: number;
}

interface EmotionHistoryResult {
  data: EmotionHistoryPoint[];
  emotionTrends: Map<string, { time: string; score: number }[]>;
  dominantEmotions: string[];
  averageScores: Record<string, number>;
}

const EMOTION_NAMES = [
  "Excitement",
  "Fear",
  "Hopefulness",
  "Frustration",
  "Conviction",
  "Disappointment",
  "Sarcasm",
  "Humor",
  "Grit",
  "Surprise",
];

export function useEmotionHistory(
  symbol: string,
  days: number = 7,
  periodType: "hourly" | "daily" | "all" = "all"
) {
  return useQuery({
    queryKey: ["emotion-history", symbol, days, periodType],
    queryFn: async (): Promise<EmotionHistoryResult> => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      let query = supabase
        .from("emotion_history")
        .select("*")
        .eq("symbol", symbol.toUpperCase())
        .gte("recorded_at", startDate.toISOString())
        .order("recorded_at", { ascending: true });

      if (periodType !== "all") {
        query = query.eq("period_type", periodType);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(`Failed to fetch emotion history: ${error.message}`);
      }

      const points: EmotionHistoryPoint[] = (data || []).map((row) => {
        // Parse emotions - handle both array format and object format
        let emotionsObj: Record<string, number> = {};
        
        if (Array.isArray(row.emotions)) {
          // Array format: [{name: "Excitement", score: 50}, ...]
          row.emotions.forEach((e: any) => {
            if (e.name && typeof e.score === 'number') {
              emotionsObj[e.name] = e.score;
            }
          });
        } else if (row.emotions && typeof row.emotions === 'object') {
          // Object format: {Excitement: 50, Fear: 35, ...}
          emotionsObj = row.emotions as Record<string, number>;
        }

        return {
          id: row.id,
          symbol: row.symbol,
          recorded_at: row.recorded_at,
          period_type: row.period_type as "hourly" | "daily",
          emotions: emotionsObj,
          dominant_emotion: row.dominant_emotion,
          message_count: row.message_count || 0,
        };
      });

      // Build emotion trends map
      const emotionTrends = new Map<string, { time: string; score: number }[]>();
      const emotionTotals = new Map<string, number>();
      const emotionCounts = new Map<string, number>();

      EMOTION_NAMES.forEach((emotion) => {
        emotionTrends.set(emotion, []);
        emotionTotals.set(emotion, 0);
        emotionCounts.set(emotion, 0);
      });

      points.forEach((point) => {
        const time = point.recorded_at;
        Object.entries(point.emotions).forEach(([emotion, score]) => {
          if (EMOTION_NAMES.includes(emotion) && typeof score === "number") {
            emotionTrends.get(emotion)!.push({ time, score });
            emotionTotals.set(emotion, (emotionTotals.get(emotion) || 0) + score);
            emotionCounts.set(emotion, (emotionCounts.get(emotion) || 0) + 1);
          }
        });
      });

      // Calculate average scores
      const averageScores: Record<string, number> = {};
      EMOTION_NAMES.forEach((emotion) => {
        const total = emotionTotals.get(emotion) || 0;
        const count = emotionCounts.get(emotion) || 1;
        averageScores[emotion] = Math.round(total / count);
      });

      // Get dominant emotions sorted by average score
      const dominantEmotions = EMOTION_NAMES
        .filter((e) => averageScores[e] > 0)
        .sort((a, b) => averageScores[b] - averageScores[a]);

      return {
        data: points,
        emotionTrends,
        dominantEmotions,
        averageScores,
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!symbol,
  });
}
