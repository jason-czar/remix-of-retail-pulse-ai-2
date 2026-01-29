
# Phase 4: Database Optimization & Caching Improvements

A comprehensive set of database and caching enhancements focused on cache consolidation, cleanup automation, TTL alignment, and query optimization to reduce storage overhead, improve cache hit rates, and ensure data freshness consistency across all layers.

---

## Summary

This plan addresses four key areas for database and caching improvements:

1. **Unified Cache Cleanup** - Create a single cleanup function and scheduled job for all cache tables
2. **TTL Alignment** - Synchronize cache TTLs between frontend, edge functions, and database
3. **Partial Indexes** - Add filtered indexes for active/recent data queries
4. **Stale-While-Revalidate Pattern** - Implement background refresh for expired cache entries

Estimated implementation time: 3-4 hours
Risk level: Low (non-breaking improvements to existing infrastructure)

---

## Current State Analysis

### Existing Cache Tables
| Table | Purpose | TTL | Cleanup Mechanism | Status |
|-------|---------|-----|-------------------|--------|
| `emotion_cache` | Emotion analysis | 2 hours | Manual only | Missing scheduled cleanup |
| `narrative_cache` | Narrative analysis | 2 hours | Manual only | Missing scheduled cleanup |
| `sentiment_cache` | Sentiment scores | 2 hours | Via `cleanup_volume_history()` | Included |
| `volume_cache` | Volume data | 2 hours | Via `cleanup_volume_history()` | Included |
| `lens_summary_cache` | AI lens summaries | 30 min | Via `cleanup_lens_cache()` | Missing scheduled job |
| `stocktwits_response_cache` | Raw API responses | 30-120s | Via `cleanup_stocktwits_cache()` | Missing scheduled job |

### Existing Scheduled Jobs
| Job | Schedule | Function |
|-----|----------|----------|
| `cleanup-old-history` | Daily midnight | `cleanup_old_history()` - narrative/emotion history |
| `psychology-snapshot-cleanup` | Daily 3 AM | `cleanup_psychology_snapshots()` |
| No job | - | `cleanup_lens_cache()` - exists but not scheduled |
| No job | - | `cleanup_stocktwits_cache()` - exists but not scheduled |
| No job | - | `emotion_cache` cleanup - function doesn't exist |
| No job | - | `narrative_cache` cleanup - function doesn't exist |

### TTL Inconsistencies
| Layer | emotion_cache | narrative_cache | lens_summary | stocktwits |
|-------|--------------|-----------------|--------------|------------|
| Database | 2 hours | 2 hours | 30 min | 30-120s |
| Edge Function | 2 hours | 2 hours | 30 min | 30-120s |
| Frontend staleTime | 30 min | 30 min | 5 min | 15-30s |

Frontend staleTime is lower than database TTL, causing unnecessary cache misses.

---

## 1. Unified Cache Cleanup System

### Create Consolidated Cleanup Function

Merge all cache cleanup into a single maintainable function:

```sql
CREATE OR REPLACE FUNCTION public.cleanup_all_caches()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  deleted_counts jsonb := '{}'::jsonb;
  count_val integer;
BEGIN
  -- Emotion cache
  DELETE FROM public.emotion_cache WHERE expires_at < now();
  GET DIAGNOSTICS count_val = ROW_COUNT;
  deleted_counts := deleted_counts || jsonb_build_object('emotion_cache', count_val);
  
  -- Narrative cache
  DELETE FROM public.narrative_cache WHERE expires_at < now();
  GET DIAGNOSTICS count_val = ROW_COUNT;
  deleted_counts := deleted_counts || jsonb_build_object('narrative_cache', count_val);
  
  -- Sentiment cache
  DELETE FROM public.sentiment_cache WHERE expires_at < now();
  GET DIAGNOSTICS count_val = ROW_COUNT;
  deleted_counts := deleted_counts || jsonb_build_object('sentiment_cache', count_val);
  
  -- Volume cache
  DELETE FROM public.volume_cache WHERE expires_at < now();
  GET DIAGNOSTICS count_val = ROW_COUNT;
  deleted_counts := deleted_counts || jsonb_build_object('volume_cache', count_val);
  
  -- Lens summary cache
  DELETE FROM public.lens_summary_cache WHERE expires_at < now();
  GET DIAGNOSTICS count_val = ROW_COUNT;
  deleted_counts := deleted_counts || jsonb_build_object('lens_summary_cache', count_val);
  
  -- StockTwits response cache
  DELETE FROM public.stocktwits_response_cache WHERE expires_at < now();
  GET DIAGNOSTICS count_val = ROW_COUNT;
  deleted_counts := deleted_counts || jsonb_build_object('stocktwits_response_cache', count_val);
  
  RETURN deleted_counts;
END;
$$;
```

