
# Phase 5: Monitoring and Observability Improvements

A comprehensive observability enhancement plan focused on structured logging, error tracking, performance metrics, and a centralized monitoring dashboard to provide visibility into system health, API performance, and user experience.

---

## Summary

This plan addresses four key areas for monitoring and observability:

1. **Structured Logging System** - Implement consistent, machine-readable logging across all Edge Functions
2. **Error Tracking Infrastructure** - Create centralized error logging with context and stack traces
3. **Performance Metrics Collection** - Track response times, throughput, and API latency distributions
4. **Monitoring Dashboard** - Build an admin-only analytics dashboard to visualize system health

Estimated implementation time: 4-5 hours
Risk level: Low (additive observability layer, no changes to core business logic)

---

## Current State Analysis

### What Exists Today

| Component | Implementation | Gaps |
|-----------|---------------|------|
| Circuit Breaker Logging | `console.log/warn` for state transitions | No persistence, lost on cold start |
| Cache Statistics | `cache_statistics` table with hit/miss/stale counts | Only cache metrics, no API/error tracking |
| Edge Function Logs | Available via Supabase analytics API | Ephemeral, no structured metadata |
| Frontend Error Handling | `ErrorBoundary` component, `console.error` | No aggregation, no reporting service |
| Response Headers | `X-Cache`, `X-Circuit`, `X-Degraded` | Manual inspection only |
| Stale Data Indicator | `StaleDataIndicator` component | UI feedback only, no metrics |

### Identified Gaps

| Gap | Impact |
|-----|--------|
| No persistent error logs | Can't analyze error patterns over time |
| No API latency tracking | Can't identify slow endpoints or degradation |
| No frontend error reporting | User errors invisible to developers |
| No health check endpoint | Can't monitor system availability |
| No alerting thresholds | Issues discovered reactively |
| No admin dashboard | No visibility into system health |

---

## 1. Structured Logging System

### Create Shared Logging Module

Implement a structured logger for Edge Functions that outputs consistent JSON logs:

**Create: `supabase/functions/_shared/logger.ts`**

```typescript
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  function_name: string;
  request_id?: string;
  symbol?: string;
  user_id?: string;
  duration_ms?: number;
  cache_status?: 'hit' | 'miss' | 'stale';
  circuit_state?: 'closed' | 'open' | 'half-open';
  [key: string]: unknown;
}

interface StructuredLog {
  timestamp: string;
  level: LogLevel;
  message: string;
  context: LogContext;
}

export function createLogger(functionName: string) {
  const baseContext: LogContext = { function_name: functionName };
  
  function log(level: LogLevel, message: string, context: Partial<LogContext> = {}) {
    const structured: StructuredLog = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: { ...baseContext, ...context },
    };
    
    const output = JSON.stringify(structured);
    
    switch (level) {
      case 'error':
        console.error(output);
        break;
      case 'warn':
        console.warn(output);
        break;
      default:
        console.log(output);
    }
    
    return structured;
  }
  
  return {
    debug: (msg: string, ctx?: Partial<LogContext>) => log('debug', msg, ctx),
    info: (msg: string, ctx?: Partial<LogContext>) => log('info', msg, ctx),
    warn: (msg: string, ctx?: Partial<LogContext>) => log('warn', msg, ctx),
    error: (msg: string, ctx?: Partial<LogContext>) => log('error', msg, ctx),
    
    // Request lifecycle helpers
    startRequest: (requestId: string) => {
      baseContext.request_id = requestId;
      return Date.now();
    },
    endRequest: (startTime: number, status: number) => {
      log('info', `Request completed`, {
        duration_ms: Date.now() - startTime,
        status_code: status,
      });
    },
  };
}
```

### Integrate Structured Logging

Update key Edge Functions to use the structured logger:

**Example: `stocktwits-proxy/index.ts`**

