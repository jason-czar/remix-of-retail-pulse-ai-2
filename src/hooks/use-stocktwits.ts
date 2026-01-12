import { useQuery, useInfiniteQuery } from "@tanstack/react-query";
import { stocktwitsApi, MessageCursor } from "@/lib/stocktwits-api";

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

// Simple messages hook (backwards compatible)
export function useSymbolMessages(symbol: string, limit = 50, start?: string, end?: string) {
  return useQuery({
    queryKey: ['stocktwits', 'messages', symbol, limit, start, end],
    queryFn: () => stocktwitsApi.getMessages(symbol, limit, start, end),
    enabled: !!symbol,
    refetchInterval: 30000,
    staleTime: 15000,
  });
}

// Infinite scroll messages with cursor-based pagination
export function useSymbolMessagesInfinite(symbol: string, start?: string, end?: string, pageSize = 100) {
  return useInfiniteQuery({
    queryKey: ['stocktwits', 'messages-infinite', symbol, start, end, pageSize],
    queryFn: ({ pageParam }) => 
      stocktwitsApi.getMessagesPaginated(symbol, pageSize, start, end, pageParam as MessageCursor | undefined),
    initialPageParam: undefined as MessageCursor | undefined,
    getNextPageParam: (lastPage) => lastPage.has_more ? lastPage.next_cursor : undefined,
    enabled: !!symbol,
    staleTime: 15000,
  });
}

// Fetch all messages at once (for AI analysis)
export function useAllSymbolMessages(symbol: string, start?: string, end?: string, maxMessages = 10000) {
  return useQuery({
    queryKey: ['stocktwits', 'all-messages', symbol, start, end, maxMessages],
    queryFn: () => stocktwitsApi.getAllMessages(symbol, start, end, maxMessages),
    enabled: !!symbol,
    staleTime: 60000, // Cache for 1 minute
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