import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ============= TYPES =============

interface Episode {
  narrative_id: string;
  start_date: string;       // Anchor date (first ≥25% crossing)
  end_date: string;
  peak_prevalence: number;
  snapshots_in_episode: number;
}

interface EpisodeReturn {
  episode_start: string;
  return_5d: number | null;
  return_10d: number | null;
  max_drawdown: number | null;
  anchor_close: number;
}

interface NarrativeOutcome {
  narrative_id: string;
  label: string;
  current_prevalence_pct: number;
  dominant_emotion: string;
  persistence: "structural" | "event-driven" | "emerging";
  
  historical_outcomes: {
    episode_count: number;
    avg_price_move_5d: number | null;
    avg_price_move_10d: number | null;
    median_price_move_10d: number | null;
    p25_price_move_10d: number | null;
    p75_price_move_10d: number | null;
    win_rate_5d: number | null;
    win_rate_10d: number | null;
    max_drawdown_avg: number | null;
  };
  
  confidence: number;
  confidence_label: "experimental" | "moderate" | "high";
}

interface PriceRecord {
  date: string;
  close: number;
}

// ============= CONSTANTS =============

const PREVALENCE_THRESHOLD = 25;          // % prevalence to start episode
const CONSECUTIVE_BELOW_TO_END = 2;       // Snapshots below threshold to end episode
const LOOKBACK_DAYS = 180;                // Days to look back for episodes
const TOP_N_NARRATIVES = 8;               // Max narratives to compute outcomes for
const RECENCY_HALF_LIFE_DAYS = 45;        // Half-life for recency weighting

const PERSISTENCE_WEIGHTS = {
  structural: 1.0,
  "event-driven": 0.7,
  emerging: 0.5,
};

// ============= HELPER FUNCTIONS =============

function calculatePercentiles(values: number[]): { median: number; p25: number; p75: number } {
  if (values.length === 0) return { median: 0, p25: 0, p75: 0 };
  
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  
  const median = n % 2 === 0 
    ? (sorted[n/2 - 1] + sorted[n/2]) / 2 
    : sorted[Math.floor(n/2)];
  
  const p25 = sorted[Math.floor(n * 0.25)];
  const p75 = sorted[Math.floor(n * 0.75)];
  
  return { 
    median: Math.round(median * 100) / 100, 
    p25: Math.round(p25 * 100) / 100, 
    p75: Math.round(p75 * 100) / 100 
  };
}

function applyRecencyWeighting(
  outcomes: { date: string; return_pct: number }[]
): number {
  if (outcomes.length === 0) return 0;
  
  const now = new Date();
  let totalWeight = 0;
  let weightedSum = 0;
  
  for (const o of outcomes) {
    const daysAgo = (now.getTime() - new Date(o.date).getTime()) / (1000 * 60 * 60 * 24);
    const weight = Math.exp(-0.693 * daysAgo / RECENCY_HALF_LIFE_DAYS);
    weightedSum += o.return_pct * weight;
    totalWeight += weight;
  }
  
  return totalWeight > 0 ? Math.round((weightedSum / totalWeight) * 100) / 100 : 0;
}

function computeConfidence(
  episodeCount: number, 
  iqr: number
): { score: number; label: "experimental" | "moderate" | "high" } {
  // Base confidence from sample size
  let sampleScore = episodeCount < 5 ? 0.2 : episodeCount < 10 ? 0.5 : 0.8;
  
  // Penalize high dispersion (IQR > 20% means outcomes are scattered)
  const dispersionPenalty = Math.min(Math.abs(iqr) / 40, 0.3);
  const score = Math.max(0.1, sampleScore - dispersionPenalty);
  
  const label = episodeCount < 5 ? "experimental" 
              : episodeCount < 10 ? "moderate" 
              : "high";
  
  return { score: Math.round(score * 100) / 100, label };
}

// ============= EPISODE DETECTION =============

