import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NarrativeSnapshot {
  symbol: string;
  recorded_at: string;
  period_type: "hourly" | "daily";
  narratives: any[];
  dominant_narrative: string | null;
  message_count: number;
}

interface EmotionSnapshot {
  symbol: string;
  recorded_at: string;
  period_type: "hourly" | "daily";
  emotions: Record<string, number>;
  dominant_emotion: string | null;
  message_count: number;
}

interface FailedSymbol {
  symbol: string;
  type: "narrative" | "emotion" | "both";
  error: string;
  retryable: boolean;
}

// Market hours: 9:30 AM - 4:00 PM ET
// Extended hours: 7:30 AM - 6:00 PM ET (2 hours before/after)
function isWithinTradingHours(): boolean {
  const now = new Date();
  // Convert to ET (UTC-5 or UTC-4 during DST)
  const etOffset = -5; // Simplified - you may want DST handling
  const etHour = (now.getUTCHours() + 24 + etOffset) % 24;
  const etMinutes = now.getUTCMinutes();
  const etTime = etHour + etMinutes / 60;
  
  // 7:30 AM to 6:00 PM ET = 7.5 to 18.0
  return etTime >= 7.5 && etTime <= 18.0;
}

function isWeekday(): boolean {
  const now = new Date();
  const day = now.getUTCDay();
  return day >= 1 && day <= 5; // Monday = 1, Friday = 5
}

// Determine if an error/status code is retryable
function isRetryableError(status: number): boolean {
  // Retry on rate limits (429), server errors (5xx)
  return status === 429 || status >= 500;
}

