-- Add unique constraint on sentiment_history to enable UPSERT
ALTER TABLE public.sentiment_history 
ADD CONSTRAINT sentiment_history_symbol_recorded_unique 
UNIQUE (symbol, recorded_at);