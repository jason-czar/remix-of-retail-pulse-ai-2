import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const STOCKTWITS_BASE_URL = 'https://srwjqgmqqsuazsczmywh.supabase.co'

// Cache TTL configuration (in seconds)
const CACHE_TTL = {
  trending: 60,      // 1 minute - trending data changes frequently
  stats: 30,         // 30 seconds - stats can shift quickly
  messages: 60,      // 1 minute - balance freshness vs API load
  sentiment: 60,     // 1 minute
  analytics: 120,    // 2 minutes - aggregated data, less volatile
  analyze: 0,        // No caching for analysis requests
} as const

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

// Try to get cached response
async function getCachedResponse(supabase: ReturnType<typeof getSupabaseClient>, cacheKey: string): Promise<unknown | null> {
  try {
    const { data, error } = await supabase
      .from('stocktwits_response_cache')
      .select('response_data, expires_at')
      .eq('cache_key', cacheKey)
      .single()
    
    if (error || !data) return null
    
    // Check if expired
    if (new Date(data.expires_at) < new Date()) {
      // Delete expired entry async (don't wait)
      supabase.from('stocktwits_response_cache').delete().eq('cache_key', cacheKey)
      return null
    }
    
    return data.response_data
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
    console.error('Failed to cache response:', error)
  }
}

// Periodically cleanup old cache entries (run occasionally)
async function maybeCleanupCache(supabase: ReturnType<typeof getSupabaseClient>): Promise<void> {
  // Only run cleanup ~5% of requests to avoid overhead
  if (Math.random() > 0.05) return
  
  try {
    await supabase.rpc('cleanup_stocktwits_cache')
    console.log('Cache cleanup executed')
  } catch (error) {
    console.error('Cache cleanup failed:', error)
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const stocktwitsApiKey = Deno.env.get('STOCKTWITS_API_KEY')
    if (!stocktwitsApiKey) {
      return new Response(
        JSON.stringify({ error: 'StockTwits API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get the request URL and parse the action
    const url = new URL(req.url)
    const action = url.searchParams.get('action')
    const symbol = url.searchParams.get('symbol')
    const type = url.searchParams.get('type')
    const limit = url.searchParams.get('limit') || '50'

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
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }

    // Get cache TTL for this action
    const ttl = CACHE_TTL[action as keyof typeof CACHE_TTL] ?? 0
    const cacheKey = generateCacheKey(action!, cacheKeyParams)
    
    // Initialize Supabase client for caching
    const supabase = getSupabaseClient()
    
    // Try to get cached response first (skip for analyze/POST requests)
    if (ttl > 0 && req.method !== 'POST') {
      const cached = await getCachedResponse(supabase, cacheKey)
      if (cached) {
        console.log(`[Cache HIT] ${action} - ${cacheKey}`)
        return new Response(
          JSON.stringify(cached),
          { 
            status: 200,
            headers: { 
              ...corsHeaders, 
              'Content-Type': 'application/json',
              'X-Cache': 'HIT',
            } 
          }
        )
      }
      console.log(`[Cache MISS] ${action} - ${cacheKey}`)
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

    const response = await fetch(targetUrl, fetchOptions)
    
    // Check content-type to handle non-JSON responses gracefully
    const contentType = response.headers.get('content-type') || ''
    const responseText = await response.text()
    
    // If response is not JSON (e.g., HTML error page), return a proper error
    if (!contentType.includes('application/json') || responseText.startsWith('<!DOCTYPE') || responseText.startsWith('<')) {
      console.error(`Upstream API returned non-JSON response (status ${response.status}):`, responseText.substring(0, 500))
      return new Response(
        JSON.stringify({ 
          error: 'Upstream API temporarily unavailable',
          status: response.status,
          details: response.status === 429 ? 'Rate limited' : 'Service error'
        }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    // Try to parse JSON, with fallback error handling
    let data
    try {
      data = JSON.parse(responseText)
    } catch (parseError) {
      console.error('Failed to parse JSON response:', responseText.substring(0, 500))
      return new Response(
        JSON.stringify({ error: 'Invalid response from upstream API' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Cache successful responses
    if (response.ok && ttl > 0) {
      // Don't await - cache in background
      setCachedResponse(supabase, cacheKey, action!, symbol, data, ttl)
      
      // Occasionally cleanup old entries
      maybeCleanupCache(supabase)
    }

    return new Response(
      JSON.stringify(data),
      { 
        status: response.status,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'X-Cache': 'MISS',
        } 
      }
    )
  } catch (error: unknown) {
    console.error('StockTwits proxy error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