function detectEpisodes(
  snapshots: any[],
  narrativeId: string
): Episode[] {
  const episodes: Episode[] = [];
  let currentEpisode: Episode | null = null;
  let consecutiveBelowThreshold = 0;
  
  // Sort by date ascending
  const sorted = snapshots.sort((a, b) => 
    new Date(a.snapshot_start).getTime() - new Date(b.snapshot_start).getTime()
  );
  
  for (const snapshot of sorted) {
    const narratives = snapshot.observed_state?.narratives || [];
    const narrative = narratives.find((n: any) => n.id === narrativeId);
    const prevalence = narrative?.prevalence_pct || 0;
    
    if (prevalence >= PREVALENCE_THRESHOLD) {
      // Above threshold
      consecutiveBelowThreshold = 0;
      
      if (!currentEpisode) {
        // Start new episode - ANCHOR DATE is this first crossing
        currentEpisode = {
          narrative_id: narrativeId,
          start_date: snapshot.snapshot_start,
          end_date: snapshot.snapshot_start,
          peak_prevalence: prevalence,
          snapshots_in_episode: 1,
        };
      } else {
        // Extend current episode
        currentEpisode.end_date = snapshot.snapshot_start;
        currentEpisode.peak_prevalence = Math.max(currentEpisode.peak_prevalence, prevalence);
        currentEpisode.snapshots_in_episode++;
      }
    } else {
      // Below threshold
      consecutiveBelowThreshold++;
      
      // Hysteresis: end episode after N consecutive below-threshold snapshots
      if (currentEpisode && consecutiveBelowThreshold >= CONSECUTIVE_BELOW_TO_END) {
        episodes.push(currentEpisode);
        currentEpisode = null;
      }
    }
  }
  
  // Don't include trailing episode (still ongoing)
  // We only want completed episodes with measurable outcomes
  
  return episodes;
}

// ============= FORWARD RETURNS CALCULATION =============

async function getForwardReturns(
  prices: PriceRecord[],
  anchorDateStr: string,
  tradingDaysAhead: number
): Promise<number | null> {
  // Find the anchor date in prices (or closest trading day after)
  const anchorDate = anchorDateStr.split('T')[0];
  const priceMap = new Map(prices.map(p => [p.date, p.close]));
  
  // Get sorted dates after anchor
  const sortedDates = prices
    .map(p => p.date)
    .filter(d => d >= anchorDate)
    .sort();
  
  if (sortedDates.length < tradingDaysAhead + 1) return null;
  
  const anchorClose = priceMap.get(sortedDates[0]);
  const futureClose = priceMap.get(sortedDates[tradingDaysAhead]);
  
  if (anchorClose === undefined || futureClose === undefined) return null;
  
  return Math.round(((futureClose - anchorClose) / anchorClose) * 10000) / 100; // Percent with 2 decimals
}

async function getMaxDrawdown(
  prices: PriceRecord[],
  anchorDateStr: string,
  windowDays: number = 10
): Promise<number | null> {
  const anchorDate = anchorDateStr.split('T')[0];
  
  // Get sorted dates starting from anchor
  const relevantPrices = prices
    .filter(p => p.date >= anchorDate)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, windowDays + 1);
  
  if (relevantPrices.length < 2) return null;
  
  const anchorClose = relevantPrices[0].close;
  let minClose = anchorClose;
  
  for (let i = 1; i < relevantPrices.length; i++) {
    if (relevantPrices[i].close < minClose) {
      minClose = relevantPrices[i].close;
    }
  }
  
  const drawdown = ((minClose - anchorClose) / anchorClose) * 100;
  return Math.round(drawdown * 100) / 100;
}

// ============= MAIN COMPUTATION =============

