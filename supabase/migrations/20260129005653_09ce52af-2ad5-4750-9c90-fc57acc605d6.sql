-- Create a server-side cache for StockTwits API responses
CREATE TABLE public.stocktwits_response_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cache_key TEXT NOT NULL UNIQUE,
  action TEXT NOT NULL,
  symbol TEXT,
  response_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Index for fast lookups by cache key
CREATE INDEX idx_stocktwits_cache_key ON public.stocktwits_response_cache(cache_key);

-- Index for cleanup of expired entries
CREATE INDEX idx_stocktwits_cache_expires ON public.stocktwits_response_cache(expires_at);

-- Enable RLS (but allow public read/write for edge function access)
ALTER TABLE public.stocktwits_response_cache ENABLE ROW LEVEL SECURITY;

-- Policy to allow edge functions to read/write cache (service role or public access for caching)
CREATE POLICY "Allow public cache access" 
ON public.stocktwits_response_cache 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Create cleanup function for expired cache entries
CREATE OR REPLACE FUNCTION public.cleanup_stocktwits_cache()
RETURNS void AS $$
BEGIN
  DELETE FROM public.stocktwits_response_cache 
  WHERE expires_at < now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Add comment for documentation
COMMENT ON TABLE public.stocktwits_response_cache IS 'Server-side cache for StockTwits API responses to reduce redundant API calls across users';