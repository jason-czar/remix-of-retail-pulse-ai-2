import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { 
  canMakeRequest, 
  recordSuccess, 
  recordFailure, 
  getCircuitStateLabel,
  isCircuitTripError 
} from '../_shared/circuit-breaker.ts'
import { createLogger, reportError, recordMetric, createTimer } from '../_shared/logger.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const STOCKTWITS_BASE_URL = 'https://srwjqgmqqsuazsczmywh.supabase.co'
const CIRCUIT_ID = 'stocktwits-upstream'

// Cache TTL configuration (in seconds)
const CACHE_TTL = {
  trending: 60,      // 1 minute - trending data changes frequently
  stats: 30,         // 30 seconds - stats can shift quickly
  messages: 60,      // 1 minute - balance freshness vs API load
  sentiment: 60,     // 1 minute
  analytics: 120,    // 2 minutes - aggregated data, less volatile
  analyze: 0,        // No caching for analysis requests
} as const

// Create structured logger
const logger = createLogger('stocktwits-proxy')

// Create Supabase client for cache access
function getSupabaseClient() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  return createClient(supabaseUrl, supabaseKey)
}

// Generate a unique cache key from request parameters
function generateCacheKey(action: string, params: Record<string, string | null>): string {
  const sortedParams = Object.entries(params)
    .filter(([_, v]) => v !== null && v !== undefined)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('&')
  return `${action}:${sortedParams}`
}

// Try to get cached response (including stale entries for fallback)
async function getCachedResponse(
  supabase: ReturnType<typeof getSupabaseClient>, 
  cacheKey: string,
  allowStale = false
): Promise<{ data: unknown; isStale: boolean } | null> {
  try {
    const { data, error } = await supabase
      .from('stocktwits_response_cache')
      .select('response_data, expires_at')
      .eq('cache_key', cacheKey)
      .single()
    
    if (error || !data) return null
    
    const isExpired = new Date(data.expires_at) < new Date()
    
    if (isExpired && !allowStale) {
      // Delete expired entry async (don't wait)
      supabase.from('stocktwits_response_cache').delete().eq('cache_key', cacheKey)
      return null
    }
    
    return { data: data.response_data, isStale: isExpired }
  } catch {
    return null
  }
}

// Store response in cache
async function setCachedResponse(
  supabase: ReturnType<typeof getSupabaseClient>, 
  cacheKey: string, 
  action: string,
  symbol: string | null,
  data: unknown, 
  ttlSeconds: number
): Promise<void> {
  if (ttlSeconds <= 0) return
  
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString()
  
  try {
    await supabase
      .from('stocktwits_response_cache')
      .upsert({
        cache_key: cacheKey,
        action,
        symbol,
        response_data: data,
        expires_at: expiresAt,
        created_at: new Date().toISOString(),
      }, { onConflict: 'cache_key' })
  } catch (error) {
    logger.error('Failed to cache response', { error: String(error) })
  }
}

