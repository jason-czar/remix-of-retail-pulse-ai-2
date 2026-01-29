/**
 * Consolidated Symbol Page Data Hook
 * 
 * Uses React Query's useQueries to fire multiple independent data requests
 * in parallel, eliminating the waterfall pattern that occurs when hooks
 * are called sequentially.
 */

import { useQueries } from "@tanstack/react-query";
import { stocktwitsApi, SymbolStats, Message } from "@/lib/stocktwits-api";
import { supabase } from "@/integrations/supabase/client";

interface LensSummaryData {
  summary: string;
  confidence?: number;
  messageCount?: number;
  relevantCount?: number;
  keyConcerns?: string[];
  recommendedActions?: string[];
}

interface UseSymbolPageDataOptions {
  symbol: string;
  start: string;
  end: string;
  lens?: string;
  enabled?: boolean;
}

interface UseSymbolPageDataResult {
  // Individual query results
  stats: {
    data: SymbolStats | null;
    isLoading: boolean;
    isError: boolean;
    error: Error | null;
  };
  messages: {
    data: Message[];
    isLoading: boolean;
    isError: boolean;
    error: Error | null;
  };
  lensSummary: {
    data: LensSummaryData | null;
    isLoading: boolean;
    isError: boolean;
    error: Error | null;
    refetch: () => void;
  };
  // Aggregate states
  isLoading: boolean;
  isAnyError: boolean;
}

/**
 * Fetch core symbol page data in parallel.
 * This consolidates the initial data fetching that happens on SymbolPage mount.
 */
export function useSymbolPageData({
  symbol,
  start,
  end,
  lens = 'summary',
  enabled = true,
}: UseSymbolPageDataOptions): UseSymbolPageDataResult {
  const results = useQueries({
    queries: [
      // 1. Symbol stats (sentiment, volume, badges)
      {
        queryKey: ['symbol-stats', symbol],
        queryFn: () => stocktwitsApi.getSymbolStats(symbol),
        enabled: enabled && !!symbol,
        staleTime: 30_000, // 30 seconds
        gcTime: 5 * 60_000, // 5 minutes garbage collection
      },
      // 2. Recent messages
      {
        queryKey: ['symbol-messages', symbol, 50, start, end],
        queryFn: () => stocktwitsApi.getMessages(symbol, 50, start, end),
        enabled: enabled && !!symbol,
        staleTime: 60_000, // 1 minute
        gcTime: 5 * 60_000,
      },
      // 3. Lens summary
      {
        queryKey: ['decision-lens-summary', symbol, lens],
        queryFn: async () => {
          const { data, error } = await supabase.functions.invoke('generate-lens-summary', {
            body: { symbol, lens },
          });
          if (error) throw new Error(error.message);
          return data as LensSummaryData;
        },
        enabled: enabled && !!symbol,
        staleTime: 5 * 60_000, // 5 minutes
        gcTime: 15 * 60_000, // 15 minutes garbage collection
      },
    ],
  });

  const [statsResult, messagesResult, lensSummaryResult] = results;

  return {
    stats: {
      data: statsResult.data ?? null,
      isLoading: statsResult.isLoading,
      isError: statsResult.isError,
      error: statsResult.error as Error | null,
    },
    messages: {
      data: messagesResult.data ?? [],
      isLoading: messagesResult.isLoading,
      isError: messagesResult.isError,
      error: messagesResult.error as Error | null,
    },
    lensSummary: {
      data: lensSummaryResult.data ?? null,
      isLoading: lensSummaryResult.isLoading,
      isError: lensSummaryResult.isError,
      error: lensSummaryResult.error as Error | null,
      refetch: lensSummaryResult.refetch,
    },
    isLoading: results.some(r => r.isLoading),
    isAnyError: results.some(r => r.isError),
  };
}
