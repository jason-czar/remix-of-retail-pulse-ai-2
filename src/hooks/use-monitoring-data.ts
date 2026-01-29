/**
 * Monitoring Data Hooks
 * 
 * Provides hooks for fetching monitoring and observability data.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// ============ Health Check Hook ============

interface HealthCheck {
  status: string;
  latency_ms?: number;
  value?: number;
  details?: string;
}

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  checks: {
    database: HealthCheck;
    stocktwits_circuit: HealthCheck;
    yahoo_circuit: HealthCheck;
    cache_hit_rate: HealthCheck;
  };
  version: string;
  uptime_ms: number;
}

export function useHealthCheck(enabled = true) {
  return useQuery({
    queryKey: ['health-check'],
    queryFn: async (): Promise<HealthStatus> => {
      const { data, error } = await supabase.functions.invoke('health-check');
      if (error) throw error;
      return data as HealthStatus;
    },
    refetchInterval: 30000, // Poll every 30 seconds
    staleTime: 15000,
    enabled,
  });
}

// ============ Cache Metrics Hook ============

interface CacheMetrics {
  date: string;
  cache_name: string;
  hits: number;
  misses: number;
  stale_hits: number;
  hit_rate: number;
}

export function useCacheMetrics(days = 7) {
  return useQuery({
    queryKey: ['cache-metrics', days],
    queryFn: async (): Promise<CacheMetrics[]> => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      
      const { data, error } = await supabase
        .from('cache_statistics')
        .select('*')
        .gte('recorded_date', startDate.toISOString().split('T')[0])
        .order('recorded_date', { ascending: true });
      
      if (error) throw error;
      
      return (data || []).map(row => ({
        date: row.recorded_date,
        cache_name: row.cache_name,
        hits: row.hits || 0,
        misses: row.misses || 0,
        stale_hits: row.stale_hits || 0,
        hit_rate: row.hits && row.misses 
          ? Math.round((row.hits / (row.hits + row.misses)) * 100)
          : 0,
      }));
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// ============ Error Logs Hook ============

interface ErrorLog {
  id: string;
  created_at: string;
  error_type: string;
  error_code: string | null;
  error_message: string;
  stack_trace: string | null;
  function_name: string | null;
  request_id: string | null;
  symbol: string | null;
  severity: string;
  resolved: boolean;
  request_path: string | null;
}

interface ErrorLogsFilter {
  severity?: 'warning' | 'error' | 'critical';
  errorType?: 'edge_function' | 'frontend' | 'database';
  resolved?: boolean;
  limit?: number;
}

export function useErrorLogs(filter: ErrorLogsFilter = {}) {
  return useQuery({
    queryKey: ['error-logs', filter],
    queryFn: async (): Promise<ErrorLog[]> => {
      let query = supabase
        .from('error_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(filter.limit || 100);
      
      if (filter.severity) {
        query = query.eq('severity', filter.severity);
      }
      if (filter.errorType) {
        query = query.eq('error_type', filter.errorType);
      }
      if (filter.resolved !== undefined) {
        query = query.eq('resolved', filter.resolved);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      
      return data || [];
    },
    staleTime: 60 * 1000, // 1 minute
  });
}

// ============ Performance Metrics Hook ============

interface PerformanceMetric {
  id: string;
  recorded_at: string;
  metric_type: string;
  function_name: string;
  endpoint: string | null;
  duration_ms: number;
  symbol: string | null;
  cache_status: string | null;
  circuit_state: string | null;
  status_code: number | null;
}

interface PerformanceAggregates {
  function_name: string;
  endpoint: string;
  count: number;
  avg_duration_ms: number;
  p50_duration_ms: number;
  p95_duration_ms: number;
  p99_duration_ms: number;
  error_rate: number;
}

export function usePerformanceMetrics(hours = 24) {
  return useQuery({
    queryKey: ['performance-metrics', hours],
    queryFn: async (): Promise<PerformanceMetric[]> => {
      const startTime = new Date();
      startTime.setHours(startTime.getHours() - hours);
      
      const { data, error } = await supabase
        .from('performance_metrics')
        .select('*')
        .gte('recorded_at', startTime.toISOString())
        .order('recorded_at', { ascending: false })
        .limit(1000);
      
      if (error) throw error;
      return data || [];
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Calculate performance aggregates from raw metrics
 */
export function calculatePerformanceAggregates(
  metrics: PerformanceMetric[]
): PerformanceAggregates[] {
  // Group by function_name + endpoint
  const groups = new Map<string, PerformanceMetric[]>();
  
  for (const metric of metrics) {
    const key = `${metric.function_name}:${metric.endpoint || 'default'}`;
    const group = groups.get(key) || [];
    group.push(metric);
    groups.set(key, group);
  }
  
  // Calculate aggregates for each group
  const aggregates: PerformanceAggregates[] = [];
  
  for (const [key, group] of groups) {
    const [functionName, endpoint] = key.split(':');
    const durations = group.map(m => m.duration_ms).sort((a, b) => a - b);
    const errors = group.filter(m => m.status_code && m.status_code >= 400);
    
    aggregates.push({
      function_name: functionName,
      endpoint: endpoint,
      count: group.length,
      avg_duration_ms: Math.round(durations.reduce((a, b) => a + b, 0) / durations.length),
      p50_duration_ms: durations[Math.floor(durations.length * 0.5)] || 0,
      p95_duration_ms: durations[Math.floor(durations.length * 0.95)] || 0,
      p99_duration_ms: durations[Math.floor(durations.length * 0.99)] || 0,
      error_rate: Math.round((errors.length / group.length) * 100),
    });
  }
  
  return aggregates.sort((a, b) => b.count - a.count);
}

// ============ Error Summary Hook ============

interface ErrorSummary {
  total: number;
  byType: Record<string, number>;
  bySeverity: Record<string, number>;
  recentErrors: number;
  unresolvedErrors: number;
}

export function useErrorSummary() {
  const { data: errors } = useErrorLogs({ limit: 500 });
  
  if (!errors) {
    return {
      total: 0,
      byType: {},
      bySeverity: {},
      recentErrors: 0,
      unresolvedErrors: 0,
    };
  }
  
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  
  const summary: ErrorSummary = {
    total: errors.length,
    byType: {},
    bySeverity: {},
    recentErrors: errors.filter(e => new Date(e.created_at) > oneHourAgo).length,
    unresolvedErrors: errors.filter(e => !e.resolved).length,
  };
  
  for (const error of errors) {
    summary.byType[error.error_type] = (summary.byType[error.error_type] || 0) + 1;
    summary.bySeverity[error.severity] = (summary.bySeverity[error.severity] || 0) + 1;
  }
  
  return summary;
}
