import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const YAHOO_QUOTE_URL = "https://query1.finance.yahoo.com/v8/finance/chart";

interface BackfillRequest {
  symbol: string;
  days?: number; // Default 365
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { symbol, days = 365 }: BackfillRequest = await req.json();

    if (!symbol) {
      return new Response(
        JSON.stringify({ error: "Symbol is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const upperSymbol = symbol.toUpperCase();
    console.log(`Backfilling ${days} days of price history for ${upperSymbol}`);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check existing data to avoid re-fetching
    const { data: existingPrices } = await supabase
      .from("price_history")
      .select("date")
      .eq("symbol", upperSymbol)
      .order("date", { ascending: false })
      .limit(1);

    const latestExistingDate = existingPrices?.[0]?.date;
    console.log(`Latest existing price for ${upperSymbol}: ${latestExistingDate || "none"}`);

    // Determine Yahoo Finance range parameter
    // For 365 days, use "1y"; for more, use "2y" or "max"
    const range = days <= 365 ? "1y" : days <= 730 ? "2y" : "max";

    // Fetch from Yahoo Finance with daily interval
    const yahooUrl = `${YAHOO_QUOTE_URL}/${upperSymbol}?range=${range}&interval=1d&includePrePost=false`;
    
    console.log(`Fetching from Yahoo Finance: range=${range}`);
    
    const response = await fetch(yahooUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    if (!response.ok) {
      console.error(`Yahoo Finance API error: ${response.status}`);
      return new Response(
        JSON.stringify({ error: "Failed to fetch from Yahoo Finance", status: response.status }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const result = data.chart?.result?.[0];

    if (!result) {
      return new Response(
        JSON.stringify({ error: "No data found for symbol", symbol: upperSymbol }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const timestamps = result.timestamp || [];
    const quote = result.indicators?.quote?.[0] || {};

    // Build price records
    const priceRecords: {
      symbol: string;
      date: string;
      close: number;
      open: number | null;
      high: number | null;
      low: number | null;
      volume: number | null;
      source: string;
    }[] = [];

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    for (let i = 0; i < timestamps.length; i++) {
      const date = new Date(timestamps[i] * 1000);
      const dateStr = date.toISOString().split("T")[0];
      
      // Skip weekends (Saturday = 6, Sunday = 0)
      const dayOfWeek = date.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) continue;

      // Skip if before cutoff
      if (date < cutoffDate) continue;

      const close = quote.close?.[i];
      if (close == null) continue; // Skip null/undefined closes

      priceRecords.push({
        symbol: upperSymbol,
        date: dateStr,
        close: Number(close.toFixed(4)),
        open: quote.open?.[i] != null ? Number(quote.open[i].toFixed(4)) : null,
        high: quote.high?.[i] != null ? Number(quote.high[i].toFixed(4)) : null,
        low: quote.low?.[i] != null ? Number(quote.low[i].toFixed(4)) : null,
        volume: quote.volume?.[i] ?? null,
        source: "yahoo_backfill",
      });
    }

    console.log(`Parsed ${priceRecords.length} price records for ${upperSymbol}`);

    if (priceRecords.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          symbol: upperSymbol, 
          inserted: 0, 
          message: "No valid price data found" 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Upsert in batches to avoid hitting limits
    const BATCH_SIZE = 100;
    let totalInserted = 0;
    let totalSkipped = 0;

    for (let i = 0; i < priceRecords.length; i += BATCH_SIZE) {
      const batch = priceRecords.slice(i, i + BATCH_SIZE);
      
      const { error, count } = await supabase
        .from("price_history")
        .upsert(batch, { 
          onConflict: "symbol,date",
          count: "exact"
        });

      if (error) {
        console.error(`Batch upsert error at index ${i}:`, error);
        throw error;
      }

      totalInserted += count || batch.length;
    }

    const dateRange = {
      start: priceRecords[0]?.date,
      end: priceRecords[priceRecords.length - 1]?.date,
    };

    console.log(`Backfill complete for ${upperSymbol}: ${totalInserted} records from ${dateRange.start} to ${dateRange.end}`);

    return new Response(
      JSON.stringify({
        success: true,
        symbol: upperSymbol,
        inserted: totalInserted,
        dateRange,
        tradingDays: priceRecords.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Backfill price history error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: "Internal server error", message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
