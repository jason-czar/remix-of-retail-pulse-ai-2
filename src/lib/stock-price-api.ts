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

export class StockPriceError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "StockPriceError";
    this.status = status;
  }
}

export async function fetchStockPrice(
  symbol: string,
  timeRange: TimeRange
): Promise<StockPriceData> {
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
    const message = errorData.error || `Failed to fetch stock price: ${response.status}`;
    throw new StockPriceError(message, response.status);
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

// Helper to align price data to 5-minute slots for granular price line
// For the "Today" view with configurable session hours
export function alignPricesToFiveMinSlots(
  prices: PricePoint[],
  startHour: number = 7, // Default to 7 AM
  endHour: number = 16   // Default to 4 PM
): Map<number, PricePoint> {
  const priceBySlot = new Map<number, PricePoint>();
  const SLOTS_PER_HOUR = 12;

  prices.forEach(point => {
    const date = new Date(point.timestamp);
    const hour = date.getHours();
    const minute = date.getMinutes();
    
    // Only include prices within the visible hour range
    if (hour < startHour || hour > endHour) return;
    
    // Calculate 5-minute slot index relative to start hour
    const slotIndex = (hour - startHour) * SLOTS_PER_HOUR + Math.floor(minute / 5);
    
    // Keep the latest price for each 5-minute slot
    if (!priceBySlot.has(slotIndex) || new Date(priceBySlot.get(slotIndex)!.timestamp) < date) {
      priceBySlot.set(slotIndex, point);
    }
  });

  return priceBySlot;
}

// Helper to align price data to date strings for 7D/30D charts (daily)
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

// Helper to align hourly price data for 7D/30D charts
// Returns a map keyed by "YYYY-MM-DD-HH" for matching chart data points
export function alignPricesToHourlyTimeSlots(
  prices: PricePoint[]
): Map<string, PricePoint> {
  const priceByHour = new Map<string, PricePoint>();

  prices.forEach(point => {
    const date = new Date(point.timestamp);
    // Create key as "YYYY-MM-DD-HH" for precise hour matching
    const dateKey = date.toISOString().split('T')[0];
    const hour = date.getHours().toString().padStart(2, '0');
    const key = `${dateKey}-${hour}`;
    
    // Keep the latest price for each hour slot
    if (!priceByHour.has(key) || new Date(priceByHour.get(key)!.timestamp) < date) {
      priceByHour.set(key, point);
    }
  });

  return priceByHour;
}

// Helper to get daily closing prices for 7D/30D date-based charts
export function alignPricesToDailySlots(
  prices: PricePoint[]
): Map<string, { price: number; dateLabel: string }> {
  const priceByDate = new Map<string, { price: number; dateLabel: string }>();

  prices.forEach(point => {
    const date = new Date(point.timestamp);
    const dateKey = date.toISOString().split('T')[0];
    // Format as "MMM d" for matching chart x-axis labels
    const dateLabel = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    
    // Keep the latest price for each day
    if (!priceByDate.has(dateKey) || new Date(point.timestamp) > new Date()) {
      priceByDate.set(dateKey, { price: point.price, dateLabel });
    }
  });

  return priceByDate;
}
