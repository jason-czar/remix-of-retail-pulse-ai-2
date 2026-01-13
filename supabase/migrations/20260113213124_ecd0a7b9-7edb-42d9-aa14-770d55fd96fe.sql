-- Create lens summary cache table
CREATE TABLE public.lens_summary_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  symbol TEXT NOT NULL,
  lens TEXT NOT NULL,
  summary TEXT NOT NULL,
  message_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  UNIQUE(symbol, lens)
);

-- Create index for fast lookups
CREATE INDEX idx_lens_summary_cache_lookup ON public.lens_summary_cache (symbol, lens, expires_at);

-- Enable RLS (public read for caching, service role for writes)
ALTER TABLE public.lens_summary_cache ENABLE ROW LEVEL SECURITY;

-- Allow public read access for cached summaries
CREATE POLICY "Anyone can read lens summary cache"
  ON public.lens_summary_cache
  FOR SELECT
  USING (true);

-- Add cleanup to existing function
CREATE OR REPLACE FUNCTION public.cleanup_lens_cache()
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
BEGIN
  DELETE FROM public.lens_summary_cache WHERE expires_at < now();
END;
$$;