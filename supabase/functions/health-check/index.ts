import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCircuitStateLabel } from "../_shared/circuit-breaker.ts";
import { createLogger } from "../_shared/logger.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logger = createLogger('health-check');

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

// Track function startup time
const startupTime = Date.now();

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID();
  const startTime = logger.startRequest(requestId);

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const checks: HealthStatus['checks'] = {
      database: { status: 'unknown' },
      stocktwits_circuit: { status: 'unknown' },
      yahoo_circuit: { status: 'unknown' },
      cache_hit_rate: { status: 'unknown' },
    };

    // Check database connectivity
    const dbStart = Date.now();
    try {
      await supabase.from('cache_statistics').select('id').limit(1);
      checks.database = { 
        status: 'ok', 
        latency_ms: Date.now() - dbStart 
      };
    } catch (e) {
      checks.database = { 
        status: 'error', 
        latency_ms: Date.now() - dbStart,
        details: e instanceof Error ? e.message : 'Unknown error'
      };
    }

    // Check circuit breaker states
    checks.stocktwits_circuit = { 
      status: getCircuitStateLabel('stocktwits-upstream') 
    };
    checks.yahoo_circuit = { 
      status: getCircuitStateLabel('yahoo-finance') 
    };

    // Calculate cache hit rate (last 24 hours)
    try {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const { data: cacheStats } = await supabase
        .from('cache_statistics')
        .select('hits, misses, stale_hits')
        .gte('recorded_date', yesterday);

      if (cacheStats && cacheStats.length > 0) {
        const totalHits = cacheStats.reduce((sum, r) => sum + (r.hits || 0), 0);
        const totalMisses = cacheStats.reduce((sum, r) => sum + (r.misses || 0), 0);
        const totalRequests = totalHits + totalMisses;
        const hitRate = totalRequests > 0 ? totalHits / totalRequests : 0;
        
        checks.cache_hit_rate = { 
          status: hitRate > 0.7 ? 'good' : hitRate > 0.5 ? 'fair' : 'poor',
          value: Math.round(hitRate * 100),
        };
      } else {
        checks.cache_hit_rate = { status: 'no_data', value: 0 };
      }
    } catch (e) {
      checks.cache_hit_rate = { 
        status: 'error',
        details: e instanceof Error ? e.message : 'Unknown error'
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
      version: Deno.env.get('FUNCTION_VERSION') || '1.0.0',
      uptime_ms: Date.now() - startupTime,
    };

    const httpStatus = health.status === 'healthy' ? 200 : health.status === 'degraded' ? 200 : 503;

    logger.info('Health check completed', {
      status_code: httpStatus,
      cache_status: checks.cache_hit_rate.status as 'hit' | 'miss' | 'stale',
    });
    
    logger.endRequest(startTime, httpStatus);

    return new Response(JSON.stringify(health), {
      status: httpStatus,
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    logger.error('Health check failed', {
      status_code: 500,
    });
    
    return new Response(
      JSON.stringify({ 
        status: 'unhealthy', 
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      }),
      { 
        status: 503, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
