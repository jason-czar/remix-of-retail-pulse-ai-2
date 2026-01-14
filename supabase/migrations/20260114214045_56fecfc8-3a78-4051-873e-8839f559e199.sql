-- Create price_history table for storing daily stock prices
CREATE TABLE public.price_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol TEXT NOT NULL,
  date DATE NOT NULL,
  close NUMERIC NOT NULL,
  open NUMERIC,
  high NUMERIC,
  low NUMERIC,
  volume BIGINT,
  source TEXT DEFAULT 'yahoo',
  created_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(symbol, date)
);

-- Enable RLS
ALTER TABLE public.price_history ENABLE ROW LEVEL SECURITY;

-- Public read access for price data
CREATE POLICY "Allow public read access to price_history" 
ON public.price_history 
FOR SELECT 
USING (true);

-- Index for fast trading-day lookups
CREATE INDEX idx_price_history_symbol_date ON public.price_history(symbol, date DESC);

-- Add narrative_outcomes column to psychology_snapshots
ALTER TABLE public.psychology_snapshots 
ADD COLUMN IF NOT EXISTS narrative_outcomes JSONB DEFAULT '[]'::jsonb;