async function computeOutcomesForSymbol(
  supabase: any,
  symbol: string,
  prices: PriceRecord[]
): Promise<NarrativeOutcome[]> {
  const lookbackDate = new Date();
  lookbackDate.setDate(lookbackDate.getDate() - LOOKBACK_DAYS);
  
  // Fetch psychology snapshots for this symbol
  const { data: snapshots, error: snapshotsError } = await supabase
    .from("psychology_snapshots")
    .select("snapshot_start, observed_state, interpretation")
    .eq("symbol", symbol)
    .in("period_type", ["daily", "hourly"]) // Use daily primarily
    .gte("snapshot_start", lookbackDate.toISOString())
    .order("snapshot_start", { ascending: true });
  
  if (snapshotsError || !snapshots?.length) {
    console.log(`${symbol}: No snapshots found for outcome computation`);
    return [];
  }
  
  console.log(`${symbol}: Found ${snapshots.length} snapshots for outcome analysis`);
  
  // Get the latest snapshot to identify current narratives
  const latestSnapshot = snapshots[snapshots.length - 1];
  const currentNarratives = latestSnapshot?.observed_state?.narratives || [];
  // narrative_persistence is inside interpretation JSONB
  const persistenceData = latestSnapshot?.interpretation?.narrative_persistence || [];
  
  if (currentNarratives.length === 0) {
    console.log(`${symbol}: No current narratives found`);
    return [];
  }
  
  // Rank narratives by prevalence × persistence weight
  const rankedNarratives = currentNarratives
    .map((n: any) => {
      const persistence = persistenceData.find((p: any) => p.narrative_id === n.id);
      const classification = persistence?.classification || "emerging";
      const weight = PERSISTENCE_WEIGHTS[classification as keyof typeof PERSISTENCE_WEIGHTS] || 0.5;
      return {
        ...n,
        persistence_classification: classification,
        ranking_score: n.prevalence_pct * weight,
      };
    })
    .sort((a: any, b: any) => b.ranking_score - a.ranking_score)
    .slice(0, TOP_N_NARRATIVES);
  
  console.log(`${symbol}: Computing outcomes for ${rankedNarratives.length} narratives`);
  
  const outcomes: NarrativeOutcome[] = [];
  
  for (const narrative of rankedNarratives) {
    // Detect episodes for this narrative
    const episodes = detectEpisodes(snapshots, narrative.id);
    
    if (episodes.length === 0) {
      // No completed episodes - still include with empty outcomes
      const iqr = 0;
      const { score, label } = computeConfidence(0, iqr);
      
      outcomes.push({
        narrative_id: narrative.id,
        label: narrative.label,
        current_prevalence_pct: narrative.prevalence_pct,
        dominant_emotion: narrative.dominant_emotions?.[0] || "Unknown",
        persistence: narrative.persistence_classification,
        historical_outcomes: {
          episode_count: 0,
          avg_price_move_5d: null,
          avg_price_move_10d: null,
          median_price_move_10d: null,
          p25_price_move_10d: null,
          p75_price_move_10d: null,
          win_rate_5d: null,
          win_rate_10d: null,
          max_drawdown_avg: null,
        },
        confidence: score,
        confidence_label: label,
      });
      continue;
    }
    
    console.log(`${symbol}: Narrative "${narrative.label}" has ${episodes.length} completed episodes`);
    
    // Calculate returns for each episode
    const episodeReturns: EpisodeReturn[] = [];
    
    for (const episode of episodes) {
      const return5d = await getForwardReturns(prices, episode.start_date, 5);
      const return10d = await getForwardReturns(prices, episode.start_date, 10);
      const maxDrawdown = await getMaxDrawdown(prices, episode.start_date, 10);
      
      const anchorClose = prices.find(p => p.date >= episode.start_date.split('T')[0])?.close || 0;
      
      if (return5d !== null || return10d !== null) {
        episodeReturns.push({
          episode_start: episode.start_date,
          return_5d: return5d,
          return_10d: return10d,
          max_drawdown: maxDrawdown,
          anchor_close: anchorClose,
        });
      }
    }
    
    if (episodeReturns.length === 0) {
      const iqr = 0;
      const { score, label } = computeConfidence(0, iqr);
      
      outcomes.push({
        narrative_id: narrative.id,
        label: narrative.label,
        current_prevalence_pct: narrative.prevalence_pct,
        dominant_emotion: narrative.dominant_emotions?.[0] || "Unknown",
        persistence: narrative.persistence_classification,
        historical_outcomes: {
          episode_count: episodes.length,
          avg_price_move_5d: null,
          avg_price_move_10d: null,
          median_price_move_10d: null,
          p25_price_move_10d: null,
          p75_price_move_10d: null,
          win_rate_5d: null,
          win_rate_10d: null,
          max_drawdown_avg: null,
        },
        confidence: score,
        confidence_label: label,
      });
      continue;
    }
    
    // Calculate statistics
    const returns5d = episodeReturns.map(e => e.return_5d).filter((r): r is number => r !== null);
    const returns10d = episodeReturns.map(e => e.return_10d).filter((r): r is number => r !== null);
    const drawdowns = episodeReturns.map(e => e.max_drawdown).filter((r): r is number => r !== null);
    
    // Apply recency weighting for averages
    const avg5d = returns5d.length > 0 
      ? applyRecencyWeighting(episodeReturns.filter(e => e.return_5d !== null).map(e => ({ date: e.episode_start, return_pct: e.return_5d! })))
      : null;
    
    const avg10d = returns10d.length > 0
      ? applyRecencyWeighting(episodeReturns.filter(e => e.return_10d !== null).map(e => ({ date: e.episode_start, return_pct: e.return_10d! })))
      : null;
    
    // Calculate dispersion (unweighted)
    const { median, p25, p75 } = calculatePercentiles(returns10d);
    const iqr = p75 - p25;
    
    // Win rates
    const winRate5d = returns5d.length > 0 
      ? Math.round((returns5d.filter(r => r > 0).length / returns5d.length) * 100)
      : null;
    
    const winRate10d = returns10d.length > 0
      ? Math.round((returns10d.filter(r => r > 0).length / returns10d.length) * 100)
      : null;
    
    // Average drawdown
    const avgDrawdown = drawdowns.length > 0
      ? Math.round((drawdowns.reduce((a, b) => a + b, 0) / drawdowns.length) * 100) / 100
      : null;
    
    const { score, label } = computeConfidence(episodeReturns.length, iqr);
    
    outcomes.push({
      narrative_id: narrative.id,
      label: narrative.label,
      current_prevalence_pct: narrative.prevalence_pct,
      dominant_emotion: narrative.dominant_emotions?.[0] || "Unknown",
      persistence: narrative.persistence_classification,
      historical_outcomes: {
        episode_count: episodeReturns.length,
        avg_price_move_5d: avg5d,
        avg_price_move_10d: avg10d,
        median_price_move_10d: median || null,
        p25_price_move_10d: p25 || null,
        p75_price_move_10d: p75 || null,
        win_rate_5d: winRate5d,
        win_rate_10d: winRate10d,
        max_drawdown_avg: avgDrawdown,
      },
      confidence: score,
      confidence_label: label,
    });
  }
  
  return outcomes;
}

