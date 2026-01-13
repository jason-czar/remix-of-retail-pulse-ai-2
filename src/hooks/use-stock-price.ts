import { useQuery } from "@tanstack/react-query";
import { fetchStockPrice, StockPriceData, TimeRange } from "@/lib/stock-price-api";

export function useStockPrice(symbol: string, timeRange: TimeRange, enabled: boolean = true) {
  return useQuery({
    queryKey: ["stock-price", symbol, timeRange],
    queryFn: () => fetchStockPrice(symbol, timeRange),
    staleTime: 60 * 1000, // 1 minute
    refetchInterval: enabled ? 60 * 1000 : false, // Refresh every minute when enabled
    retry: 2,
    enabled: !!symbol && enabled,
  });
}

export type { StockPriceData, TimeRange };