```typescript
import { createLogger } from '../_shared/logger.ts';

const logger = createLogger('stocktwits-proxy');

// At request start:
const requestId = crypto.randomUUID();
const startTime = logger.startRequest(requestId);

logger.info('Processing request', { 
  action, 
  symbol,
  cache_status: cached ? 'hit' : 'miss',
});

// On cache hit:
logger.info('Cache hit', { 
  symbol, 
  cache_status: 'hit',
  ttl_remaining_ms: expiresAt - Date.now(),
});

// On circuit open:
logger.warn('Circuit breaker open', { 
  symbol,
  circuit_state: 'open',
  fallback_used: !!staleCache,
});

// At request end:
logger.endRequest(startTime, 200);
```

---

## 2. Error Tracking Infrastructure

### Create Error Log Table

Store persistent error records for analysis:

```sql
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
  
  -- Indexing
  CONSTRAINT valid_severity CHECK (severity IN ('warning', 'error', 'critical'))
);

-- Enable RLS
ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;

-- Service role can insert/update
CREATE POLICY "Service role full access" ON public.error_logs
FOR ALL USING (auth.role() = 'service_role');

-- Admin users can read (future: admin role check)
CREATE POLICY "Public read for monitoring" ON public.error_logs
FOR SELECT USING (true);

-- Index for common queries
CREATE INDEX idx_error_logs_created ON public.error_logs(created_at DESC);
CREATE INDEX idx_error_logs_function ON public.error_logs(function_name, created_at DESC);
CREATE INDEX idx_error_logs_severity ON public.error_logs(severity, resolved, created_at DESC);
```

### Create Error Reporting Helper

**Add to: `supabase/functions/_shared/logger.ts`**

```typescript
import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

interface ErrorReport {
  error_type: 'edge_function' | 'frontend' | 'database';
  error_code?: string;
  error_message: string;
  stack_trace?: string;
  function_name?: string;
  request_id?: string;
  symbol?: string;
  user_id?: string;
  request_path?: string;
  request_method?: string;
  request_params?: Record<string, unknown>;
  severity?: 'warning' | 'error' | 'critical';
}

export async function reportError(
  supabase: SupabaseClient,
  report: ErrorReport
): Promise<void> {
  try {
    await supabase.from('error_logs').insert({
      ...report,
      environment: Deno.env.get('ENVIRONMENT') || 'production',
    });
  } catch (e) {
    // Don't fail the request if error logging fails
    console.error('Failed to log error:', e);
  }
}
```

### Integrate Error Reporting in Edge Functions

```typescript
// On upstream API failure:
await reportError(supabase, {
  error_type: 'edge_function',
  error_code: String(response.status),
  error_message: `Upstream API returned ${response.status}`,
  function_name: 'stocktwits-proxy',
  request_id: requestId,
  symbol: params.symbol,
  request_path: '/functions/v1/stocktwits-proxy',
  request_method: 'GET',
  request_params: { action, symbol },
  severity: response.status >= 500 ? 'error' : 'warning',
});
```

---

## 3. Performance Metrics Collection

### Create Performance Metrics Table

Track API response times and throughput:

```sql
CREATE TABLE IF NOT EXISTS public.performance_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recorded_at timestamptz DEFAULT now(),
  
  -- Metric identification
  metric_type text NOT NULL, -- 'api_latency', 'cache_operation', 'ai_call'
  function_name text NOT NULL,
  endpoint text,             -- Specific action or route
  
  -- Timing
  duration_ms integer NOT NULL,
  
  -- Context
  symbol text,
  cache_status text,         -- 'hit', 'miss', 'stale'
  circuit_state text,        -- 'closed', 'open', 'half-open'
  status_code integer,
  
  -- Aggregation bucket (for efficient querying)
  bucket_hour timestamptz GENERATED ALWAYS AS (date_trunc('hour', recorded_at)) STORED
);

-- Enable RLS
ALTER TABLE public.performance_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role insert" ON public.performance_metrics
FOR INSERT USING (auth.role() = 'service_role');

CREATE POLICY "Public read" ON public.performance_metrics
FOR SELECT USING (true);

-- Optimized indexes
CREATE INDEX idx_perf_metrics_bucket ON public.performance_metrics(bucket_hour DESC);
CREATE INDEX idx_perf_metrics_function ON public.performance_metrics(function_name, bucket_hour DESC);

-- Retention: Delete metrics older than 30 days
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
```