// ============= MAIN HANDLER =============

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get request body (optional symbol filter)
    let symbols: string[] = [];
    try {
      const body = await req.json();
      if (body.symbol) {
        symbols = [body.symbol.toUpperCase()];
      } else if (body.symbols) {
        symbols = body.symbols.map((s: string) => s.toUpperCase());
      }
    } catch {
      // No body - process all watchlist symbols
    }

    // If no symbols specified, get from watchlists (symbols is an array column)
    if (symbols.length === 0) {
      const { data: watchlistItems } = await supabase
        .from("watchlists")
        .select("symbols");
      
      symbols = [...new Set(watchlistItems?.flatMap(w => w.symbols || []) || [])];
    }

    if (symbols.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No symbols to process", processed: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Computing narrative outcomes for ${symbols.length} symbols: ${symbols.join(", ")}`);

    const results: { symbol: string; success: boolean; outcomes_count: number; error?: string }[] = [];

    for (const symbol of symbols) {
      try {
        // Fetch price history for this symbol
        const { data: priceData, error: priceError } = await supabase
          .from("price_history")
          .select("date, close")
          .eq("symbol", symbol)
          .order("date", { ascending: true });

        if (priceError || !priceData?.length) {
          console.log(`${symbol}: No price history available`);
          results.push({ symbol, success: false, outcomes_count: 0, error: "No price history" });
          continue;
        }

        console.log(`${symbol}: Found ${priceData.length} price records`);

        // Compute outcomes
        const outcomes = await computeOutcomesForSymbol(supabase, symbol, priceData);

        if (outcomes.length === 0) {
          console.log(`${symbol}: No outcomes computed`);
          results.push({ symbol, success: true, outcomes_count: 0 });
          continue;
        }

        // Update the latest psychology snapshot with narrative_outcomes
        const { data: latestSnapshot } = await supabase
          .from("psychology_snapshots")
          .select("id")
          .eq("symbol", symbol)
          .order("snapshot_start", { ascending: false })
          .limit(1)
          .single();

        if (latestSnapshot) {
          const { error: updateError } = await supabase
            .from("psychology_snapshots")
            .update({ narrative_outcomes: outcomes })
            .eq("id", latestSnapshot.id);

          if (updateError) {
            console.error(`${symbol}: Failed to update snapshot:`, updateError);
            results.push({ symbol, success: false, outcomes_count: outcomes.length, error: updateError.message });
          } else {
            console.log(`${symbol}: Updated snapshot with ${outcomes.length} narrative outcomes`);
            results.push({ symbol, success: true, outcomes_count: outcomes.length });
          }
        } else {
          console.log(`${symbol}: No snapshot to update`);
          results.push({ symbol, success: false, outcomes_count: outcomes.length, error: "No snapshot found" });
        }

      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        console.error(`${symbol}: Error computing outcomes:`, message);
        results.push({ symbol, success: false, outcomes_count: 0, error: message });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const totalOutcomes = results.reduce((sum, r) => sum + r.outcomes_count, 0);

    console.log(`Narrative outcome computation complete: ${successCount}/${symbols.length} symbols, ${totalOutcomes} total outcomes`);

    return new Response(
      JSON.stringify({
        success: true,
        processed: symbols.length,
        successful: successCount,
        total_outcomes: totalOutcomes,
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Compute narrative outcomes error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: "Internal server error", message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
