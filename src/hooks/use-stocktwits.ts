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

export function useSymbolMessages(symbol: string, limit = 50, start?: string, end?: string) {
  return useQuery({
    queryKey: ['stocktwits', 'messages', symbol, limit, start, end],
    queryFn: () => stocktwitsApi.getMessages(symbol, limit, start, end),
    enabled: !!symbol,
    refetchInterval: 30000,
    staleTime: 15000,
  });
}

export function useSentimentAnalytics(symbol: string, timeRange = '24H', start?: string, end?: string) {
  return useQuery({
    queryKey: ['stocktwits', 'sentiment-analytics', symbol, timeRange, start, end],
    queryFn: () => stocktwitsApi.getSentimentAnalytics(symbol, timeRange, start, end),
    enabled: !!symbol,
    refetchInterval: 60000,
    staleTime: 30000,
  });
}

export function useVolumeAnalytics(symbol: string, timeRange = '24H', start?: string, end?: string) {
  return useQuery({
    queryKey: ['stocktwits', 'volume-analytics', symbol, timeRange, start, end],
    queryFn: () => stocktwitsApi.getVolumeAnalytics(symbol, timeRange, start, end),
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

export function useNarrativesAnalytics(symbol: string, timeRange = '24H', start?: string, end?: string) {
  return useQuery({
    queryKey: ['stocktwits', 'narratives-analytics', symbol, timeRange, start, end],
    queryFn: () => stocktwitsApi.getNarrativesAnalytics(symbol, timeRange, start, end),
    enabled: !!symbol,
    refetchInterval: 60000,
    staleTime: 30000,
  });
}

export function useEmotionsAnalytics(symbol: string, timeRange = '24H', start?: string, end?: string) {
  return useQuery({
    queryKey: ['stocktwits', 'emotions-analytics', symbol, timeRange, start, end],
    queryFn: () => stocktwitsApi.getEmotionsAnalytics(symbol, timeRange, start, end),
    enabled: !!symbol,
    refetchInterval: 60000,
    staleTime: 30000,
  });
}