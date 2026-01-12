import { useQuery } from "@tanstack/react-query";
import { stocktwitsApi } from "@/lib/stocktwits-api";

export function useTrending() {
  return useQuery({
    queryKey: ['stocktwits', 'trending'],
    queryFn: () => stocktwitsApi.getTrending(),
    refetchInterval: 60000, // Refresh every minute
    staleTime: 30000,
  });
}

export function useSymbolStats(symbol: string) {
  return useQuery({
    queryKey: ['stocktwits', 'stats', symbol],
    queryFn: () => stocktwitsApi.getSymbolStats(symbol),
    enabled: !!symbol,
    refetchInterval: 30000,
    staleTime: 15000,
  });
}

export function useSymbolMessages(symbol: string, limit = 50) {
  return useQuery({
    queryKey: ['stocktwits', 'messages', symbol, limit],
    queryFn: () => stocktwitsApi.getMessages(symbol, limit),
    enabled: !!symbol,
    refetchInterval: 30000,
    staleTime: 15000,
  });
}

export function useSentimentAnalytics(symbol: string, type = 'hourly') {
  return useQuery({
    queryKey: ['stocktwits', 'sentiment-analytics', symbol, type],
    queryFn: () => stocktwitsApi.getSentimentAnalytics(symbol, type),
    enabled: !!symbol,
    refetchInterval: 60000,
    staleTime: 30000,
  });
}

export function useVolumeAnalytics(symbol: string) {
  return useQuery({
    queryKey: ['stocktwits', 'volume-analytics', symbol],
    queryFn: () => stocktwitsApi.getVolumeAnalytics(symbol),
    enabled: !!symbol,
    refetchInterval: 60000,
    staleTime: 30000,
  });
}

export function useSymbolSentiment(symbol: string) {
  return useQuery({
    queryKey: ['stocktwits', 'sentiment', symbol],
    queryFn: () => stocktwitsApi.getSentiment(symbol),
    enabled: !!symbol,
    refetchInterval: 60000,
    staleTime: 30000,
  });
}