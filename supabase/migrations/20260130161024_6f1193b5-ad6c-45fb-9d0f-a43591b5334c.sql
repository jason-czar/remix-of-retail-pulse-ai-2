-- Add coverage columns for psychology snapshots and price history
ALTER TABLE public.symbol_daily_coverage 
ADD COLUMN IF NOT EXISTS has_psychology boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS has_price boolean NOT NULL DEFAULT false;