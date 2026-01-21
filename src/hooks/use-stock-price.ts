import { useQuery } from "@tanstack/react-query";
import { fetchStockPrice, StockPriceData, TimeRange, StockPriceError } from "@/lib/stock-price-api";

export function useStockPrice(symbol: string, timeRange: TimeRange, enabled: boolean = true) {
  return useQuery({
    queryKey: ["stock-price", symbol, timeRange],
    queryFn: () => fetchStockPrice(symbol, timeRange),
    staleTime: 60 * 1000, // 1 minute
    refetchInterval: enabled ? 60 * 1000 : false, // Refresh every minute when enabled
    // Avoid hammering the proxy/Yahoo when rate-limited.
    retry: (failureCount, error) => {
      if (error instanceof StockPriceError && error.status === 429) return false;
      return failureCount < 2;
    },
    enabled: !!symbol && enabled,
  });
}

export type { StockPriceData, TimeRange };
