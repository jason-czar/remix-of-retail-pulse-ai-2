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