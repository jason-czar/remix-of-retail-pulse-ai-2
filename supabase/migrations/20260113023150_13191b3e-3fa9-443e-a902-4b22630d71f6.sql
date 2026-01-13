-- Create table for market psychology history
CREATE TABLE public.market_psychology_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  fear_greed_index INTEGER NOT NULL,
  fear_greed_label TEXT NOT NULL,
  dominant_signal TEXT,
  signal_strength TEXT,
  symbols TEXT[] NOT NULL DEFAULT '{}',
  symbol_count INTEGER NOT NULL DEFAULT 0,
  emotion_breakdown JSONB NOT NULL DEFAULT '{}',
  signals JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for efficient querying by user and date
CREATE INDEX idx_market_psychology_user_date ON public.market_psychology_history(user_id, recorded_at DESC);

-- Enable RLS
ALTER TABLE public.market_psychology_history ENABLE ROW LEVEL SECURITY;

-- Users can view their own history
CREATE POLICY "Users can view their own psychology history"
ON public.market_psychology_history
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own snapshots
CREATE POLICY "Users can insert their own psychology snapshots"
ON public.market_psychology_history
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can delete their own history
CREATE POLICY "Users can delete their own psychology history"
ON public.market_psychology_history
FOR DELETE
USING (auth.uid() = user_id);

-- Add cleanup function for old psychology history (90 days retention)
CREATE OR REPLACE FUNCTION public.cleanup_psychology_history()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  DELETE FROM public.market_psychology_history WHERE recorded_at < now() - INTERVAL '90 days';
END;
$$;