### Schedule Unified Cleanup Job

```sql
-- Run every 15 minutes to keep cache tables lean
SELECT cron.schedule(
  'cleanup-all-caches',
  '*/15 * * * *',
  $$SELECT public.cleanup_all_caches()$$
);
```

---

## 2. TTL Alignment

### Align Frontend staleTime with Backend TTLs

Update frontend hooks to match backend cache TTLs more closely:

**File: `src/hooks/use-narrative-analysis.ts`**
```typescript
// Before
staleTime: 30 * 60 * 1000, // 30 minutes

// After: Match 2-hour backend TTL (use 90 min for slight buffer)
staleTime: 90 * 60 * 1000, // 90 minutes
gcTime: 2 * 60 * 60 * 1000, // 2 hours
```

**File: `src/hooks/use-emotion-analysis.ts`**
```typescript
// Before  
staleTime: 30 * 60 * 1000, // 30 minutes

// After
staleTime: 90 * 60 * 1000, // 90 minutes
gcTime: 2 * 60 * 60 * 1000, // 2 hours
```

**File: `src/hooks/use-decision-lens-summary.ts`**
```typescript
// Before
staleTime: 5 * 60 * 1000, // 5 minutes

// After: Match 30-min backend TTL (use 25 min for slight buffer)
staleTime: 25 * 60 * 1000, // 25 minutes
gcTime: 45 * 60 * 1000, // 45 minutes
```

### Create TTL Constants File

Centralize TTL configuration for consistency:

**Create: `src/lib/cache-config.ts`**
```typescript
/**
 * Cache TTL configuration aligned between frontend and backend
 * 
 * Frontend staleTime should be slightly less than backend TTL
 * to ensure fresh data is available when cache expires.
 */

export const CACHE_TTL = {
  // AI Analysis caches (2-hour backend TTL)
  EMOTION_ANALYSIS: {
    backend: 2 * 60 * 60 * 1000,    // 2 hours
    staleTime: 90 * 60 * 1000,      // 90 minutes
    gcTime: 2 * 60 * 60 * 1000,     // 2 hours
  },
  NARRATIVE_ANALYSIS: {
    backend: 2 * 60 * 60 * 1000,
    staleTime: 90 * 60 * 1000,
    gcTime: 2 * 60 * 60 * 1000,
  },
  
  // Lens summaries (30-min backend TTL)
  LENS_SUMMARY: {
    backend: 30 * 60 * 1000,        // 30 minutes
    staleTime: 25 * 60 * 1000,      // 25 minutes
    gcTime: 45 * 60 * 1000,         // 45 minutes
  },
  
  // History data (served from database, 5-min staleness acceptable)
  HISTORY: {
    staleTime: 5 * 60 * 1000,       // 5 minutes
    gcTime: 15 * 60 * 1000,         // 15 minutes
  },
  
  // Real-time data (short TTLs)
  SYMBOL_STATS: {
    staleTime: 15 * 1000,           // 15 seconds
    refetchInterval: 30 * 1000,     // 30 seconds
  },
  MESSAGES: {
    staleTime: 15 * 1000,
    refetchInterval: 30 * 1000,
  },
  TRENDING: {
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  },
} as const;
```

---

## 3. Partial Indexes for Active Data

### Add Filtered Index for Non-Expired Cache

Cache lookups always filter by `expires_at > now()`. A partial index speeds this up:

```sql
-- Emotion cache: only index non-expired entries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_emotion_cache_active
ON public.emotion_cache(symbol, time_range)
WHERE expires_at > now();

-- Narrative cache
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_narrative_cache_active
ON public.narrative_cache(symbol, time_range)
WHERE expires_at > now();

-- Lens summary cache
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_lens_summary_cache_active
ON public.lens_summary_cache(symbol, lens)
WHERE expires_at > now();

-- StockTwits response cache
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_stocktwits_cache_active
ON public.stocktwits_response_cache(cache_key)
WHERE expires_at > now();
```

