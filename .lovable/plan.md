
# Phase 1: Database Performance & Security Quick Wins

A targeted set of database optimizations focused on indexes, statistics, and RLS policy hardening that can be implemented in a single migration with immediate benefits.

---

## Summary

This plan addresses three categories of quick wins identified in the architecture review:
1. **Missing Composite Indexes** — Add optimized indexes for common query patterns
2. **Table Statistics Refresh** — Run ANALYZE to ensure query planner has current data
3. **RLS Policy Hardening** — Fix the cache poisoning vulnerability in `stocktwits_response_cache`

Estimated implementation time: ~30 minutes
Risk level: Low (all changes are additive or security-improving)

---

## 1. Database Indexes

### Current State
The query analysis revealed these access patterns:

| Table | Common Filter Pattern | Existing Index |
|-------|----------------------|----------------|
| `psychology_snapshots` | `symbol + period_type + snapshot_start DESC` | Has it |
| `emotion_history` | `symbol + period_type + recorded_at DESC` | Missing composite |
| `narrative_history` | `symbol + period_type + recorded_at DESC` | Missing composite |
| `sentiment_history` | `symbol + recorded_at DESC` | Has it |
| `volume_history` | `symbol + period_type + recorded_at DESC` | Has it |

### Action: Add Composite Indexes

Create composite indexes for `emotion_history` and `narrative_history` to support the common three-column filter pattern used by chart components:

```sql
-- Emotion history: supports use-emotion-history.ts queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_emotion_history_symbol_period_recorded 
ON public.emotion_history(symbol, period_type, recorded_at DESC);

-- Narrative history: supports use-narrative-history.ts and FillTodayGapsButton.tsx
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_narrative_history_symbol_period_recorded 
ON public.narrative_history(symbol, period_type, recorded_at DESC);
```

**Why**: Queries that filter by `symbol`, then `period_type`, then sort by `recorded_at` currently require index intersection or sequential scans. A covering composite index allows single-index lookups.

---

## 2. Table Statistics

### Current State
Auto-analyze is running (last auto-analyze on key tables: 1-2 days ago), but explicit ANALYZE ensures the query planner has the freshest cardinality estimates after index changes.

### Action: Run ANALYZE

```sql
-- Refresh statistics on high-traffic tables
ANALYZE public.psychology_snapshots;
ANALYZE public.emotion_history;
ANALYZE public.narrative_history;
ANALYZE public.sentiment_history;
ANALYZE public.volume_history;
ANALYZE public.price_history;
ANALYZE public.stocktwits_response_cache;
```

**Why**: Index changes invalidate some planner statistics. Running ANALYZE immediately after index creation ensures optimal query plans.

---

## 3. RLS Policy Hardening

### Critical Vulnerability Found

The `stocktwits_response_cache` table has an overly permissive RLS policy:

```sql
-- CURRENT (DANGEROUS)
CREATE POLICY "Allow public cache access" 
ON public.stocktwits_response_cache 
FOR ALL 
USING (true) 
WITH CHECK (true);
```

**Risk**: Any anonymous user can INSERT, UPDATE, or DELETE cache entries via the Supabase client. An attacker could:
- Poison the cache with malicious/misleading data
- Delete cache entries causing unnecessary API calls
- Insert fake trending symbols or manipulated stats

### Action: Restrict to Service Role

```sql
-- Drop the dangerous policy
DROP POLICY IF EXISTS "Allow public cache access" ON public.stocktwits_response_cache;

-- Create read-only public access
CREATE POLICY "Allow public read cache" 
ON public.stocktwits_response_cache 
FOR SELECT 
USING (true);

-- Create service-role-only write access  
CREATE POLICY "Allow service role write cache" 
ON public.stocktwits_response_cache 
FOR ALL 
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');
```

**Why**: The edge function uses the service role key and will continue to work. Client-side reads remain possible. Only writes are restricted.

---

## 4. Implementation Details

### Single Migration File

All changes will be combined into one migration:

```sql
-- Phase 1: Performance & Security Quick Wins

-- ============================================
-- SECTION 1: Composite Indexes
-- ============================================

-- Emotion history: optimize (symbol, period_type, recorded_at) lookups
CREATE INDEX IF NOT EXISTS idx_emotion_history_symbol_period_recorded 
ON public.emotion_history(symbol, period_type, recorded_at DESC);

-- Narrative history: optimize (symbol, period_type, recorded_at) lookups
CREATE INDEX IF NOT EXISTS idx_narrative_history_symbol_period_recorded 
ON public.narrative_history(symbol, period_type, recorded_at DESC);

-- ============================================
-- SECTION 2: RLS Policy Hardening
-- ============================================

-- Fix stocktwits_response_cache: remove public write access
DROP POLICY IF EXISTS "Allow public cache access" ON public.stocktwits_response_cache;

-- Allow public reads (cache hits)
CREATE POLICY "Allow public read cache" 
ON public.stocktwits_response_cache 
FOR SELECT 
USING (true);

-- Restrict writes to service role (edge functions only)
CREATE POLICY "Allow service role write cache" 
ON public.stocktwits_response_cache 
FOR ALL 
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- ============================================
-- SECTION 3: Refresh Statistics
-- ============================================

ANALYZE public.psychology_snapshots;
ANALYZE public.emotion_history;
ANALYZE public.narrative_history;
ANALYZE public.sentiment_history;
ANALYZE public.volume_history;
ANALYZE public.price_history;
ANALYZE public.stocktwits_response_cache;
```

---

## 5. Verification Steps

After deployment, verify the changes:

### Verify Indexes
```sql
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename IN ('emotion_history', 'narrative_history')
  AND indexname LIKE '%period_recorded%';
```

### Verify RLS Policies
```sql
SELECT policyname, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'stocktwits_response_cache';
```

### Test Cache Still Works
Navigate to any symbol page and check:
- Network tab shows `X-Cache: MISS` on first load
- Refresh shows `X-Cache: HIT`
- No RLS errors in console

---

## 6. Expected Outcomes

| Metric | Before | After |
|--------|--------|-------|
| Emotion/Narrative chart queries | Potential index intersection | Single index scan |
| `stocktwits_response_cache` write access | Public (vulnerable) | Service role only |
| Query planner statistics | Auto-updated | Freshly analyzed |

---

## Technical Notes

- `CREATE INDEX IF NOT EXISTS` is used to make the migration idempotent
- The existing 2-column indexes (`idx_emotion_history_symbol_recorded`) are not dropped as they may still be useful for queries that don't filter by `period_type`
- The `ANALYZE` commands have minimal overhead on tables under 10,000 rows
- No application code changes required — all improvements are at the database layer
