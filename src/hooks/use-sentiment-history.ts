import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface SentimentHistoryPoint {
  id: string;
  symbol: string;
  recorded_at: string;
  sentiment_score: number;
  bullish_count: number;
  bearish_count: number;
  neutral_count: number;
  message_volume: number;
  dominant_emotion: string | null;
  dominant_narrative: string | null;
}

export interface SentimentHistoryStats {
  avgSentiment: number;
  minSentiment: number;
  maxSentiment: number;
  avgVolume: number;
  totalVolume: number;
  dataPoints: number;
  volatility: number;
}

export interface SentimentMomentum {
  direction: "bullish" | "bearish" | "neutral";
  change: number;
  percentChange?: number;
  trend: string;
  recentAvg?: number;
  olderAvg?: number;
}

export interface SentimentHistoryResponse {
  symbol: string;
  history: SentimentHistoryPoint[];
  stats: SentimentHistoryStats;
  momentum: SentimentMomentum;
  comparison?: Record<string, {
    history: SentimentHistoryPoint[];
    stats: SentimentHistoryStats;
  }>;
  period: {
    start: string;
    end: string;
    days: number;
  };
}

async function fetchSentimentHistory(
  symbol: string,
  days: number = 30,
  compareSymbols: string[] = []
): Promise<SentimentHistoryResponse> {
  const params = new URLSearchParams({
    symbol,
    days: days.toString(),
  });

  if (compareSymbols.length > 0) {
    params.set("compare", compareSymbols.join(","));
  }

  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-sentiment-history?${params.toString()}`,
    {
      headers: {
        "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        "Content-Type": "application/json",
      },
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to fetch sentiment history");
  }

  return response.json();
}

export function useSentimentHistory(
  symbol: string,
  days: number = 30,
  compareSymbols: string[] = []
) {
  return useQuery({
    queryKey: ["sentiment-history", symbol, days, compareSymbols.join(",")],
    queryFn: () => fetchSentimentHistory(symbol, days, compareSymbols),
    enabled: !!symbol,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });
}

// Trigger a manual snapshot recording
export async function recordSentimentSnapshot(symbols?: string[]) {
  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/record-sentiment-snapshot`,
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ symbols }),
    }
  );

  if (!response.ok) {
    throw new Error("Failed to record snapshot");
  }

  return response.json();
}