**Why**: Partial indexes are smaller and faster because they only include rows matching the predicate. Since we never query expired entries, this is ideal.

### Add Index for Recent Psychology Snapshots

Most queries want the latest snapshot per symbol:

```sql
-- Fast lookup for "latest snapshot by symbol and period"
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_psychology_snapshots_latest
ON public.psychology_snapshots(symbol, period_type, snapshot_start DESC)
INCLUDE (id);
```

---

## 4. Stale-While-Revalidate Cache Pattern

### Implement Background Refresh in Edge Functions

Update `generate-lens-summary` to return stale data immediately while refreshing in background:

**Update: `supabase/functions/generate-lens-summary/index.ts`**

```typescript
// Near the cache check logic, add stale-while-revalidate:

async function getCacheWithSWR(
  supabase: SupabaseClient,
  symbol: string,
  lens: string
): Promise<{ data: CacheEntry | null; isStale: boolean }> {
  const { data, error } = await supabase
    .from('lens_summary_cache')
    .select('*')
    .eq('symbol', symbol)
    .eq('lens', lens)
    .maybeSingle();
  
  if (error || !data) return { data: null, isStale: false };
  
  const now = new Date();
  const expiresAt = new Date(data.expires_at);
  
  // Fresh cache
  if (expiresAt > now) {
    return { data, isStale: false };
  }
  
  // Stale but within grace period (5 min after expiry)
  const graceWindow = 5 * 60 * 1000; // 5 minutes
  if (expiresAt.getTime() + graceWindow > now.getTime()) {
    return { data, isStale: true };
  }
  
  // Too stale, don't use
  return { data: null, isStale: false };
}

// In main handler:
const cache = await getCacheWithSWR(supabase, symbol, lens);

if (cache.data) {
  const response = {
    summary: cache.data.summary,
    cached: true,
    messageCount: cache.data.message_count,
    _stale: cache.isStale,
  };
  
  // If stale, trigger background refresh (don't await)
  if (cache.isStale) {
    EdgeRuntime.waitUntil(refreshCacheInBackground(supabase, symbol, lens));
  }
  
  return new Response(JSON.stringify(response), {
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
      'X-Cache': cache.isStale ? 'STALE' : 'HIT',
    },
  });
}
```

### Add Frontend Stale Indicator

**Create: `src/components/ui/StaleDataIndicator.tsx`**

```typescript
import { Clock } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from './tooltip';

interface StaleDataIndicatorProps {
  isStale?: boolean;
  className?: string;
}

export function StaleDataIndicator({ isStale, className }: StaleDataIndicatorProps) {
  if (!isStale) return null;
  
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={cn("inline-flex items-center text-xs text-muted-foreground", className)}>
          <Clock className="h-3 w-3 mr-1" />
          Updating...
        </span>
      </TooltipTrigger>
      <TooltipContent>
        <p>Data is being refreshed in the background</p>
      </TooltipContent>
    </Tooltip>
  );
}
```

---

## 5. Cache Hit Rate Monitoring

### Add Cache Statistics Table

Track cache performance for optimization insights:

```sql
CREATE TABLE IF NOT EXISTS public.cache_statistics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_name text NOT NULL,
  hits bigint DEFAULT 0,
  misses bigint DEFAULT 0,
  stale_hits bigint DEFAULT 0,
  recorded_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(cache_name, recorded_date)
);

-- Allow service role to update
ALTER TABLE public.cache_statistics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow service role" ON public.cache_statistics
FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Allow public read" ON public.cache_statistics
FOR SELECT USING (true);
```

### Update Edge Functions to Record Statistics

