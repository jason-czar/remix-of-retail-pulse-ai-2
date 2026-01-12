import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SentimentSnapshot {
  symbol: string
  sentiment_score: number
  bullish_count: number
  bearish_count: number
  neutral_count: number
  message_volume: number
  dominant_emotion?: string
  dominant_narrative?: string
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const stocktwitsApiKey = Deno.env.get('STOCKTWITS_API_KEY')

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get symbols to track - from request body or default to trending
    let symbols: string[] = []
    
    if (req.method === 'POST') {
      const body = await req.json().catch(() => ({}))
      symbols = body.symbols || []
    }

    // If no symbols provided, get trending symbols
    if (symbols.length === 0) {
      console.log('Fetching trending symbols...')
      const trendingResponse = await fetch(
        `${supabaseUrl}/functions/v1/stocktwits-proxy?action=trending`,
        {
          headers: {
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
            'Content-Type': 'application/json',
          },
        }
      )
      
      if (trendingResponse.ok) {
        const trendingData = await trendingResponse.json()
        symbols = (trendingData.trending || []).slice(0, 20).map((t: any) => t.symbol)
      }
    }

    // Also get symbols from watchlists
    const { data: watchlists } = await supabase
      .from('watchlists')
      .select('symbols')
    
    if (watchlists) {
      const watchlistSymbols = watchlists.flatMap(w => w.symbols || [])
      symbols = [...new Set([...symbols, ...watchlistSymbols])]
    }

    console.log(`Recording snapshots for ${symbols.length} symbols:`, symbols)

    const snapshots: SentimentSnapshot[] = []
    const errors: string[] = []

    // Process symbols in batches of 5 to avoid rate limiting
    const batchSize = 5
    for (let i = 0; i < symbols.length; i += batchSize) {
      const batch = symbols.slice(i, i + batchSize)
      
      const batchPromises = batch.map(async (symbol) => {
        try {
          // Get sentiment stats for symbol
          const statsResponse = await fetch(
            `${supabaseUrl}/functions/v1/stocktwits-proxy?action=stats&symbol=${symbol}`,
            {
              headers: {
                'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
                'Content-Type': 'application/json',
              },
            }
          )

          if (!statsResponse.ok) {
            throw new Error(`Stats fetch failed: ${statsResponse.status}`)
          }

          const stats = await statsResponse.json()
          
          // Get emotion analysis from cache
          const { data: emotionCache } = await supabase
            .from('emotion_cache')
            .select('emotions')
            .eq('symbol', symbol)
            .eq('time_range', '24H')
            .gt('expires_at', new Date().toISOString())
            .maybeSingle()

          // Get narrative analysis from cache
          const { data: narrativeCache } = await supabase
            .from('narrative_cache')
            .select('narratives')
            .eq('symbol', symbol)
            .eq('time_range', '24H')
            .gt('expires_at', new Date().toISOString())
            .maybeSingle()

          // Extract dominant emotion
          let dominantEmotion: string | undefined
          if (emotionCache?.emotions) {
            const emotions = emotionCache.emotions as any
            if (emotions.current && Array.isArray(emotions.current)) {
              const sorted = [...emotions.current].sort((a: any, b: any) => b.score - a.score)
              dominantEmotion = sorted[0]?.emotion
            }
          }

          // Extract dominant narrative
          let dominantNarrative: string | undefined
          if (narrativeCache?.narratives && Array.isArray(narrativeCache.narratives)) {
            const narratives = narrativeCache.narratives as any[]
            if (narratives.length > 0) {
              dominantNarrative = narratives[0].name
            }
          }

          const snapshot: SentimentSnapshot = {
            symbol,
            sentiment_score: stats.sentiment || 50,
            bullish_count: stats.bullishCount || 0,
            bearish_count: stats.bearishCount || 0,
            neutral_count: stats.neutralCount || 0,
            message_volume: parseInt(stats.volume?.replace(/[^\d]/g, '') || '0') || 0,
            dominant_emotion: dominantEmotion,
            dominant_narrative: dominantNarrative,
          }

          return snapshot
        } catch (error) {
          console.error(`Error processing ${symbol}:`, error)
          errors.push(`${symbol}: ${error instanceof Error ? error.message : 'Unknown error'}`)
          return null
        }
      })

      const batchResults = await Promise.all(batchPromises)
      snapshots.push(...batchResults.filter((s): s is SentimentSnapshot => s !== null))
      
      // Small delay between batches
      if (i + batchSize < symbols.length) {
        await new Promise(resolve => setTimeout(resolve, 500))
      }
    }

    // Insert all snapshots
    if (snapshots.length > 0) {
      const { error: insertError } = await supabase
        .from('sentiment_history')
        .insert(snapshots.map(s => ({
          symbol: s.symbol,
          sentiment_score: s.sentiment_score,
          bullish_count: s.bullish_count,
          bearish_count: s.bearish_count,
          neutral_count: s.neutral_count,
          message_volume: s.message_volume,
          dominant_emotion: s.dominant_emotion,
          dominant_narrative: s.dominant_narrative,
          recorded_at: new Date().toISOString(),
        })))

      if (insertError) {
        console.error('Insert error:', insertError)
        return new Response(
          JSON.stringify({ error: 'Failed to insert snapshots', details: insertError }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        recorded: snapshots.length,
        symbols: snapshots.map(s => s.symbol),
        errors: errors.length > 0 ? errors : undefined,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Snapshot recording error:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})