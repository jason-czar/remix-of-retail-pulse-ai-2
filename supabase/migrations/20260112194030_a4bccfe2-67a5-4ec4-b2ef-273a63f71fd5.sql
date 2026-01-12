-- Create cache table for AI-analyzed narratives
CREATE TABLE public.narrative_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol TEXT NOT NULL,
  time_range TEXT NOT NULL,
  narratives JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  UNIQUE(symbol, time_range)
);

-- Enable RLS
ALTER TABLE public.narrative_cache ENABLE ROW LEVEL SECURITY;

-- Allow public read access (non-sensitive cached data)
CREATE POLICY "Allow public read" ON public.narrative_cache
FOR SELECT USING (true);

-- Allow service role to insert/update/delete
CREATE POLICY "Allow service role write" ON public.narrative_cache
FOR ALL USING (auth.role() = 'service_role');

-- Create index for faster lookups
CREATE INDEX idx_narrative_cache_symbol_range ON public.narrative_cache(symbol, time_range);
CREATE INDEX idx_narrative_cache_expires ON public.narrative_cache(expires_at);