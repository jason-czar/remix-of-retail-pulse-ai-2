/**
 * Structured Logging and Observability Module for Edge Functions
 * 
 * Provides consistent JSON logging, error reporting, and performance metrics.
 */

// Use a more permissive type for SupabaseClient to avoid version conflicts
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabaseClient = any;

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  function_name: string;
  request_id?: string;
  symbol?: string;
  user_id?: string;
  duration_ms?: number;
  cache_status?: 'hit' | 'miss' | 'stale';
  circuit_state?: 'closed' | 'open' | 'half-open';
  status_code?: number;
  [key: string]: unknown;
}

interface StructuredLog {
  timestamp: string;
  level: LogLevel;
  message: string;
  context: LogContext;
}

interface Logger {
  debug: (msg: string, ctx?: Partial<LogContext>) => StructuredLog;
  info: (msg: string, ctx?: Partial<LogContext>) => StructuredLog;
  warn: (msg: string, ctx?: Partial<LogContext>) => StructuredLog;
  error: (msg: string, ctx?: Partial<LogContext>) => StructuredLog;
  startRequest: (requestId: string) => number;
  endRequest: (startTime: number, status: number) => void;
  getRequestId: () => string | undefined;
}

/**
 * Create a structured logger for an Edge Function
 */
export function createLogger(functionName: string): Logger {
  const baseContext: LogContext = { function_name: functionName };
  
  function log(level: LogLevel, message: string, context: Partial<LogContext> = {}): StructuredLog {
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
    
    startRequest: (requestId: string) => {
      baseContext.request_id = requestId;
      return Date.now();
    },
    
    endRequest: (startTime: number, status: number) => {
      log('info', 'Request completed', {
        duration_ms: Date.now() - startTime,
        status_code: status,
      });
    },
    
    getRequestId: () => baseContext.request_id,
  };
}

// ============ Error Reporting ============

export interface ErrorReport {
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

/**
 * Report an error to the error_logs table
 * Fire-and-forget pattern to avoid impacting request latency
 */
export async function reportError(
  supabase: AnySupabaseClient,
  report: ErrorReport
): Promise<void> {
  try {
    await supabase.from('error_logs').insert({
      error_type: report.error_type,
      error_code: report.error_code,
      error_message: report.error_message,
      stack_trace: report.stack_trace,
      function_name: report.function_name,
      request_id: report.request_id,
      symbol: report.symbol,
      user_id: report.user_id,
      request_path: report.request_path,
      request_method: report.request_method,
      request_params: report.request_params,
      severity: report.severity || 'error',
      environment: Deno.env.get('ENVIRONMENT') || 'production',
    });
  } catch (e) {
    // Don't fail the request if error logging fails
    console.error('Failed to log error:', e);
  }
}

// ============ Performance Metrics ============

export interface PerformanceMetric {
  metric_type: 'api_latency' | 'cache_operation' | 'ai_call' | 'upstream_call';
  function_name: string;
  endpoint?: string;
  duration_ms: number;
  symbol?: string;
  cache_status?: string;
  circuit_state?: string;
  status_code?: number;
}

/**
 * Record a performance metric to the performance_metrics table
 * Fire-and-forget pattern to avoid impacting request latency
 */
export async function recordMetric(
  supabase: AnySupabaseClient,
  metric: PerformanceMetric
): Promise<void> {
  try {
    // Fire and forget pattern
    await supabase.from('performance_metrics').insert({
      metric_type: metric.metric_type,
      function_name: metric.function_name,
      endpoint: metric.endpoint,
      duration_ms: metric.duration_ms,
      symbol: metric.symbol,
      cache_status: metric.cache_status,
      circuit_state: metric.circuit_state,
      status_code: metric.status_code,
    });
  } catch (e) {
    console.error('Failed to record metric:', e);
  }
}

/**
 * Create a metrics timer for measuring operation duration
 */
export function createTimer() {
  const start = Date.now();
  return {
    elapsed: () => Date.now() - start,
    record: (
      supabase: AnySupabaseClient,
      metric: Omit<PerformanceMetric, 'duration_ms'>
    ) => {
      recordMetric(supabase, {
        ...metric,
        duration_ms: Date.now() - start,
      });
    },
  };
}
