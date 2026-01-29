-- Phase 4: Database Optimization & Caching Improvements

-- 1. Create unified cache cleanup function
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

-- 2. Create cache statistics table
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

-- Enable RLS
ALTER TABLE public.cache_statistics ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
CREATE POLICY "Service role full access" ON public.cache_statistics
FOR ALL USING (auth.role() = 'service_role');

-- Allow public read access for monitoring
CREATE POLICY "Public read access" ON public.cache_statistics
FOR SELECT USING (true);

-- 3. Create atomic increment function for cache statistics
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

-- 4. Create composite indexes for cache lookups (includes expires_at for filtering)
CREATE INDEX IF NOT EXISTS idx_emotion_cache_lookup
ON public.emotion_cache(symbol, time_range, expires_at);

CREATE INDEX IF NOT EXISTS idx_narrative_cache_lookup
ON public.narrative_cache(symbol, time_range, expires_at);

CREATE INDEX IF NOT EXISTS idx_lens_summary_cache_lookup
ON public.lens_summary_cache(symbol, lens, expires_at);

CREATE INDEX IF NOT EXISTS idx_stocktwits_cache_lookup
ON public.stocktwits_response_cache(cache_key, expires_at);

-- 5. Add index for psychology snapshots latest lookup
CREATE INDEX IF NOT EXISTS idx_psychology_snapshots_latest_lookup
ON public.psychology_snapshots(symbol, period_type, snapshot_start DESC)
INCLUDE (id);