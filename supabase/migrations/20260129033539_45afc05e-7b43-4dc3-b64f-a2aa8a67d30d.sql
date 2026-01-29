-- Phase 5: Monitoring and Observability Tables

-- 1. Error Logs Table - Persistent error tracking
CREATE TABLE IF NOT EXISTS public.error_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  
  -- Error identification
  error_type text NOT NULL, -- 'edge_function', 'frontend', 'database'
  error_code text,          -- HTTP status or custom error code
  error_message text NOT NULL,
  stack_trace text,
  
  -- Context
  function_name text,       -- Which Edge Function or component
  request_id text,          -- Correlation ID
  symbol text,              -- If related to a specific symbol
  user_id uuid,             -- If authenticated
  
  -- Request details
  request_path text,
  request_method text,
  request_params jsonb,
  
  -- Metadata
  environment text DEFAULT 'production',
  severity text DEFAULT 'error', -- 'warning', 'error', 'critical'
  resolved boolean DEFAULT false,
  resolved_at timestamptz,
  
  -- Validation
  CONSTRAINT valid_severity CHECK (severity IN ('warning', 'error', 'critical'))
);

-- Enable RLS
ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;

-- Service role can insert/update all
CREATE POLICY "Service role full access" ON public.error_logs
FOR ALL USING (auth.role() = 'service_role');

-- Public read for monitoring dashboard
CREATE POLICY "Public read for monitoring" ON public.error_logs
FOR SELECT USING (true);

-- Indexes for common queries
CREATE INDEX idx_error_logs_created ON public.error_logs(created_at DESC);
CREATE INDEX idx_error_logs_function ON public.error_logs(function_name, created_at DESC);
CREATE INDEX idx_error_logs_severity ON public.error_logs(severity, resolved, created_at DESC);

-- 2. Performance Metrics Table - API latency and throughput tracking
CREATE TABLE IF NOT EXISTS public.performance_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recorded_at timestamptz DEFAULT now(),
  
  -- Metric identification
  metric_type text NOT NULL, -- 'api_latency', 'cache_operation', 'ai_call', 'upstream_call'
  function_name text NOT NULL,
  endpoint text,             -- Specific action or route
  
  -- Timing
  duration_ms integer NOT NULL,
  
  -- Context
  symbol text,
  cache_status text,         -- 'hit', 'miss', 'stale'
  circuit_state text,        -- 'closed', 'open', 'half-open'
  status_code integer
);

-- Enable RLS
ALTER TABLE public.performance_metrics ENABLE ROW LEVEL SECURITY;

-- Service role can insert
CREATE POLICY "Service role insert" ON public.performance_metrics
FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- Public read for monitoring dashboard
CREATE POLICY "Public read perf metrics" ON public.performance_metrics
FOR SELECT USING (true);

-- Optimized indexes for aggregation queries
CREATE INDEX idx_perf_metrics_recorded ON public.performance_metrics(recorded_at DESC);
CREATE INDEX idx_perf_metrics_function ON public.performance_metrics(function_name, recorded_at DESC);

-- 3. Cleanup function for performance metrics (30-day retention)
CREATE OR REPLACE FUNCTION public.cleanup_performance_metrics()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  DELETE FROM public.performance_metrics 
  WHERE recorded_at < now() - INTERVAL '30 days';
END;
$$;

-- 4. Cleanup function for error logs (90-day retention)
CREATE OR REPLACE FUNCTION public.cleanup_error_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  DELETE FROM public.error_logs 
  WHERE created_at < now() - INTERVAL '90 days';
END;
$$;