import { useMemo } from "react";
import { useStockPrice } from "@/hooks/use-stock-price";
import { 
  alignPricesToFiveMinSlots, 
  alignPricesToHourSlots, 
  alignPricesToDateSlots,
  TimeRange 
} from "@/lib/stock-price-api";

export interface PriceOverlayConfig {
  symbol: string;
  timeRange: TimeRange;
  enabled: boolean;
  /** Use 5-minute granularity for price line (for "Today" view) */
  use5MinSlots?: boolean;
}

export interface PriceOverlayData<T> {
  /** Chart data with price merged in */
  dataWithPrice: T[];
  /** Y-axis domain for price axis [min, max] */
  priceDomain: [number | 'auto', number | 'auto'];
  /** Current price if available */
  currentPrice: number | null;
  /** Price change percentage */
  changePercent: number | null;
  /** Whether price data is loading */
  isLoading: boolean;
  /** Whether price overlay is supported for this time range */
  isSupported: boolean;
}

// Time ranges that support price overlay
const SUPPORTED_TIME_RANGES: TimeRange[] = ['1D', '24H', '7D', '30D'];

/**
 * Hook to add price overlay data to any chart
 * 
 * @param config - Configuration for price overlay
 * @param chartData - Original chart data array
 * @param getSlotIndex - Function to extract slot index from chart data item (for 5-min view)
 * @param getHourIndex - Function to extract hour index from chart data item
 * @param getDateKey - Function to extract date key from chart data item (for 7D/30D)
 */
export function usePriceOverlay<T extends Record<string, any>>(
  config: PriceOverlayConfig,
  chartData: T[],
  options: {
    getSlotIndex?: (item: T) => number | undefined;
    getHourIndex?: (item: T) => number | undefined;
    getDateKey?: (item: T) => string | undefined;
  } = {}
): PriceOverlayData<T & { price?: number | null }> {
  const { symbol, timeRange, enabled, use5MinSlots } = config;
  const { getSlotIndex, getHourIndex, getDateKey } = options;
  
  const isSupported = SUPPORTED_TIME_RANGES.includes(timeRange);
  const shouldFetch = enabled && isSupported;
  
  const { data: priceData, isLoading } = useStockPrice(symbol, timeRange, shouldFetch);
  
  // Merge price data into chart data
  const dataWithPrice = useMemo(() => {
    if (!shouldFetch || !priceData?.prices || priceData.prices.length === 0) {
      return chartData.map(item => ({ ...item, price: null }));
    }

    // For 5-minute view (Today), use 5-minute slot alignment
    if (use5MinSlots && getSlotIndex) {
      const priceBySlot = alignPricesToFiveMinSlots(priceData.prices);
      
      return chartData.map(item => {
        const slotIndex = getSlotIndex(item);
        const pricePoint = slotIndex !== undefined ? priceBySlot.get(slotIndex) : undefined;
        return {
          ...item,
          price: pricePoint?.price ?? null,
        };
      });
    }

    // For hourly views (24H)
    if (getHourIndex && (timeRange === '24H' || timeRange === '1D')) {
      const priceByHour = alignPricesToHourSlots(priceData.prices, timeRange);
      
      return chartData.map(item => {
        const hourIndex = getHourIndex(item);
        const pricePoint = hourIndex !== undefined ? priceByHour.get(hourIndex) : undefined;
        return {
          ...item,
          price: pricePoint?.price ?? null,
        };
      });
    }

    // For daily views (7D/30D)
    if (getDateKey && (timeRange === '7D' || timeRange === '30D')) {
      const priceByDate = alignPricesToDateSlots(priceData.prices);
      
      return chartData.map(item => {
        const dateKey = getDateKey(item);
        const pricePoint = dateKey ? priceByDate.get(dateKey) : undefined;
        return {
          ...item,
          price: pricePoint?.price ?? null,
        };
      });
    }

    return chartData.map(item => ({ ...item, price: null }));
  }, [chartData, priceData, shouldFetch, use5MinSlots, timeRange, getSlotIndex, getHourIndex, getDateKey]);

  // Calculate price domain for right Y-axis
  const priceDomain = useMemo((): [number | 'auto', number | 'auto'] => {
    if (!shouldFetch || !priceData?.prices || priceData.prices.length === 0) {
      return ['auto', 'auto'];
    }
    const prices = priceData.prices.map(p => p.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const padding = (maxPrice - minPrice) * 0.1 || 1;
    return [Math.floor(minPrice - padding), Math.ceil(maxPrice + padding)];
  }, [priceData, shouldFetch]);

  return {
    dataWithPrice,
    priceDomain,
    currentPrice: priceData?.currentPrice ?? null,
    changePercent: priceData?.changePercent ?? null,
    isLoading,
    isSupported,
  };
}
