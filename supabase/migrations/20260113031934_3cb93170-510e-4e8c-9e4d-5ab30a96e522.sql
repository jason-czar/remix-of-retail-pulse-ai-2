-- Volume history table for storing hourly/daily snapshots
CREATE TABLE public.volume_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  symbol TEXT NOT NULL,
  period_type TEXT NOT NULL DEFAULT 'hourly',
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  message_count INTEGER NOT NULL DEFAULT 0,
  hourly_distribution JSONB DEFAULT '[]'::jsonb,
  daily_volume INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for efficient querying
CREATE INDEX idx_volume_history_symbol_recorded 
  ON public.volume_history(symbol, recorded_at DESC);
CREATE INDEX idx_volume_history_period 
  ON public.volume_history(symbol, period_type, recorded_at DESC);

-- Volume cache table for instant access
CREATE TABLE public.volume_cache (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  symbol TEXT NOT NULL,
  time_range TEXT NOT NULL,
  hourly_data JSONB DEFAULT '[]'::jsonb,
  daily_data JSONB DEFAULT '[]'::jsonb,
  message_count INTEGER DEFAULT 0,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(symbol, time_range)
);

-- Sentiment cache for consistency
CREATE TABLE public.sentiment_cache (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  symbol TEXT NOT NULL,
  time_range TEXT NOT NULL,
  hourly_data JSONB DEFAULT '[]'::jsonb,
  daily_data JSONB DEFAULT '[]'::jsonb,
  current_score NUMERIC DEFAULT 50,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(symbol, time_range)
);

-- RLS policies
ALTER TABLE public.volume_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.volume_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sentiment_cache ENABLE ROW LEVEL SECURITY;

-- Read policies
CREATE POLICY "Allow public read" ON public.volume_history 
  FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON public.volume_cache 
  FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON public.sentiment_cache 
  FOR SELECT USING (true);

-- Write policies (service role only)
CREATE POLICY "Allow service role write" ON public.volume_history 
  FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Allow service role write" ON public.volume_cache 
  FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Allow service role write" ON public.sentiment_cache 
  FOR ALL USING (auth.role() = 'service_role');

-- Add cleanup function for volume history
CREATE OR REPLACE FUNCTION public.cleanup_volume_history()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  DELETE FROM public.volume_history WHERE recorded_at < now() - INTERVAL '90 days';
  DELETE FROM public.volume_cache WHERE expires_at < now();
  DELETE FROM public.sentiment_cache WHERE expires_at < now();
END;
$function$;