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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

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
    const recordedAt = new Date().toISOString();

    // Process symbols in batches of 3 to avoid rate limits
    const batchSize = 3;
    for (let i = 0; i < symbols.length; i += batchSize) {
      const batch = symbols.slice(i, i + batchSize);
      
      await Promise.all(
        batch.map(async (symbol) => {
          try {
            // Fetch narrative analysis (skipCache to get fresh data)
            const narrativeResponse = await fetch(
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

            if (narrativeResponse.ok) {
              const narrativeData = await narrativeResponse.json();
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
            } else {
              errors.push(`Narrative fetch failed for ${symbol}: ${narrativeResponse.status}`);
            }

            // Fetch emotion analysis (skipCache to get fresh data)
            const emotionResponse = await fetch(
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

            if (emotionResponse.ok) {
              const emotionData = await emotionResponse.json();
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
            } else {
              errors.push(`Emotion fetch failed for ${symbol}: ${emotionResponse.status}`);
            }
          } catch (err) {
            const errorMessage = err instanceof Error ? err.message : String(err);
            errors.push(`Error processing ${symbol}: ${errorMessage}`);
          }
        })
      );

      // Small delay between batches
      if (i + batchSize < symbols.length) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    // Insert narrative snapshots
    if (narrativeSnapshots.length > 0) {
      const { error: narrativeInsertError } = await supabase
        .from("narrative_history")
        .insert(narrativeSnapshots);

      if (narrativeInsertError) {
        errors.push(`Failed to insert narrative snapshots: ${narrativeInsertError.message}`);
      }
    }

    // Insert emotion snapshots
    if (emotionSnapshots.length > 0) {
      const { error: emotionInsertError } = await supabase
        .from("emotion_history")
        .insert(emotionSnapshots);

      if (emotionInsertError) {
        errors.push(`Failed to insert emotion snapshots: ${emotionInsertError.message}`);
      }
    }

    // Run cleanup of old records
    const { error: cleanupError } = await supabase.rpc("cleanup_old_history");
    if (cleanupError) {
      console.log(`Cleanup warning: ${cleanupError.message}`);
    }

    console.log(
      `Recorded ${narrativeSnapshots.length} narrative and ${emotionSnapshots.length} emotion snapshots`
    );

    return new Response(
      JSON.stringify({
        success: true,
        periodType,
        narrativeRecords: narrativeSnapshots.length,
        emotionRecords: emotionSnapshots.length,
        symbols: symbols.length,
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