### Create Metrics Recording Helper

**Add to: `supabase/functions/_shared/logger.ts`**

```typescript
interface PerformanceMetric {
  metric_type: 'api_latency' | 'cache_operation' | 'ai_call' | 'upstream_call';
  function_name: string;
  endpoint?: string;
  duration_ms: number;
  symbol?: string;
  cache_status?: string;
  circuit_state?: string;
  status_code?: number;
}

export async function recordMetric(
  supabase: SupabaseClient,
  metric: PerformanceMetric
): Promise<void> {
  try {
    // Fire and forget - don't await
    supabase.from('performance_metrics').insert(metric);
  } catch (e) {
    console.error('Failed to record metric:', e);
  }
}
```

### Integrate Metrics in Edge Functions

```typescript
// At the end of each request:
recordMetric(supabase, {
  metric_type: 'api_latency',
  function_name: 'stocktwits-proxy',
  endpoint: action,
  duration_ms: Date.now() - startTime,
  symbol,
  cache_status: cacheHit ? 'hit' : cacheMiss ? 'miss' : 'stale',
  circuit_state: getCircuitStateLabel(CIRCUIT_ID),
  status_code: 200,
});

// For AI calls:
const aiStart = Date.now();
const aiResponse = await fetch(AI_ENDPOINT, ...);
recordMetric(supabase, {
  metric_type: 'ai_call',
  function_name: 'generate-lens-summary',
  duration_ms: Date.now() - aiStart,
  symbol,
  status_code: aiResponse.status,
});
```

---

## 4. Health Check Endpoint

### Create Health Check Edge Function