// Periodically cleanup old cache entries (run occasionally)
async function maybeCleanupCache(supabase: ReturnType<typeof getSupabaseClient>): Promise<void> {
  // Only run cleanup ~5% of requests to avoid overhead
  if (Math.random() > 0.05) return
  
  try {
    await supabase.rpc('cleanup_stocktwits_cache')
    logger.debug('Cache cleanup executed')
  } catch (error) {
    logger.error('Cache cleanup failed', { error: String(error) })
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  // Initialize request tracking
  const requestId = crypto.randomUUID()
  const requestTimer = createTimer()
  const startTime = logger.startRequest(requestId)

  // Get circuit state for response headers
  const circuitState = getCircuitStateLabel(CIRCUIT_ID)
  
  // Initialize Supabase client
  const supabase = getSupabaseClient()

  try {
    const stocktwitsApiKey = Deno.env.get('STOCKTWITS_API_KEY')
    if (!stocktwitsApiKey) {
      logger.error('StockTwits API key not configured')
      return new Response(
        JSON.stringify({ error: 'StockTwits API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-Circuit': circuitState } }
      )
    }

    // Get the request URL and parse the action
    const url = new URL(req.url)
    const action = url.searchParams.get('action')
    const symbol = url.searchParams.get('symbol')
    const type = url.searchParams.get('type')
    const limit = url.searchParams.get('limit') || '50'

    logger.info('Processing request', { 
      action: action || 'unknown',
      symbol: symbol || undefined,
      circuit_state: circuitState as 'closed' | 'open' | 'half-open',
    })

    let endpoint = ''
    let queryParams = new URLSearchParams()

    // Helper to get date params with defaults
    const getDateParams = (defaultDays: number) => {
      const startParam = url.searchParams.get('start')
      const endParam = url.searchParams.get('end')
      const now = new Date()
      const pastDate = new Date(now.getTime() - defaultDays * 24 * 60 * 60 * 1000)
      return {
        start: startParam || pastDate.toISOString().split('T')[0],
        end: endParam || now.toISOString().split('T')[0]
      }
    }

    // Build cache key params (only include params that affect the response)
    const cacheKeyParams: Record<string, string | null> = { symbol }

    switch (action) {
      case 'messages': {
        endpoint = '/functions/v1/stocktwits-query'
        queryParams.set('action', 'messages')
        queryParams.set('primaryOnly', 'true')
        if (symbol) queryParams.set('symbol', symbol)
        queryParams.set('limit', limit)
        // Required date parameters - default to last 7 days
        const { start, end } = getDateParams(7)
        queryParams.set('start', start)
        queryParams.set('end', end)
        // Cursor-based pagination support
        const cursorCreatedAt = url.searchParams.get('cursor_created_at')
        const cursorId = url.searchParams.get('cursor_id')
        if (cursorCreatedAt) queryParams.set('cursor_created_at', cursorCreatedAt)
        if (cursorId) queryParams.set('cursor_id', cursorId)
        
        // Add to cache key
        cacheKeyParams.limit = limit
        cacheKeyParams.start = start
        cacheKeyParams.end = end
        cacheKeyParams.cursor_created_at = cursorCreatedAt
        cacheKeyParams.cursor_id = cursorId
        break
      }
      
      case 'symbols':
        endpoint = '/functions/v1/stocktwits-query'
        queryParams.set('action', 'symbols')
        break
      
      case 'stats':
        endpoint = '/functions/v1/stocktwits-query'
        queryParams.set('action', 'stats')
        if (symbol) queryParams.set('symbol', symbol)
        break
      
      case 'analytics': {
        endpoint = '/functions/v1/stocktwits-query'
        queryParams.set('action', 'analytics')
        if (type) queryParams.set('type', type)
        if (symbol) queryParams.set('symbol', symbol)
        // Add date parameters - default to last 30 days
        const { start: analyticsStart, end: analyticsEnd } = getDateParams(30)
        queryParams.set('start', analyticsStart)
        queryParams.set('end', analyticsEnd)
        
        // Add to cache key
        cacheKeyParams.type = type
        cacheKeyParams.start = analyticsStart
        cacheKeyParams.end = analyticsEnd
        break
      }
      
      case 'sentiment':
        endpoint = '/functions/v1/stocktwits-sentiment'
        if (symbol) queryParams.set('symbol', symbol)
        break
      
      case 'trending':
        endpoint = '/functions/v1/stocktwits-trending'
        cacheKeyParams.symbol = null // Trending doesn't use symbol
        break
      
      case 'analyze':
        endpoint = '/functions/v1/analyze-sentiment'
        break
      
      default:
        logger.warn('Invalid action requested', { action: action || 'null' })
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-Circuit': circuitState } }
        )
    }

    // Get cache TTL for this action
    const ttl = CACHE_TTL[action as keyof typeof CACHE_TTL] ?? 0
    const cacheKey = generateCacheKey(action!, cacheKeyParams)
    
    // Try to get cached response first (skip for analyze/POST requests)
    if (ttl > 0 && req.method !== 'POST') {
      const cached = await getCachedResponse(supabase, cacheKey)
      if (cached && !cached.isStale) {
        logger.info('Cache hit', { 
          symbol: symbol || undefined,
          cache_status: 'hit',
        })
        // Record cache hit (background)
        supabase.rpc('increment_cache_stat', { p_cache_name: 'stocktwits_proxy', p_column: 'hits' })
        
        // Record metrics
        requestTimer.record(supabase, {
          metric_type: 'api_latency',
          function_name: 'stocktwits-proxy',
          endpoint: action,
          symbol: symbol || undefined,
          cache_status: 'hit',
          circuit_state: circuitState,
          status_code: 200,
        })
        
        logger.endRequest(startTime, 200)
        
        return new Response(
          JSON.stringify(cached.data),
          { 
            status: 200,
            headers: { 
              ...corsHeaders, 
              'Content-Type': 'application/json',
              'X-Cache': 'HIT',
              'X-Circuit': circuitState,
              'X-Request-Id': requestId,
            } 
          }
        )
      }
      logger.info('Cache miss', { 
        symbol: symbol || undefined,
        cache_status: 'miss',
      })
      // Record cache miss (background)
      supabase.rpc('increment_cache_stat', { p_cache_name: 'stocktwits_proxy', p_column: 'misses' })
    }

    // Check circuit breaker before making upstream request
    if (!canMakeRequest(CIRCUIT_ID)) {
      logger.warn('Circuit breaker open', { 
        symbol: symbol || undefined,
        circuit_state: 'open',
      })
      
      // Try to serve stale cache as fallback
      const staleCache = await getCachedResponse(supabase, cacheKey, true)
      if (staleCache) {
        logger.info('Serving stale cache fallback', { 
          symbol: symbol || undefined,
          cache_status: 'stale',
          circuit_state: 'open',
        })
        // Record stale hit (background)
        supabase.rpc('increment_cache_stat', { p_cache_name: 'stocktwits_proxy', p_column: 'stale_hits' })
        
        // Record metrics
        requestTimer.record(supabase, {
          metric_type: 'api_latency',
          function_name: 'stocktwits-proxy',
          endpoint: action,
          symbol: symbol || undefined,
          cache_status: 'stale',
          circuit_state: 'open',
          status_code: 200,
        })
        
        logger.endRequest(startTime, 200)
        
        return new Response(
          JSON.stringify({ ...staleCache.data as object, _degraded: true, _reason: 'circuit_open' }),
          { 
            status: 200, 
            headers: { 
              ...corsHeaders, 
              'Content-Type': 'application/json',
              'X-Cache': 'STALE',
              'X-Circuit': 'OPEN',
              'X-Degraded': 'true',
              'X-Request-Id': requestId,
            } 
          }
        )
      }
      
      // No cache available - return service unavailable
      logger.error('Circuit open with no cache fallback', { 
        symbol: symbol || undefined,
        circuit_state: 'open',
      })
      
      // Record metrics
      requestTimer.record(supabase, {
        metric_type: 'api_latency',
        function_name: 'stocktwits-proxy',
        endpoint: action,
        symbol: symbol || undefined,
        circuit_state: 'open',
        status_code: 503,
      })
      
      logger.endRequest(startTime, 503)
      
      return new Response(
        JSON.stringify({ 
          error: 'Service temporarily unavailable',
          retryAfter: 30,
          _circuit: 'open'
        }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-Circuit': 'OPEN', 'X-Request-Id': requestId } }
      )
    }

    const targetUrl = `${STOCKTWITS_BASE_URL}${endpoint}?${queryParams.toString()}`
    
    const fetchOptions: RequestInit = {
      method: action === 'analyze' ? 'POST' : 'GET',
      headers: {
        'x-api-key': stocktwitsApiKey,
        'Content-Type': 'application/json',
      },
    }

    // For POST requests, forward the body
    if (action === 'analyze' && req.method === 'POST') {
      const body = await req.json()
      fetchOptions.body = JSON.stringify(body)
    }

    // Track upstream call timing
    const upstreamTimer = createTimer()
    const response = await fetch(targetUrl, fetchOptions)
    
    // Record upstream call metric
    upstreamTimer.record(supabase, {
      metric_type: 'upstream_call',
      function_name: 'stocktwits-proxy',
      endpoint: action,
      symbol: symbol || undefined,
      status_code: response.status,
    })
    
    // Check content-type to handle non-JSON responses gracefully
    const contentType = response.headers.get('content-type') || ''
    const responseText = await response.text()
    
    // Detect non-JSON responses (HTML error pages, rate limit pages)
    const isNonJsonResponse = !contentType.includes('application/json') || 
      responseText.startsWith('<!DOCTYPE') || 
      responseText.startsWith('<')

    // Check if this is a circuit-trip error
    if (isCircuitTripError(response.status, isNonJsonResponse)) {
      recordFailure(CIRCUIT_ID)
      logger.warn('Circuit failure recorded', { 
        symbol: symbol || undefined,
        status_code: response.status,
        non_json_response: isNonJsonResponse,
      })
      
      // Report error
      await reportError(supabase, {
        error_type: 'edge_function',
        error_code: String(response.status),
        error_message: `Upstream API returned ${response.status}`,
        function_name: 'stocktwits-proxy',
        request_id: requestId,
        symbol: symbol || undefined,
        request_path: '/functions/v1/stocktwits-proxy',
        request_method: 'GET',
        request_params: { action, symbol },
        severity: response.status >= 500 ? 'error' : 'warning',
      })
      
      // Try stale cache fallback
      const staleCache = await getCachedResponse(supabase, cacheKey, true)
      if (staleCache) {
        logger.info('Serving stale cache after upstream failure', { 
          symbol: symbol || undefined,
          cache_status: 'stale',
        })
        
        requestTimer.record(supabase, {
          metric_type: 'api_latency',
          function_name: 'stocktwits-proxy',
          endpoint: action,
          symbol: symbol || undefined,
          cache_status: 'stale',
          circuit_state: getCircuitStateLabel(CIRCUIT_ID),
          status_code: 200,
        })
        
        logger.endRequest(startTime, 200)
        
        return new Response(
          JSON.stringify({ ...staleCache.data as object, _degraded: true, _reason: 'upstream_error' }),
          { 
            status: 200, 
            headers: { 
              ...corsHeaders, 
              'Content-Type': 'application/json',
              'X-Cache': 'STALE',
              'X-Circuit': getCircuitStateLabel(CIRCUIT_ID),
              'X-Degraded': 'true',
              'X-Request-Id': requestId,
            } 
          }
        )
      }
    }

    // If response is not JSON (e.g., HTML error page), return a proper error
    if (isNonJsonResponse) {
      logger.error('Upstream returned non-JSON response', { 
        status_code: response.status,
        content_preview: responseText.substring(0, 200),
      })
      
      requestTimer.record(supabase, {
        metric_type: 'api_latency',
        function_name: 'stocktwits-proxy',
        endpoint: action,
        symbol: symbol || undefined,
        circuit_state: getCircuitStateLabel(CIRCUIT_ID),
        status_code: 502,
      })
      
      logger.endRequest(startTime, 502)
      
      return new Response(
        JSON.stringify({ 
          error: 'Upstream API temporarily unavailable',
          status: response.status,
          details: response.status === 429 ? 'Rate limited' : 'Service error'
        }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-Circuit': getCircuitStateLabel(CIRCUIT_ID), 'X-Request-Id': requestId } }
      )
    }
    
    // Try to parse JSON, with fallback error handling
    let data
    try {
      data = JSON.parse(responseText)
    } catch (parseError) {
      logger.error('Failed to parse JSON response', { 
        content_preview: responseText.substring(0, 200),
      })
      recordFailure(CIRCUIT_ID)
      
      requestTimer.record(supabase, {
        metric_type: 'api_latency',
        function_name: 'stocktwits-proxy',
        endpoint: action,
        symbol: symbol || undefined,
        circuit_state: getCircuitStateLabel(CIRCUIT_ID),
        status_code: 502,
      })
      
      logger.endRequest(startTime, 502)
      
      return new Response(
        JSON.stringify({ error: 'Invalid response from upstream API' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-Circuit': getCircuitStateLabel(CIRCUIT_ID), 'X-Request-Id': requestId } }
      )
    }

    // Successful response - record success and cache
    recordSuccess(CIRCUIT_ID)
    
    logger.info('Upstream request successful', { 
      symbol: symbol || undefined,
      status_code: response.status,
      circuit_state: getCircuitStateLabel(CIRCUIT_ID) as 'closed' | 'open' | 'half-open',
    })

    // Cache successful responses
    if (response.ok && ttl > 0) {
      // Don't await - cache in background
      setCachedResponse(supabase, cacheKey, action!, symbol, data, ttl)
      
      // Occasionally cleanup old entries
      maybeCleanupCache(supabase)
    }

    // Record final metrics
    requestTimer.record(supabase, {
      metric_type: 'api_latency',
      function_name: 'stocktwits-proxy',
      endpoint: action,
      symbol: symbol || undefined,
      cache_status: 'miss',
      circuit_state: getCircuitStateLabel(CIRCUIT_ID),
      status_code: response.status,
    })
    
    logger.endRequest(startTime, response.status)

    return new Response(
      JSON.stringify(data),
      { 
        status: response.status,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'X-Cache': 'MISS',
          'X-Circuit': getCircuitStateLabel(CIRCUIT_ID),
          'X-Request-Id': requestId,
        } 
      }
    )
  } catch (error: unknown) {
    logger.error('Unhandled error', { 
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    })
    recordFailure(CIRCUIT_ID)
    
    // Report error
    await reportError(supabase, {
      error_type: 'edge_function',
      error_code: 'UNHANDLED_ERROR',
      error_message: error instanceof Error ? error.message : 'Unknown error',
      stack_trace: error instanceof Error ? error.stack : undefined,
      function_name: 'stocktwits-proxy',
      request_id: requestId,
      request_path: '/functions/v1/stocktwits-proxy',
      request_method: req.method,
      severity: 'error',
    })
    
    // Record metrics
    requestTimer.record(supabase, {
      metric_type: 'api_latency',
      function_name: 'stocktwits-proxy',
      circuit_state: getCircuitStateLabel(CIRCUIT_ID),
      status_code: 500,
    })
    
    logger.endRequest(startTime, 500)
    
    const message = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-Circuit': getCircuitStateLabel(CIRCUIT_ID), 'X-Request-Id': requestId } }
    )
  }
})
