-- Create narrative_history table for hourly/daily tracking
CREATE TABLE public.narrative_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  symbol TEXT NOT NULL,
  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  period_type TEXT NOT NULL CHECK (period_type IN ('hourly', 'daily')),
  narratives JSONB NOT NULL DEFAULT '[]'::jsonb,
  dominant_narrative TEXT,
  message_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create emotion_history table for hourly/daily tracking
CREATE TABLE public.emotion_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  symbol TEXT NOT NULL,
  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  period_type TEXT NOT NULL CHECK (period_type IN ('hourly', 'daily')),
  emotions JSONB NOT NULL DEFAULT '{}'::jsonb,
  dominant_emotion TEXT,
  message_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for efficient querying
CREATE INDEX idx_narrative_history_symbol_recorded ON public.narrative_history(symbol, recorded_at DESC);
CREATE INDEX idx_narrative_history_period_type ON public.narrative_history(period_type, recorded_at DESC);
CREATE INDEX idx_emotion_history_symbol_recorded ON public.emotion_history(symbol, recorded_at DESC);
CREATE INDEX idx_emotion_history_period_type ON public.emotion_history(period_type, recorded_at DESC);

-- Enable RLS
ALTER TABLE public.narrative_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emotion_history ENABLE ROW LEVEL SECURITY;

-- Public read access (like sentiment_history)
CREATE POLICY "Allow public read access" ON public.narrative_history FOR SELECT USING (true);
CREATE POLICY "Allow service role write" ON public.narrative_history FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Allow public read access" ON public.emotion_history FOR SELECT USING (true);
CREATE POLICY "Allow service role write" ON public.emotion_history FOR ALL USING (auth.role() = 'service_role');

-- Create function to clean up old records (90 day retention)
CREATE OR REPLACE FUNCTION public.cleanup_old_history()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  DELETE FROM public.narrative_history WHERE recorded_at < now() - INTERVAL '90 days';
  DELETE FROM public.emotion_history WHERE recorded_at < now() - INTERVAL '90 days';
END;
$$;