**Create: `supabase/functions/health-check/index.ts`**

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCircuitStateLabel } from "../_shared/circuit-breaker.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  checks: {
    database: { status: string; latency_ms: number };
    stocktwits_circuit: { status: string };
    yahoo_circuit: { status: string };
    cache_hit_rate: { value: number; status: string };
  };
  version: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const checks: HealthStatus['checks'] = {
    database: { status: 'unknown', latency_ms: 0 },
    stocktwits_circuit: { status: 'unknown' },
    yahoo_circuit: { status: 'unknown' },
    cache_hit_rate: { value: 0, status: 'unknown' },
  };

  // Check database connectivity
  const dbStart = Date.now();
  try {
    await supabase.from('cache_statistics').select('id').limit(1);
    checks.database = { status: 'ok', latency_ms: Date.now() - dbStart };
  } catch (e) {
    checks.database = { status: 'error', latency_ms: Date.now() - dbStart };
  }

  // Check circuit breaker states
  checks.stocktwits_circuit = { status: getCircuitStateLabel('stocktwits-upstream') };
  checks.yahoo_circuit = { status: getCircuitStateLabel('yahoo-finance') };

  // Calculate cache hit rate (last 24 hours)
  const { data: cacheStats } = await supabase
    .from('cache_statistics')
    .select('hits, misses, stale_hits')
    .gte('recorded_date', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0]);

  if (cacheStats && cacheStats.length > 0) {
    const totalHits = cacheStats.reduce((sum, r) => sum + (r.hits || 0), 0);
    const totalMisses = cacheStats.reduce((sum, r) => sum + (r.misses || 0), 0);
    const hitRate = totalHits / (totalHits + totalMisses || 1);
    checks.cache_hit_rate = { 
      value: Math.round(hitRate * 100), 
      status: hitRate > 0.7 ? 'good' : hitRate > 0.5 ? 'fair' : 'poor'
    };
  }

  // Determine overall status
  const isUnhealthy = 
    checks.database.status === 'error' ||
    checks.stocktwits_circuit.status === 'OPEN' ||
    checks.yahoo_circuit.status === 'OPEN';
  
  const isDegraded = 
    checks.stocktwits_circuit.status === 'HALF-OPEN' ||
    checks.yahoo_circuit.status === 'HALF-OPEN' ||
    checks.cache_hit_rate.status === 'poor';

  const health: HealthStatus = {
    status: isUnhealthy ? 'unhealthy' : isDegraded ? 'degraded' : 'healthy',
    timestamp: new Date().toISOString(),
    checks,
    version: Deno.env.get('FUNCTION_VERSION') || 'unknown',
  };

  return new Response(JSON.stringify(health), {
    status: health.status === 'healthy' ? 200 : health.status === 'degraded' ? 200 : 503,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
```

---

## 5. Admin Monitoring Dashboard

### Create Monitoring Page Component

**Create: `src/pages/MonitoringPage.tsx`**

```typescript
// Admin-only monitoring dashboard showing:
// - System health status (from health-check endpoint)
// - Cache hit/miss rates over time
// - Error log summary (recent errors, by type)
// - Performance metrics (p50, p95, p99 latencies)
// - Circuit breaker status
// - Active alerts

// Key sections:
// 1. Health Overview Card - traffic light status
// 2. Cache Performance Chart - hit rate trend
// 3. Error Log Table - filterable, sortable
// 4. Latency Distribution Chart - histogram by endpoint
// 5. Circuit Breaker Status Cards
```

### Create Monitoring Hooks

**Create: `src/hooks/use-monitoring-data.ts`**

```typescript
// Hooks for fetching monitoring data:
// - useHealthCheck() - polls /functions/v1/health-check
// - useCacheMetrics(days) - fetches from cache_statistics
// - useErrorLogs(filters) - fetches from error_logs
// - usePerformanceMetrics(timeRange) - fetches aggregated metrics
```

---

## 6. Frontend Error Reporting

### Update Error Boundary to Report Errors

**Update: `src/components/ErrorBoundary.tsx`**

```typescript
public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
  console.error("ErrorBoundary caught an error:", error, errorInfo);
  
  // Report to backend (fire and forget)
  this.reportError(error, errorInfo);
}

private async reportError(error: Error, errorInfo: ErrorInfo) {
  try {
    await supabase.from('error_logs').insert({
      error_type: 'frontend',
      error_code: 'RENDER_ERROR',
      error_message: error.message,
      stack_trace: error.stack,
      function_name: errorInfo.componentStack?.split('\n')[1]?.trim(),
      request_path: window.location.pathname,
      severity: 'error',
    });
  } catch (e) {
    // Silent fail - don't break the error boundary
  }
}
```

### Create Global Error Handler

**Create: `src/lib/error-reporter.ts`**

```typescript
import { supabase } from '@/integrations/supabase/client';

interface FrontendError {
  message: string;
  stack?: string;
  componentName?: string;
  severity?: 'warning' | 'error' | 'critical';
  metadata?: Record<string, unknown>;
}

export async function reportFrontendError(error: FrontendError): Promise<void> {
  try {
    const session = await supabase.auth.getSession();
    
    await supabase.from('error_logs').insert({
      error_type: 'frontend',
      error_message: error.message,
      stack_trace: error.stack,
      function_name: error.componentName,
      user_id: session.data.session?.user?.id,
      request_path: window.location.pathname,
      severity: error.severity || 'error',
      request_params: error.metadata,
    });
  } catch (e) {
    console.error('Failed to report error:', e);
  }
}

// Global unhandled error handler
window.addEventListener('error', (event) => {
  reportFrontendError({
    message: event.message,
    stack: event.error?.stack,
    severity: 'error',
    metadata: {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    },
  });
});

// Unhandled promise rejection handler
window.addEventListener('unhandledrejection', (event) => {
  reportFrontendError({
    message: event.reason?.message || 'Unhandled promise rejection',
    stack: event.reason?.stack,
    severity: 'error',
  });
});
```

---

## 7. Implementation Sequence

### Step 1: Database Infrastructure (15 min)
1. Create `error_logs` table with indexes
2. Create `performance_metrics` table with retention cleanup
3. Add cleanup job for performance metrics (daily)

### Step 2: Shared Logging Module (20 min)
1. Create `supabase/functions/_shared/logger.ts`
2. Add structured logging helpers
3. Add error reporting helper
4. Add metrics recording helper

### Step 3: Edge Function Integration (45 min)
1. Update `stocktwits-proxy` with structured logging
2. Update `stock-price-proxy` with structured logging
3. Update `generate-lens-summary` with AI call metrics
4. Create `health-check` Edge Function

### Step 4: Frontend Error Reporting (30 min)
1. Create `src/lib/error-reporter.ts`
2. Update `ErrorBoundary` to report errors
3. Add global error handlers in `main.tsx`

### Step 5: Monitoring Dashboard (60 min)
1. Create `src/hooks/use-monitoring-data.ts`
2. Create `src/pages/MonitoringPage.tsx`
3. Add route to `App.tsx` (admin-only)
4. Build health status, cache metrics, and error log views

---

## 8. Files to Create/Modify

### New Files
- `supabase/functions/_shared/logger.ts` - Structured logging module
- `supabase/functions/health-check/index.ts` - Health check endpoint
- `src/lib/error-reporter.ts` - Frontend error reporting
- `src/hooks/use-monitoring-data.ts` - Monitoring data hooks
- `src/pages/MonitoringPage.tsx` - Admin monitoring dashboard

### Modified Files
- `supabase/functions/stocktwits-proxy/index.ts` - Add structured logging
- `supabase/functions/stock-price-proxy/index.ts` - Add structured logging
- `supabase/functions/generate-lens-summary/index.ts` - Add AI metrics
- `src/components/ErrorBoundary.tsx` - Add error reporting
- `src/main.tsx` - Initialize global error handlers
- `src/App.tsx` - Add monitoring route
- `supabase/config.toml` - Add health-check function

### New Database Objects
- Table: `error_logs`
- Table: `performance_metrics`
- Function: `cleanup_performance_metrics()`
- Cron job: `cleanup-performance-metrics` (daily)

---

## 9. Expected Outcomes

| Metric | Before | After |
|--------|--------|-------|
| Error visibility | Console only | Persistent logs with context |
| Performance tracking | None | p50/p95/p99 latency metrics |
| Cache monitoring | Basic hit/miss counts | Trend visualization |
| System health checks | Manual inspection | Automated health endpoint |
| Frontend error tracking | None | Centralized error logs |
| Admin visibility | None | Real-time monitoring dashboard |

---

## 10. Verification Steps

### Verify Structured Logging
1. Call stocktwits-proxy endpoint
2. Check Edge Function logs for JSON-formatted output
3. Verify request_id correlation across log entries

### Verify Error Reporting
1. Trigger an error in an Edge Function
2. Query `error_logs` table to verify record
3. Trigger a frontend error and verify it's logged

### Verify Health Check
```bash
curl https://[project-id].supabase.co/functions/v1/health-check
# Expect: { "status": "healthy", "checks": {...} }
```

### Verify Monitoring Dashboard
1. Navigate to `/monitoring` as admin
2. Verify health status card shows current state
3. Verify cache hit rate chart shows data
4. Verify error log table shows recent entries

---

## Technical Notes

- Structured logs use JSON format for machine-readability while remaining human-scannable
- Error reporting uses fire-and-forget pattern to avoid impacting request latency
- Performance metrics table uses generated column for hour bucketing to optimize aggregation queries
- Health check endpoint is lightweight (<100ms) suitable for uptime monitoring services
- Frontend error handlers are registered early in app lifecycle via main.tsx
- Monitoring dashboard is admin-only (future: implement proper RBAC)
- 30-day retention for performance metrics balances insight vs. storage costs