// Fetch with automatic retry and exponential backoff
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries = 3
): Promise<{ response: Response | null; retried: boolean; error?: string }> {
  let lastError: string | null = null;
  let retried = false;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);

      // Don't retry client errors (except rate limits)
      if (response.status >= 400 && response.status < 500 && response.status !== 429) {
        return { response, retried };
      }

      // Success
      if (response.ok) {
        return { response, retried };
      }

      // Retry on rate limits and server errors
      if (isRetryableError(response.status)) {
        if (attempt < maxRetries) {
          retried = true;
          const delay = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
          console.log(`Retry ${attempt + 1}/${maxRetries} after ${delay}ms - status ${response.status}`);
          await new Promise((r) => setTimeout(r, delay));
          continue;
        }
      }

      // Max retries exceeded or non-retryable error
      return { response, retried };
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
      if (attempt < maxRetries) {
        retried = true;
        const delay = Math.pow(2, attempt) * 1000;
        console.log(`Retry ${attempt + 1}/${maxRetries} after network error: ${lastError}`);
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }

  return { response: null, retried, error: lastError || "Max retries exceeded" };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const FUNCTION_TIMEOUT_MS = 140000; // 140s safety margin (edge functions have 150s max)
  const startTime = Date.now();

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body for optional overrides
    let periodType: "hourly" | "daily" = "hourly";
    let forceRun = false;
    
    try {
      const body = await req.json();
      if (body.periodType) periodType = body.periodType;
      if (body.forceRun) forceRun = body.forceRun;
    } catch {
      // No body or invalid JSON, use defaults
    }

    // Check if we should run (weekday + trading hours for hourly)
    if (periodType === "hourly" && !forceRun) {
      if (!isWeekday()) {
        return new Response(
          JSON.stringify({ message: "Skipping - weekend", recorded: 0 }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (!isWithinTradingHours()) {
        return new Response(
          JSON.stringify({ message: "Skipping - outside trading hours", recorded: 0 }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Get all unique symbols from all user watchlists
    const { data: watchlists, error: watchlistError } = await supabase
      .from("watchlists")
      .select("symbols");

    if (watchlistError) {
      throw new Error(`Failed to fetch watchlists: ${watchlistError.message}`);
    }

    // Extract unique symbols
    const allSymbols = new Set<string>();
    for (const watchlist of watchlists || []) {
      for (const symbol of watchlist.symbols || []) {
        allSymbols.add(symbol.toUpperCase());
      }
    }

    const symbols = Array.from(allSymbols);
    console.log(`Processing ${symbols.length} symbols from watchlists: ${symbols.join(", ")}`);

    if (symbols.length === 0) {
      return new Response(
        JSON.stringify({ message: "No symbols in watchlists", recorded: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const narrativeSnapshots: NarrativeSnapshot[] = [];
    const emotionSnapshots: EmotionSnapshot[] = [];
    const errors: string[] = [];
    const failedSymbols: FailedSymbol[] = [];
    const recordedAt = new Date().toISOString();
    let retriedCount = 0;
    let processedCount = 0;

    // Helper to process a single symbol
    async function processSymbol(
      symbol: string,
      isRetryPass: boolean = false
    ): Promise<{ narrativeSuccess: boolean; emotionSuccess: boolean; narrativeRetryable: boolean; emotionRetryable: boolean }> {
      let narrativeSuccess = false;
      let emotionSuccess = false;
      let narrativeRetryable = false;
      let emotionRetryable = false;

      try {
        // Fetch narrative analysis (skipCache to get fresh data)
        const narrativeResult = await fetchWithRetry(
          `${supabaseUrl}/functions/v1/analyze-narratives`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${supabaseServiceKey}`,
            },
            body: JSON.stringify({ symbol, timeRange: "1H", skipCache: true }),
          }
        );

        if (narrativeResult.retried) retriedCount++;

        if (narrativeResult.response?.ok) {
          const narrativeData = await narrativeResult.response.json();
          const narratives = narrativeData.narratives || [];
          const dominantNarrative = narratives.length > 0 ? narratives[0].theme : null;

          narrativeSnapshots.push({
            symbol,
            recorded_at: recordedAt,
            period_type: periodType,
            narratives,
            dominant_narrative: dominantNarrative,
            message_count: narrativeData.messageCount || 0,
          });
          narrativeSuccess = true;
        } else if (narrativeResult.response) {
          const status = narrativeResult.response.status;
          narrativeRetryable = isRetryableError(status);
          if (!isRetryPass) {
            errors.push(`Narrative fetch failed for ${symbol}: ${status}`);
          }
        } else {
          narrativeRetryable = true; // Network errors are retryable
          if (!isRetryPass) {
            errors.push(`Narrative fetch failed for ${symbol}: ${narrativeResult.error}`);
          }
        }

        // Fetch emotion analysis (skipCache to get fresh data)
        const emotionResult = await fetchWithRetry(
          `${supabaseUrl}/functions/v1/analyze-emotions`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${supabaseServiceKey}`,
            },
            body: JSON.stringify({ symbol, timeRange: "1H", skipCache: true }),
          }
        );

        if (emotionResult.retried) retriedCount++;

        if (emotionResult.response?.ok) {
          const emotionData = await emotionResult.response.json();
          const emotions = emotionData.emotions || {};

          // Find dominant emotion
          let dominantEmotion: string | null = null;
          let maxCount = 0;
          for (const [emotion, count] of Object.entries(emotions)) {
            if (typeof count === "number" && count > maxCount) {
              maxCount = count;
              dominantEmotion = emotion;
            }
          }

          emotionSnapshots.push({
            symbol,
            recorded_at: recordedAt,
            period_type: periodType,
            emotions,
            dominant_emotion: dominantEmotion,
            message_count: emotionData.messageCount || 0,
          });
          emotionSuccess = true;
        } else if (emotionResult.response) {
          const status = emotionResult.response.status;
          emotionRetryable = isRetryableError(status);
          if (!isRetryPass) {
            errors.push(`Emotion fetch failed for ${symbol}: ${status}`);
          }
        } else {
          emotionRetryable = true; // Network errors are retryable
          if (!isRetryPass) {
            errors.push(`Emotion fetch failed for ${symbol}: ${emotionResult.error}`);
          }
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        if (!isRetryPass) {
          errors.push(`Error processing ${symbol}: ${errorMessage}`);
        }
        narrativeRetryable = true;
        emotionRetryable = true;
      }

      return { narrativeSuccess, emotionSuccess, narrativeRetryable, emotionRetryable };
    }

    // First pass: Process symbols in batches of 3 to avoid rate limits
    const batchSize = 3;
    for (let i = 0; i < symbols.length; i += batchSize) {
      // Check for timeout
      if (Date.now() - startTime > FUNCTION_TIMEOUT_MS) {
        console.log("Approaching timeout, stopping first pass processing");
        errors.push(`Timeout: ${symbols.length - processedCount} symbols not processed in first pass`);
        break;
      }

      const batch = symbols.slice(i, i + batchSize);

      const results = await Promise.all(
        batch.map(async (symbol) => {
          const result = await processSymbol(symbol, false);
          processedCount++;
          return { symbol, ...result };
        })
      );

      // Track failed symbols for second pass
      for (const result of results) {
        const { symbol, narrativeSuccess, emotionSuccess, narrativeRetryable, emotionRetryable } = result;
        
        if (!narrativeSuccess && !emotionSuccess && (narrativeRetryable || emotionRetryable)) {
          failedSymbols.push({
            symbol,
            type: "both",
            error: "Both analyses failed",
            retryable: true,
          });
        } else if (!narrativeSuccess && narrativeRetryable) {
          failedSymbols.push({
            symbol,
            type: "narrative",
            error: "Narrative analysis failed",
            retryable: true,
          });
        } else if (!emotionSuccess && emotionRetryable) {
          failedSymbols.push({
            symbol,
            type: "emotion",
            error: "Emotion analysis failed",
            retryable: true,
          });
        }
      }

      // Small delay between batches
      if (i + batchSize < symbols.length) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    // Second pass: Retry failed symbols with longer cooldown
    if (failedSymbols.length > 0 && Date.now() - startTime < FUNCTION_TIMEOUT_MS - 30000) {
      console.log(`Second pass: Retrying ${failedSymbols.length} failed symbols...`);
      await new Promise((r) => setTimeout(r, 5000)); // 5s cooldown before retry pass

      const retryableSymbols = failedSymbols.filter((f) => f.retryable);
      let successfulRetries = 0;

      for (const failed of retryableSymbols) {
        // Check for timeout
        if (Date.now() - startTime > FUNCTION_TIMEOUT_MS) {
          console.log("Approaching timeout, stopping second pass");
          errors.push(`Timeout during retry pass: ${retryableSymbols.length - successfulRetries} symbols not retried`);
          break;
        }

        console.log(`Retrying ${failed.symbol} (${failed.type})...`);
        const result = await processSymbol(failed.symbol, true);

        if (
          (failed.type === "both" && result.narrativeSuccess && result.emotionSuccess) ||
          (failed.type === "narrative" && result.narrativeSuccess) ||
          (failed.type === "emotion" && result.emotionSuccess)
        ) {
          successfulRetries++;
          console.log(`Retry successful for ${failed.symbol}`);
        } else {
          errors.push(`Final retry failed for ${failed.symbol} (${failed.type})`);
        }

        // Longer delay between retry attempts
        await new Promise((r) => setTimeout(r, 2000));
      }

      console.log(`Second pass completed: ${successfulRetries}/${retryableSymbols.length} successful retries`);
    }

    // Insert narrative snapshots and update cache
    if (narrativeSnapshots.length > 0) {
      const { error: narrativeInsertError } = await supabase
        .from("narrative_history")
        .insert(narrativeSnapshots);

      if (narrativeInsertError) {
        errors.push(`Failed to insert narrative snapshots: ${narrativeInsertError.message}`);
      }

      // Also populate narrative_cache for instant access (2-hour TTL)
      const cacheExpiry = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
      for (const snapshot of narrativeSnapshots) {
        const { error: cacheError } = await supabase
          .from("narrative_cache")
          .upsert(
            {
              symbol: snapshot.symbol,
              time_range: "24H", // Default time range for cache
              narratives: snapshot.narratives,
              message_count: snapshot.message_count,
              expires_at: cacheExpiry,
            },
            { onConflict: "symbol,time_range" }
          );

        if (cacheError) {
          console.log(`Cache update warning for ${snapshot.symbol}: ${cacheError.message}`);
        }
      }
    }

    // Insert emotion snapshots and update cache
    if (emotionSnapshots.length > 0) {
      const { error: emotionInsertError } = await supabase
        .from("emotion_history")
        .insert(emotionSnapshots);

      if (emotionInsertError) {
        errors.push(`Failed to insert emotion snapshots: ${emotionInsertError.message}`);
      }

      // Also populate emotion_cache for instant access (2-hour TTL)
      const cacheExpiry = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
      for (const snapshot of emotionSnapshots) {
        const { error: cacheError } = await supabase
          .from("emotion_cache")
          .upsert(
            {
              symbol: snapshot.symbol,
              time_range: "24H", // Default time range for cache
              emotions: snapshot.emotions,
              expires_at: cacheExpiry,
            },
            { onConflict: "symbol,time_range" }
          );

        if (cacheError) {
          console.log(`Cache update warning for ${snapshot.symbol}: ${cacheError.message}`);
        }
      }
    }

    // Run cleanup of old records
    const { error: cleanupError } = await supabase.rpc("cleanup_old_history");
    if (cleanupError) {
      console.log(`Cleanup warning: ${cleanupError.message}`);
    }

    const executionTime = Date.now() - startTime;
    console.log(
      `Recorded ${narrativeSnapshots.length} narrative and ${emotionSnapshots.length} emotion snapshots in ${executionTime}ms (${retriedCount} retries)`
    );

    return new Response(
      JSON.stringify({
        success: true,
        periodType,
        narrativeRecords: narrativeSnapshots.length,
        emotionRecords: emotionSnapshots.length,
        symbols: symbols.length,
        retriedCount,
        executionTimeMs: executionTime,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Error recording snapshots:", err);
    const errorMessage = err instanceof Error ? err.message : String(err);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
