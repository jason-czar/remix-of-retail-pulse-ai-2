import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const YAHOO_QUOTE_URL = "https://query1.finance.yahoo.com/v8/finance/chart";

interface DailyPrice {
  symbol: string;
  date: string;
  close: number;
  open: number | null;
  high: number | null;
  low: number | null;
  volume: number | null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get unique symbols from watchlists
    const { data: watchlistItems, error: watchlistError } = await supabase
      .from("watchlists")
      .select("symbol")
      .order("symbol");

    if (watchlistError) {
      console.error("Error fetching watchlist:", watchlistError);
      throw watchlistError;
    }

    // Get unique symbols
    const symbols = [...new Set(watchlistItems?.map(w => w.symbol) || [])];
    
    if (symbols.length === 0) {
      console.log("No symbols in watchlists to collect prices for");
      return new Response(
        JSON.stringify({ success: true, message: "No symbols to process", collected: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Collecting daily prices for ${symbols.length} symbols: ${symbols.join(", ")}`);

    const results: { symbol: string; success: boolean; error?: string }[] = [];
    const today = new Date().toISOString().split("T")[0];

    for (const symbol of symbols) {
      try {
        // Fetch from Yahoo Finance
        const yahooUrl = `${YAHOO_QUOTE_URL}/${symbol}?range=1d&interval=1d&includePrePost=false`;
        
        const response = await fetch(yahooUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          },
        });

        if (!response.ok) {
          console.error(`Yahoo Finance error for ${symbol}: ${response.status}`);
          results.push({ symbol, success: false, error: `HTTP ${response.status}` });
          continue;
        }

        const data = await response.json();
        const result = data.chart?.result?.[0];

        if (!result) {
          console.error(`No data for ${symbol}`);
          results.push({ symbol, success: false, error: "No data" });
          continue;
        }

        const meta = result.meta;
        const quote = result.indicators?.quote?.[0];
        
        // Get the most recent trading day's data
        const timestamps = result.timestamp || [];
        const lastIdx = timestamps.length - 1;
        
        if (lastIdx < 0) {
          results.push({ symbol, success: false, error: "No timestamps" });
          continue;
        }

        const tradingDate = new Date(timestamps[lastIdx] * 1000).toISOString().split("T")[0];
        
        const dailyPrice: DailyPrice = {
          symbol,
          date: tradingDate,
          close: Number((quote?.close?.[lastIdx] ?? meta.regularMarketPrice ?? 0).toFixed(4)),
          open: quote?.open?.[lastIdx] ? Number(quote.open[lastIdx].toFixed(4)) : null,
          high: quote?.high?.[lastIdx] ? Number(quote.high[lastIdx].toFixed(4)) : null,
          low: quote?.low?.[lastIdx] ? Number(quote.low[lastIdx].toFixed(4)) : null,
          volume: quote?.volume?.[lastIdx] ?? null,
        };

        // Upsert into price_history
        const { error: upsertError } = await supabase
          .from("price_history")
          .upsert(dailyPrice, { onConflict: "symbol,date" });

        if (upsertError) {
          console.error(`Upsert error for ${symbol}:`, upsertError);
          results.push({ symbol, success: false, error: upsertError.message });
        } else {
          console.log(`Collected price for ${symbol}: $${dailyPrice.close} on ${tradingDate}`);
          results.push({ symbol, success: true });
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));

      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        console.error(`Error processing ${symbol}:`, message);
        results.push({ symbol, success: false, error: message });
      }
    }

    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success);

    console.log(`Price collection complete: ${successful}/${symbols.length} successful`);
    if (failed.length > 0) {
      console.log("Failed symbols:", failed.map(f => `${f.symbol}: ${f.error}`).join(", "));
    }

    return new Response(
      JSON.stringify({
        success: true,
        collected: successful,
        total: symbols.length,
        date: today,
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Collect daily prices error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: "Internal server error", message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
