import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const STOCKTWITS_BASE_URL = 'https://srwjqgmqqsuazsczmywh.supabase.co'

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
        break
      }
      
      case 'sentiment':
        endpoint = '/functions/v1/stocktwits-sentiment'
        if (symbol) queryParams.set('symbol', symbol)
        break
      
      case 'trending':
        endpoint = '/functions/v1/stocktwits-trending'
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
    const data = await response.json()

    return new Response(
      JSON.stringify(data),
      { 
        status: response.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
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