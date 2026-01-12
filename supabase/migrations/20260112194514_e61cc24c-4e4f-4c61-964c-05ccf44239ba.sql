-- Create cache table for AI-analyzed emotions
CREATE TABLE public.emotion_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol TEXT NOT NULL,
  time_range TEXT NOT NULL,
  emotions JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  UNIQUE(symbol, time_range)
);

-- Enable RLS
ALTER TABLE public.emotion_cache ENABLE ROW LEVEL SECURITY;

-- Allow public read access (non-sensitive cached data)
CREATE POLICY "Allow public read" ON public.emotion_cache
FOR SELECT USING (true);

-- Allow service role to insert/update/delete
CREATE POLICY "Allow service role write" ON public.emotion_cache
FOR ALL USING (auth.role() = 'service_role');

-- Create indexes for faster lookups
CREATE INDEX idx_emotion_cache_symbol_range ON public.emotion_cache(symbol, time_range);
CREATE INDEX idx_emotion_cache_expires ON public.emotion_cache(expires_at);