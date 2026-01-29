import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { 
  canMakeRequest, 
  recordSuccess, 
  recordFailure, 
  getCircuitStateLabel,
  isCircuitTripError 
} from '../_shared/circuit-breaker.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Yahoo Finance API endpoints
const YAHOO_QUOTE_URL = "https://query1.finance.yahoo.com/v8/finance/chart";
const CIRCUIT_ID = 'yahoo-finance';

// In-memory cache for rate limit protection
const memoryCache: Map<string, { data: PriceResponse; timestamp: number }> = new Map();
const MEMORY_CACHE_TTL = 5 * 60 * 1000; // 5 minute in-memory cache

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
  _degraded?: boolean;
  _reason?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Get circuit state for response headers
  const circuitState = getCircuitStateLabel(CIRCUIT_ID);

  try {
    const url = new URL(req.url);
    const symbol = url.searchParams.get("symbol")?.toUpperCase();
    const timeRange = url.searchParams.get("timeRange") || "1D";

    if (!symbol) {
      return new Response(
        JSON.stringify({ error: "Symbol is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json", "X-Circuit": circuitState } }
      );
    }

    const cacheKey = `${symbol}-${timeRange}`;
    
    // Check in-memory cache first (fastest, avoids all network calls)
    const memCached = memoryCache.get(cacheKey);
    if (memCached && Date.now() - memCached.timestamp < MEMORY_CACHE_TTL) {
      console.log(`Memory cache hit for ${symbol} ${timeRange}`);
      return new Response(
        JSON.stringify(memCached.data),
        { headers: { ...corsHeaders, "Content-Type": "application/json", "X-Cache": "HIT", "X-Circuit": circuitState } }
      );
    }

    // Check circuit breaker before making upstream request
    if (!canMakeRequest(CIRCUIT_ID)) {
      console.warn(`[Circuit OPEN] ${CIRCUIT_ID} - attempting stale cache fallback`);
      
      // Use stale memory cache as fallback
      const staleCache = memoryCache.get(cacheKey);
      if (staleCache) {
        console.log(`[Stale Cache Fallback] ${symbol} - serving degraded response`);
        return new Response(
          JSON.stringify({ ...staleCache.data, _degraded: true, _reason: 'circuit_open' }),
          { 
            headers: { 
              ...corsHeaders, 
              "Content-Type": "application/json", 
              "X-Cache": "STALE",
              "X-Circuit": "OPEN",
              "X-Degraded": "true",
            } 
          }
        );
      }
      
      // No cache available - return service unavailable
      return new Response(
        JSON.stringify({ 
          error: "Service temporarily unavailable",
          retryAfter: 30,
          _circuit: 'open'
        }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json", "X-Circuit": "OPEN" } }
      );
    }

    // Map timeRange to Yahoo Finance parameters
    const { range, interval } = getYahooParams(timeRange);

    // Fetch from Yahoo Finance with retry logic
    const yahooUrl = `${YAHOO_QUOTE_URL}/${symbol}?range=${range}&interval=${interval}&includePrePost=false`;
    
    console.log(`Fetching stock price for ${symbol}, range: ${range}, interval: ${interval}`);
    
    let response: Response | null = null;
    let retryCount = 0;
    const maxRetries = 2;
    
    while (retryCount <= maxRetries) {
      try {
        response = await fetch(yahooUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "application/json",
            "Accept-Language": "en-US,en;q=0.9",
          },
        });
        
        if (response.ok) {
          // Successful response - exit retry loop
          break;
        }
        
        // Check if this is a circuit-trip error
        if (isCircuitTripError(response.status, false)) {
          recordFailure(CIRCUIT_ID);
          console.warn(`[Circuit Failure] ${CIRCUIT_ID} - status: ${response.status}`);
          
          // Check if we have stale cache we can use
          const staleCache = memoryCache.get(cacheKey);
          if (staleCache) {
            console.log(`Rate limited/error, using stale cache for ${symbol}`);
            return new Response(
              JSON.stringify({ ...staleCache.data, _degraded: true, _reason: 'upstream_error' }),
              { 
                headers: { 
                  ...corsHeaders, 
                  "Content-Type": "application/json",
                  "X-Cache": "STALE",
                  "X-Circuit": getCircuitStateLabel(CIRCUIT_ID),
                  "X-Degraded": "true",
                } 
              }
            );
          }
          
          if (response.status === 429) {
            // Wait before retry with exponential backoff
            const waitTime = Math.pow(2, retryCount) * 1000;
            console.log(`Rate limited, waiting ${waitTime}ms before retry ${retryCount + 1}`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
            retryCount++;
          } else {
            break; // Non-429 error, don't retry
          }
        } else {
          break; // Non-circuit-trip error
        }
      } catch (fetchError) {
        console.error(`Fetch error attempt ${retryCount}:`, fetchError);
        recordFailure(CIRCUIT_ID);
        retryCount++;
        if (retryCount > maxRetries) throw fetchError;
      }
    }

    if (!response || !response.ok) {
      // Try to use stale cache as last resort
      const staleCache = memoryCache.get(cacheKey);
      if (staleCache) {
        console.log(`API failed, using stale cache for ${symbol}`);
        return new Response(
          JSON.stringify({ ...staleCache.data, _degraded: true, _reason: 'api_failed' }),
          { 
            headers: { 
              ...corsHeaders, 
              "Content-Type": "application/json",
              "X-Cache": "STALE",
              "X-Circuit": getCircuitStateLabel(CIRCUIT_ID),
              "X-Degraded": "true",
            } 
          }
        );
      }
      
      console.error(`Yahoo Finance API error: ${response?.status}`);
      return new Response(
        JSON.stringify({ error: "Failed to fetch stock data", status: response?.status || 500 }),
        { status: response?.status || 500, headers: { ...corsHeaders, "Content-Type": "application/json", "X-Circuit": getCircuitStateLabel(CIRCUIT_ID) } }
      );
    }

    // Successful response - record success
    recordSuccess(CIRCUIT_ID);

    const data = await response.json();
    
    if (!data.chart?.result?.[0]) {
      return new Response(
        JSON.stringify({ error: "No data found for symbol", symbol }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json", "X-Circuit": getCircuitStateLabel(CIRCUIT_ID) } }
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

    // Store in memory cache
    memoryCache.set(cacheKey, { data: priceResponse, timestamp: Date.now() });
    
    // Clean old cache entries (keep last 50)
    if (memoryCache.size > 50) {
      const entries = Array.from(memoryCache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      for (let i = 0; i < entries.length - 50; i++) {
        memoryCache.delete(entries[i][0]);
      }
    }

    console.log(`Returning ${prices.length} price points for ${symbol}`);

    return new Response(
      JSON.stringify(priceResponse),
      { 
        headers: { 
          ...corsHeaders, 
          "Content-Type": "application/json",
          "X-Cache": "MISS",
          "X-Circuit": getCircuitStateLabel(CIRCUIT_ID),
        } 
      }
    );
  } catch (error) {
    console.error("Stock price proxy error:", error);
    recordFailure(CIRCUIT_ID);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: "Internal server error", message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json", "X-Circuit": getCircuitStateLabel(CIRCUIT_ID) } }
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
