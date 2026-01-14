import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Yahoo Finance API endpoints
const YAHOO_QUOTE_URL = "https://query1.finance.yahoo.com/v8/finance/chart";

interface PricePoint {
  timestamp: string;
  price: number;
  open: number;
  high: number;
  low: number;
  volume: number;
}

interface PriceResponse {
  prices: PricePoint[];
  currentPrice: number | null;
  previousClose: number | null;
  change: number | null;
  changePercent: number | null;
  marketState: string;
  symbol: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const symbol = url.searchParams.get("symbol")?.toUpperCase();
    const timeRange = url.searchParams.get("timeRange") || "1D";

    if (!symbol) {
      return new Response(
        JSON.stringify({ error: "Symbol is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Map timeRange to Yahoo Finance parameters
    const { range, interval } = getYahooParams(timeRange);

    // Fetch from Yahoo Finance
    const yahooUrl = `${YAHOO_QUOTE_URL}/${symbol}?range=${range}&interval=${interval}&includePrePost=false`;
    
    console.log(`Fetching stock price for ${symbol}, range: ${range}, interval: ${interval}`);
    
    const response = await fetch(yahooUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    if (!response.ok) {
      console.error(`Yahoo Finance API error: ${response.status}`);
      return new Response(
        JSON.stringify({ error: "Failed to fetch stock data", status: response.status }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    
    if (!data.chart?.result?.[0]) {
      return new Response(
        JSON.stringify({ error: "No data found for symbol", symbol }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = data.chart.result[0];
    const meta = result.meta;
    const timestamps = result.timestamp || [];
    const quote = result.indicators?.quote?.[0] || {};
    
    // Build price points array
    const prices: PricePoint[] = [];
    
    for (let i = 0; i < timestamps.length; i++) {
      const timestamp = new Date(timestamps[i] * 1000).toISOString();
      const close = quote.close?.[i];
      const open = quote.open?.[i];
      const high = quote.high?.[i];
      const low = quote.low?.[i];
      const volume = quote.volume?.[i];
      
      // Skip null values (market closed periods)
      if (close != null) {
        prices.push({
          timestamp,
          price: Number(close.toFixed(2)),
          open: Number((open ?? close).toFixed(2)),
          high: Number((high ?? close).toFixed(2)),
          low: Number((low ?? close).toFixed(2)),
          volume: volume ?? 0,
        });
      }
    }

    const priceResponse: PriceResponse = {
      prices,
      currentPrice: meta.regularMarketPrice ?? null,
      previousClose: meta.previousClose ?? null,
      change: meta.regularMarketPrice && meta.previousClose 
        ? Number((meta.regularMarketPrice - meta.previousClose).toFixed(2))
        : null,
      changePercent: meta.regularMarketPrice && meta.previousClose
        ? Number((((meta.regularMarketPrice - meta.previousClose) / meta.previousClose) * 100).toFixed(2))
        : null,
      marketState: meta.marketState || "UNKNOWN",
      symbol: meta.symbol || symbol,
    };

    console.log(`Returning ${prices.length} price points for ${symbol}`);

    return new Response(
      JSON.stringify(priceResponse),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Stock price proxy error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: "Internal server error", message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function getYahooParams(timeRange: string): { range: string; interval: string } {
  switch (timeRange) {
    case "1H":
      return { range: "1d", interval: "1m" };
    case "6H":
      return { range: "1d", interval: "5m" };
    case "1D":
      return { range: "1d", interval: "5m" }; // 5-minute intervals for Today
    case "24H":
      return { range: "1d", interval: "15m" };
    case "7D":
      return { range: "7d", interval: "1h" }; // 1-hour intervals for 7D
    case "30D":
      return { range: "1mo", interval: "1h" }; // 1-hour intervals for 30D
    default:
      return { range: "1d", interval: "1h" };
  }
}
