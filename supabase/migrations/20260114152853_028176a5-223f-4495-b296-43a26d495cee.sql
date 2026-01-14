-- Create the psychology_snapshots table for consulting-grade market intelligence
CREATE TABLE public.psychology_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identity
  symbol TEXT NOT NULL,
  period_type TEXT NOT NULL CHECK (
    period_type IN ('hourly', 'daily', 'weekly', 'monthly')
  ),
  snapshot_start TIMESTAMPTZ NOT NULL,
  snapshot_end TIMESTAMPTZ NOT NULL,

  -- Raw scope metadata (objective facts)
  message_count INTEGER NOT NULL DEFAULT 0,
  unique_authors INTEGER NOT NULL DEFAULT 0,

  -- COMPUTED confidence (NOT purely AI)
  -- Structure: { score: number, drivers: { volume_percentile, author_breadth, narrative_coherence, temporal_stability } }
  data_confidence JSONB NOT NULL DEFAULT '{"score": 0, "drivers": {}}',

  -- IMMUTABLE OBSERVED STATE (facts only)
  -- Structure: { narratives: [], emotions: [], signals: {}, concentration: {}, momentum: {} }
  observed_state JSONB NOT NULL DEFAULT '{}',

  -- INTERPRETATION LAYER (can be regenerated with new AI/logic)
  -- Structure: { decision_overlays: {}, decision_readiness: {}, snapshot_summary: {} }
  interpretation JSONB NOT NULL DEFAULT '{}',

  -- Historical anchoring (weekly/monthly only)
  -- Structure: { similar_periods: [], historical_bias: string }
  historical_context JSONB,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  interpretation_version INTEGER NOT NULL DEFAULT 1,

  -- Composite unique constraint
  UNIQUE(symbol, period_type, snapshot_start)
);

-- Indexes for efficient queries
CREATE INDEX idx_ps_symbol_period_time ON public.psychology_snapshots(symbol, period_type, snapshot_start DESC);
CREATE INDEX idx_ps_symbol ON public.psychology_snapshots(symbol);
CREATE INDEX idx_ps_period ON public.psychology_snapshots(period_type);
CREATE INDEX idx_ps_created ON public.psychology_snapshots(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.psychology_snapshots ENABLE ROW LEVEL SECURITY;

-- RLS policies: public read, service role write
CREATE POLICY "Allow public read access" ON public.psychology_snapshots
  FOR SELECT USING (true);

CREATE POLICY "Allow service role write" ON public.psychology_snapshots
  FOR ALL USING (auth.role() = 'service_role');

-- Cleanup function for data retention
CREATE OR REPLACE FUNCTION public.cleanup_psychology_snapshots()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Hourly: 30 days retention
  DELETE FROM public.psychology_snapshots 
  WHERE period_type = 'hourly' AND snapshot_start < now() - INTERVAL '30 days';
  
  -- Daily: 90 days retention
  DELETE FROM public.psychology_snapshots 
  WHERE period_type = 'daily' AND snapshot_start < now() - INTERVAL '90 days';
  
  -- Weekly: 1 year retention
  DELETE FROM public.psychology_snapshots 
  WHERE period_type = 'weekly' AND snapshot_start < now() - INTERVAL '1 year';
  
  -- Monthly: 3 years retention
  DELETE FROM public.psychology_snapshots 
  WHERE period_type = 'monthly' AND snapshot_start < now() - INTERVAL '3 years';
END;
$$;