-- Create table for historical sentiment data
CREATE TABLE public.sentiment_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  symbol TEXT NOT NULL,
  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  sentiment_score NUMERIC NOT NULL,
  bullish_count INTEGER NOT NULL DEFAULT 0,
  bearish_count INTEGER NOT NULL DEFAULT 0,
  neutral_count INTEGER NOT NULL DEFAULT 0,
  message_volume INTEGER NOT NULL DEFAULT 0,
  dominant_emotion TEXT,
  dominant_narrative TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for fast lookups by symbol and date
CREATE INDEX idx_sentiment_history_symbol_date ON public.sentiment_history (symbol, recorded_at DESC);

-- Enable Row Level Security
ALTER TABLE public.sentiment_history ENABLE ROW LEVEL SECURITY;

-- Allow public read access (sentiment data is not user-specific)
CREATE POLICY "Allow public read access"
ON public.sentiment_history
FOR SELECT
USING (true);

-- Allow service role to insert/update/delete
CREATE POLICY "Allow service role write"
ON public.sentiment_history
FOR ALL
USING (auth.role() = 'service_role');