import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!

    const supabase = createClient(supabaseUrl, supabaseAnonKey)

    const url = new URL(req.url)
    const symbol = url.searchParams.get('symbol')
    const days = parseInt(url.searchParams.get('days') || '30')
    const compareSymbols = url.searchParams.get('compare')?.split(',').filter(Boolean) || []

    if (!symbol) {
      return new Response(
        JSON.stringify({ error: 'Symbol is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    // Fetch history for primary symbol
    const { data: primaryHistory, error: primaryError } = await supabase
      .from('sentiment_history')
      .select('*')
      .eq('symbol', symbol.toUpperCase())
      .gte('recorded_at', startDate.toISOString())
      .order('recorded_at', { ascending: true })

    if (primaryError) {
      throw primaryError
    }

    // Calculate statistics
    const history = primaryHistory || []
    const stats = calculateStats(history)

    // Fetch comparison data if requested
    let comparison: Record<string, any> = {}
    if (compareSymbols.length > 0) {
      const comparisonPromises = compareSymbols.map(async (compareSymbol) => {
        const { data: compareHistory } = await supabase
          .from('sentiment_history')
          .select('*')
          .eq('symbol', compareSymbol.toUpperCase())
          .gte('recorded_at', startDate.toISOString())
          .order('recorded_at', { ascending: true })

        return {
          symbol: compareSymbol.toUpperCase(),
          history: compareHistory || [],
          stats: calculateStats(compareHistory || []),
        }
      })

      const comparisonResults = await Promise.all(comparisonPromises)
      comparisonResults.forEach(result => {
        comparison[result.symbol] = {
          history: result.history,
          stats: result.stats,
        }
      })
    }

    // Calculate momentum (sentiment change over period)
    const momentum = calculateMomentum(history)

    return new Response(
      JSON.stringify({
        symbol: symbol.toUpperCase(),
        history,
        stats,
        momentum,
        comparison: Object.keys(comparison).length > 0 ? comparison : undefined,
        period: {
          start: startDate.toISOString(),
          end: new Date().toISOString(),
          days,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Get sentiment history error:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

function calculateStats(history: any[]) {
  if (history.length === 0) {
    return {
      avgSentiment: 0,
      minSentiment: 0,
      maxSentiment: 0,
      avgVolume: 0,
      totalVolume: 0,
      dataPoints: 0,
      volatility: 0,
    }
  }

  const sentiments = history.map(h => h.sentiment_score)
  const volumes = history.map(h => h.message_volume)

  const avgSentiment = sentiments.reduce((a, b) => a + b, 0) / sentiments.length
  const minSentiment = Math.min(...sentiments)
  const maxSentiment = Math.max(...sentiments)
  const avgVolume = volumes.reduce((a, b) => a + b, 0) / volumes.length
  const totalVolume = volumes.reduce((a, b) => a + b, 0)

  // Calculate volatility (standard deviation of sentiment)
  const variance = sentiments.reduce((sum, val) => sum + Math.pow(val - avgSentiment, 2), 0) / sentiments.length
  const volatility = Math.sqrt(variance)

  return {
    avgSentiment: Math.round(avgSentiment * 100) / 100,
    minSentiment,
    maxSentiment,
    avgVolume: Math.round(avgVolume),
    totalVolume,
    dataPoints: history.length,
    volatility: Math.round(volatility * 100) / 100,
  }
}

function calculateMomentum(history: any[]) {
  if (history.length < 2) {
    return {
      direction: 'neutral' as const,
      change: 0,
      trend: 'insufficient data',
    }
  }

  const recentCount = Math.min(7, Math.floor(history.length / 2))
  const olderCount = recentCount

  const recentData = history.slice(-recentCount)
  const olderData = history.slice(-(recentCount + olderCount), -recentCount)

  if (olderData.length === 0) {
    return {
      direction: 'neutral' as const,
      change: 0,
      trend: 'insufficient data',
    }
  }

  const recentAvg = recentData.reduce((a, b) => a + b.sentiment_score, 0) / recentData.length
  const olderAvg = olderData.reduce((a, b) => a + b.sentiment_score, 0) / olderData.length

  const change = recentAvg - olderAvg
  const percentChange = olderAvg !== 0 ? (change / olderAvg) * 100 : 0

  let direction: 'bullish' | 'bearish' | 'neutral' = 'neutral'
  let trend = 'stable'

  if (change > 5) {
    direction = 'bullish'
    trend = change > 10 ? 'strong upward' : 'upward'
  } else if (change < -5) {
    direction = 'bearish'
    trend = change < -10 ? 'strong downward' : 'downward'
  }

  return {
    direction,
    change: Math.round(change * 100) / 100,
    percentChange: Math.round(percentChange * 100) / 100,
    trend,
    recentAvg: Math.round(recentAvg * 100) / 100,
    olderAvg: Math.round(olderAvg * 100) / 100,
  }
}