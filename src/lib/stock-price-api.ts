import { supabase } from "@/integrations/supabase/client";

export interface PricePoint {
  timestamp: string;
  price: number;
  open: number;
  high: number;
  low: number;
  volume: number;
}

export interface StockPriceData {
  prices: PricePoint[];
  currentPrice: number | null;
  previousClose: number | null;
  change: number | null;
  changePercent: number | null;
  marketState: string;
  symbol: string;
}

export type TimeRange = '1H' | '6H' | '1D' | '24H' | '7D' | '30D';

export async function fetchStockPrice(
  symbol: string,
  timeRange: TimeRange
): Promise<StockPriceData> {
  const { data, error } = await supabase.functions.invoke("stock-price-proxy", {
    body: null,
    headers: {},
  });

  // Build query params manually since invoke doesn't support them directly
  const url = new URL(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stock-price-proxy`);
  url.searchParams.set("symbol", symbol.toUpperCase());
  url.searchParams.set("timeRange", timeRange);

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to fetch stock price: ${response.status}`);
  }

  return response.json();
}

// Helper to align price data to specific hour slots for chart overlay
export function alignPricesToHourSlots(
  prices: PricePoint[],
  timeRange: TimeRange
): Map<number, PricePoint> {
  const priceByHour = new Map<number, PricePoint>();

  if (timeRange === '1D') {
    // For "Today" view, align to 0-23 hour slots
    prices.forEach(point => {
      const date = new Date(point.timestamp);
      const hour = date.getHours();
      // Only keep the latest price for each hour
      if (!priceByHour.has(hour) || new Date(priceByHour.get(hour)!.timestamp) < date) {
        priceByHour.set(hour, point);
      }
    });
  } else if (timeRange === '24H') {
    // For rolling 24H, use hour indices 0-23 from oldest to newest
    prices.forEach((point, idx) => {
      priceByHour.set(idx, point);
    });
  }

  return priceByHour;
}

// Helper to align price data to date strings for 7D/30D charts
export function alignPricesToDateSlots(
  prices: PricePoint[]
): Map<string, PricePoint> {
  const priceByDate = new Map<string, PricePoint>();

  prices.forEach(point => {
    const date = new Date(point.timestamp);
    // Use YYYY-MM-DD format for matching
    const dateKey = date.toISOString().split('T')[0];
    // Keep the latest price for each day (closing price)
    if (!priceByDate.has(dateKey) || new Date(priceByDate.get(dateKey)!.timestamp) < date) {
      priceByDate.set(dateKey, point);
    }
  });

  return priceByDate;
}
