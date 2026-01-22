import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Sanitize text by removing non-ASCII characters and normalizing whitespace
function sanitizeText(text: string): string {
  if (!text || typeof text !== "string") return text;
  return text
    .replace(/[^\x00-\x7F]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// Check if text contains non-ASCII characters
function hasNonAscii(text: string): boolean {
  if (!text || typeof text !== "string") return false;
  return /[^\x00-\x7F]/.test(text);
}

// Recursively sanitize all string values in an object
function sanitizeObject(obj: any): { sanitized: any; changed: boolean } {
  if (obj === null || obj === undefined) {
    return { sanitized: obj, changed: false };
  }

  if (typeof obj === "string") {
    const sanitized = sanitizeText(obj);
    return { sanitized, changed: sanitized !== obj };
  }

  if (Array.isArray(obj)) {
    let anyChanged = false;
    const sanitized = obj.map((item) => {
      const result = sanitizeObject(item);
      if (result.changed) anyChanged = true;
      return result.sanitized;
    });
    return { sanitized, changed: anyChanged };
  }

  if (typeof obj === "object") {
    let anyChanged = false;
    const sanitized: any = {};
    for (const key of Object.keys(obj)) {
      const result = sanitizeObject(obj[key]);
      sanitized[key] = result.sanitized;
      if (result.changed) anyChanged = true;
    }
    return { sanitized, changed: anyChanged };
  }

  return { sanitized: obj, changed: false };
}

interface CleanupResult {
  scanned: number;
  updated: number;
  errors: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Missing Supabase configuration");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Parse request body
    const body = await req.json().catch(() => ({}));
    const { 
      tables = ["psychology_snapshots", "narrative_cache", "lens_summary_cache"],
      dryRun = true,
      batchSize = 100
    } = body;

    console.log(`Cleanup started: tables=${tables.join(",")}, dryRun=${dryRun}, batchSize=${batchSize}`);

    const results: Record<string, CleanupResult> = {};

    // Cleanup psychology_snapshots (JSONB observed_state and interpretation)
    if (tables.includes("psychology_snapshots")) {
      results.psychology_snapshots = { scanned: 0, updated: 0, errors: 0 };

      let offset = 0;
      let hasMore = true;

      while (hasMore) {
        const { data: snapshots, error } = await supabase
          .from("psychology_snapshots")
          .select("id, observed_state, interpretation")
          .range(offset, offset + batchSize - 1);

        if (error) {
          console.error("Error fetching psychology_snapshots:", error);
          results.psychology_snapshots.errors++;
          break;
        }

        if (!snapshots || snapshots.length === 0) {
          hasMore = false;
          break;
        }

        results.psychology_snapshots.scanned += snapshots.length;

        for (const snapshot of snapshots) {
          let needsUpdate = false;
          const updates: any = {};

          // Check and sanitize observed_state
          if (snapshot.observed_state) {
            const { sanitized, changed } = sanitizeObject(snapshot.observed_state);
            if (changed) {
              updates.observed_state = sanitized;
              needsUpdate = true;
            }
          }

          // Check and sanitize interpretation
          if (snapshot.interpretation) {
            const { sanitized, changed } = sanitizeObject(snapshot.interpretation);
            if (changed) {
              updates.interpretation = sanitized;
              needsUpdate = true;
            }
          }

          if (needsUpdate) {
            if (!dryRun) {
              const { error: updateError } = await supabase
                .from("psychology_snapshots")
                .update(updates)
                .eq("id", snapshot.id);

              if (updateError) {
                console.error(`Error updating psychology_snapshot ${snapshot.id}:`, updateError);
                results.psychology_snapshots.errors++;
              } else {
                results.psychology_snapshots.updated++;
              }
            } else {
              results.psychology_snapshots.updated++;
              console.log(`[DRY RUN] Would update psychology_snapshot ${snapshot.id}`);
            }
          }
        }

        offset += batchSize;
        if (snapshots.length < batchSize) {
          hasMore = false;
        }
      }

      console.log(`psychology_snapshots: scanned=${results.psychology_snapshots.scanned}, updated=${results.psychology_snapshots.updated}`);
    }

    // Cleanup narrative_cache (JSONB narratives)
    if (tables.includes("narrative_cache")) {
      results.narrative_cache = { scanned: 0, updated: 0, errors: 0 };

      let offset = 0;
      let hasMore = true;

      while (hasMore) {
        const { data: cacheEntries, error } = await supabase
          .from("narrative_cache")
          .select("id, narratives")
          .range(offset, offset + batchSize - 1);

        if (error) {
          console.error("Error fetching narrative_cache:", error);
          results.narrative_cache.errors++;
          break;
        }

        if (!cacheEntries || cacheEntries.length === 0) {
          hasMore = false;
          break;
        }

        results.narrative_cache.scanned += cacheEntries.length;

        for (const entry of cacheEntries) {
          if (entry.narratives) {
            const { sanitized, changed } = sanitizeObject(entry.narratives);

            if (changed) {
              if (!dryRun) {
                const { error: updateError } = await supabase
                  .from("narrative_cache")
                  .update({ narratives: sanitized })
                  .eq("id", entry.id);

                if (updateError) {
                  console.error(`Error updating narrative_cache ${entry.id}:`, updateError);
                  results.narrative_cache.errors++;
                } else {
                  results.narrative_cache.updated++;
                }
              } else {
                results.narrative_cache.updated++;
                console.log(`[DRY RUN] Would update narrative_cache ${entry.id}`);
              }
            }
          }
        }

        offset += batchSize;
        if (cacheEntries.length < batchSize) {
          hasMore = false;
        }
      }

      console.log(`narrative_cache: scanned=${results.narrative_cache.scanned}, updated=${results.narrative_cache.updated}`);
    }

    // Cleanup lens_summary_cache (text summary field)
    if (tables.includes("lens_summary_cache")) {
      results.lens_summary_cache = { scanned: 0, updated: 0, errors: 0 };

      let offset = 0;
      let hasMore = true;

      while (hasMore) {
        const { data: summaries, error } = await supabase
          .from("lens_summary_cache")
          .select("id, summary")
          .range(offset, offset + batchSize - 1);

        if (error) {
          console.error("Error fetching lens_summary_cache:", error);
          results.lens_summary_cache.errors++;
          break;
        }

        if (!summaries || summaries.length === 0) {
          hasMore = false;
          break;
        }

        results.lens_summary_cache.scanned += summaries.length;

        for (const entry of summaries) {
          if (entry.summary && hasNonAscii(entry.summary)) {
            const sanitized = sanitizeText(entry.summary);

            if (!dryRun) {
              const { error: updateError } = await supabase
                .from("lens_summary_cache")
                .update({ summary: sanitized })
                .eq("id", entry.id);

              if (updateError) {
                console.error(`Error updating lens_summary_cache ${entry.id}:`, updateError);
                results.lens_summary_cache.errors++;
              } else {
                results.lens_summary_cache.updated++;
              }
            } else {
              results.lens_summary_cache.updated++;
              console.log(`[DRY RUN] Would update lens_summary_cache ${entry.id}`);
            }
          }
        }

        offset += batchSize;
        if (summaries.length < batchSize) {
          hasMore = false;
        }
      }

      console.log(`lens_summary_cache: scanned=${results.lens_summary_cache.scanned}, updated=${results.lens_summary_cache.updated}`);
    }

    const response = {
      results,
      dryRun,
      message: dryRun 
        ? "Dry run complete. Set dryRun=false to apply changes."
        : "Cleanup complete. Data has been sanitized.",
    };

    console.log("Cleanup completed:", JSON.stringify(response));

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("cleanup-narrative-data error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