```typescript
// Utility function for cache statistics
async function recordCacheHit(
  supabase: SupabaseClient,
  cacheName: string,
  hitType: 'hit' | 'miss' | 'stale'
) {
  const column = hitType === 'hit' ? 'hits' 
    : hitType === 'stale' ? 'stale_hits' 
    : 'misses';
  
  await supabase.rpc('increment_cache_stat', {
    p_cache_name: cacheName,
    p_column: column,
  });
}

// RPC function for atomic increment
CREATE OR REPLACE FUNCTION public.increment_cache_stat(
  p_cache_name text,
  p_column text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO cache_statistics (cache_name, recorded_date, hits, misses, stale_hits)
  VALUES (p_cache_name, CURRENT_DATE, 
    CASE WHEN p_column = 'hits' THEN 1 ELSE 0 END,
    CASE WHEN p_column = 'misses' THEN 1 ELSE 0 END,
    CASE WHEN p_column = 'stale_hits' THEN 1 ELSE 0 END
  )
  ON CONFLICT (cache_name, recorded_date)
  DO UPDATE SET
    hits = cache_statistics.hits + CASE WHEN p_column = 'hits' THEN 1 ELSE 0 END,
    misses = cache_statistics.misses + CASE WHEN p_column = 'misses' THEN 1 ELSE 0 END,
    stale_hits = cache_statistics.stale_hits + CASE WHEN p_column = 'stale_hits' THEN 1 ELSE 0 END;
END;
$$;
```

---

## 6. Implementation Sequence

### Step 1: Database Migration (15 min)
1. Create `cleanup_all_caches()` function
2. Schedule unified cleanup job (every 15 minutes)
3. Create partial indexes for cache tables
4. Create `cache_statistics` table and RPC function

### Step 2: TTL Configuration (20 min)
1. Create `src/lib/cache-config.ts` with centralized TTLs
2. Update `use-narrative-analysis.ts` staleTime/gcTime
3. Update `use-emotion-analysis.ts` staleTime/gcTime
4. Update `use-decision-lens-summary.ts` staleTime/gcTime

### Step 3: Stale-While-Revalidate (30 min)
1. Update `generate-lens-summary` with SWR pattern
2. Update `stocktwits-proxy` with SWR pattern
3. Create `StaleDataIndicator` component
4. Add stale indicator to relevant UI components

### Step 4: Cache Monitoring (15 min)
1. Add cache statistics recording to edge functions
2. Verify statistics accumulation
3. Query initial hit/miss rates

---

## 7. Files to Create/Modify

### New Files
- `src/lib/cache-config.ts` - Centralized TTL configuration
- `src/components/ui/StaleDataIndicator.tsx` - Stale data UI indicator

### Modified Files
- `supabase/functions/generate-lens-summary/index.ts` - Add SWR pattern
- `supabase/functions/stocktwits-proxy/index.ts` - Add SWR pattern
- `src/hooks/use-narrative-analysis.ts` - Update TTLs
- `src/hooks/use-emotion-analysis.ts` - Update TTLs
- `src/hooks/use-decision-lens-summary.ts` - Update TTLs

### New Database Objects
- Function: `cleanup_all_caches()`
- Function: `increment_cache_stat()`
- Table: `cache_statistics`
- Cron job: `cleanup-all-caches`
- Indexes: 4 partial indexes on cache tables

---

## 8. Expected Outcomes

| Metric | Before | After |
|--------|--------|-------|
| Cache cleanup coverage | 3/6 tables | 6/6 tables |
| Frontend/Backend TTL alignment | Mismatched | Aligned |
| Cache lookup speed | Full table scan | Partial index scan |
| Stale data handling | Hard miss | Serve stale + background refresh |
| Cache performance visibility | None | Daily hit/miss statistics |

---

## 9. Verification Steps

### Verify Unified Cleanup
```sql
-- Check job is scheduled
SELECT jobname, schedule FROM cron.job WHERE jobname = 'cleanup-all-caches';

-- Run manually and check counts
SELECT public.cleanup_all_caches();
```

### Verify TTL Alignment
1. Check frontend staleTime values in React Query DevTools
2. Compare with backend TTL in edge function responses
3. Verify no unnecessary refetches

### Verify Cache Statistics
```sql
SELECT * FROM cache_statistics 
ORDER BY recorded_date DESC, cache_name;
```

### Verify Partial Indexes
```sql
SELECT indexname, indexdef FROM pg_indexes 
WHERE indexname LIKE '%_active%';
```

---

## Technical Notes

- Partial indexes need periodic REINDEX as data ages (handled by autovacuum)
- Stale-while-revalidate uses Deno's `EdgeRuntime.waitUntil()` for background tasks
- Cache statistics use upsert with atomic increment to avoid race conditions
- Frontend gcTime should be >= staleTime to prevent premature garbage collection
- Unified cleanup job runs every 15 minutes to balance freshness vs. overhead
