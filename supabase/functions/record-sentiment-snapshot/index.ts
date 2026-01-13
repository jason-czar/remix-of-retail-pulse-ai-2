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

interface EmotionScore {
  name: string
  score: number
}

// Signal emotions for market psychology
const FEAR_EMOTIONS = ['Fear', 'Capitulation', 'Regret']
const GREED_EMOTIONS = ['FOMO', 'Greed', 'Euphoria', 'Excitement']

function calculateFearGreedIndex(emotions: EmotionScore[]): number {
  let fearScore = 0
  let greedScore = 0

  emotions.forEach((e) => {
    if (FEAR_EMOTIONS.includes(e.name)) {
      fearScore += e.score
    } else if (GREED_EMOTIONS.includes(e.name)) {
      greedScore += e.score
    }
  })

  const total = fearScore + greedScore
  if (total === 0) return 50

  return Math.round((greedScore / total) * 100)
}

function getFearGreedLabel(index: number): string {
  if (index <= 20) return 'Extreme Fear'
  if (index <= 40) return 'Fear'
  if (index <= 60) return 'Neutral'
  if (index <= 80) return 'Greed'
  return 'Extreme Greed'
}

function getSignalStrength(emotions: EmotionScore[]): string {
  const signalEmotions = ['FOMO', 'Greed', 'Fear', 'Capitulation', 'Euphoria', 'Regret']
  const maxScore = Math.max(...emotions.filter(e => signalEmotions.includes(e.name)).map(e => e.score), 0)
  if (maxScore >= 30) return 'extreme'
  if (maxScore >= 20) return 'strong'
  if (maxScore >= 10) return 'moderate'
  return 'weak'
}

function generateSignals(emotions: EmotionScore[], fearGreedIndex: number): any[] {
  const signals: any[] = []

  const fomo = emotions.find((e) => e.name === 'FOMO')
  const fear = emotions.find((e) => e.name === 'Fear')
  const capitulation = emotions.find((e) => e.name === 'Capitulation')
  const euphoria = emotions.find((e) => e.name === 'Euphoria')
  const greed = emotions.find((e) => e.name === 'Greed')

  if (capitulation && capitulation.score >= 15) {
    signals.push({
      type: 'bullish',
      label: 'Capitulation Detected',
      description: 'High capitulation suggests potential market bottom',
      confidence: Math.min(90, 50 + capitulation.score * 2),
    })
  }

  if (euphoria && euphoria.score >= 20) {
    signals.push({
      type: 'bearish',
      label: 'Euphoria Warning',
      description: 'Extreme optimism may signal a market top',
      confidence: Math.min(85, 45 + euphoria.score * 2),
    })
  }

  if (fomo && fomo.score >= 25) {
    signals.push({
      type: 'bearish',
      label: 'FOMO Surge',
      description: 'Fear of missing out at elevated levels',
      confidence: Math.min(80, 40 + fomo.score * 1.5),
    })
  }

  if (fear && fear.score >= 25 && fearGreedIndex < 30) {
    signals.push({
      type: 'bullish',
      label: 'Extreme Fear',
      description: 'Be greedy when others are fearful',
      confidence: Math.min(85, 45 + fear.score * 1.5),
    })
  }

  if (greed && greed.score >= 20 && fearGreedIndex > 70) {
    signals.push({
      type: 'bearish',
      label: 'Greed Alert',
      description: 'Elevated greed levels suggest caution',
      confidence: Math.min(75, 40 + greed.score * 1.5),
    })
  }

  return signals.sort((a, b) => b.confidence - a.confidence).slice(0, 3)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

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

    // Get all watchlists with user info for psychology snapshots
    const { data: watchlists } = await supabase
      .from('watchlists')
      .select('user_id, symbols')
    
    // Collect unique symbols from watchlists
    if (watchlists) {
      const watchlistSymbols = watchlists.flatMap(w => w.symbols || [])
      symbols = [...new Set([...symbols, ...watchlistSymbols])]
    }

    console.log(`Recording snapshots for ${symbols.length} symbols:`, symbols)

    const snapshots: SentimentSnapshot[] = []
    const volumeSnapshots: any[] = []
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
          
          // Also fetch volume analytics for volume history
          let volumeData: any = null
          try {
            const volumeResponse = await fetch(
              `${supabaseUrl}/functions/v1/stocktwits-proxy?action=analytics&symbol=${symbol}&type=volume`,
              {
                headers: {
                  'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
                  'Content-Type': 'application/json',
                },
              }
            )
            if (volumeResponse.ok) {
              volumeData = await volumeResponse.json()
            }
          } catch (e) {
            console.error(`Volume fetch failed for ${symbol}:`, e)
          }
          
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

          const messageVolume = parseInt(stats.volume?.replace(/[^\d]/g, '') || '0') || 0

          const snapshot: SentimentSnapshot = {
            symbol,
            sentiment_score: stats.sentiment || 50,
            bullish_count: stats.bullishCount || 0,
            bearish_count: stats.bearishCount || 0,
            neutral_count: stats.neutralCount || 0,
            message_volume: messageVolume,
            dominant_emotion: dominantEmotion,
            dominant_narrative: dominantNarrative,
          }

          // Create volume snapshot
          const volumeSnapshot = {
            symbol,
            period_type: 'daily',
            message_count: messageVolume,
            daily_volume: messageVolume,
            hourly_distribution: volumeData?.hourlyDistribution || [],
          }

          return { sentiment: snapshot, volume: volumeSnapshot }
        } catch (error) {
          console.error(`Error processing ${symbol}:`, error)
          errors.push(`${symbol}: ${error instanceof Error ? error.message : 'Unknown error'}`)
          return null
        }
      })

      const batchResults = await Promise.all(batchPromises)
      for (const result of batchResults) {
        if (result) {
          snapshots.push(result.sentiment)
          volumeSnapshots.push(result.volume)
        }
      }
      
      // Small delay between batches
      if (i + batchSize < symbols.length) {
        await new Promise(resolve => setTimeout(resolve, 500))
      }
    }

    // Insert sentiment snapshots
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
        console.error('Sentiment insert error:', insertError)
      }
    }

    // Insert volume history snapshots
    let volumeRecorded = 0
    if (volumeSnapshots.length > 0) {
      const { error: volumeError } = await supabase
        .from('volume_history')
        .insert(volumeSnapshots.map(v => ({
          symbol: v.symbol,
          period_type: v.period_type,
          message_count: v.message_count,
          daily_volume: v.daily_volume,
          hourly_distribution: v.hourly_distribution,
          recorded_at: new Date().toISOString(),
        })))

      if (volumeError) {
        console.error('Volume history insert error:', volumeError)
      } else {
        volumeRecorded = volumeSnapshots.length
      }

      // Update volume cache with 2-hour TTL
      const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString()
      for (const v of volumeSnapshots) {
        await supabase
          .from('volume_cache')
          .upsert({
            symbol: v.symbol,
            time_range: '24H',
            hourly_data: v.hourly_distribution,
            daily_data: [],
            message_count: v.message_count,
            expires_at: expiresAt,
          }, { onConflict: 'symbol,time_range' })
      }

      // Update sentiment cache
      for (const s of snapshots) {
        await supabase
          .from('sentiment_cache')
          .upsert({
            symbol: s.symbol,
            time_range: '24H',
            hourly_data: [],
            daily_data: [],
            current_score: s.sentiment_score,
            expires_at: expiresAt,
          }, { onConflict: 'symbol,time_range' })
      }
    }

    console.log(`Recorded ${volumeRecorded} volume snapshots`)

    // ============================================
    // MARKET PSYCHOLOGY SNAPSHOTS FOR EACH USER
    // ============================================
    
    let psychologyRecorded = 0
    
    if (watchlists && watchlists.length > 0) {
      console.log(`Recording psychology snapshots for ${watchlists.length} user watchlists...`)
      
      // Group watchlists by user_id (in case of multiple watchlists per user)
      const userWatchlists = new Map<string, string[]>()
      for (const watchlist of watchlists) {
        if (!watchlist.user_id || !watchlist.symbols?.length) continue
        const existing = userWatchlists.get(watchlist.user_id) || []
        userWatchlists.set(watchlist.user_id, [...new Set([...existing, ...watchlist.symbols])])
      }
      
      for (const [userId, userSymbols] of userWatchlists) {
        try {
          // Check if we already have a snapshot for today
          const today = new Date()
          today.setHours(0, 0, 0, 0)
          const tomorrow = new Date(today)
          tomorrow.setDate(tomorrow.getDate() + 1)
          
          const { data: existingSnapshot } = await supabase
            .from('market_psychology_history')
            .select('id')
            .eq('user_id', userId)
            .gte('recorded_at', today.toISOString())
            .lt('recorded_at', tomorrow.toISOString())
            .limit(1)
          
          // Collect emotion data for user's symbols
          const emotionScores: Map<string, { total: number; count: number }> = new Map()
          
          for (const symbol of userSymbols) {
            const { data: emotionCache } = await supabase
              .from('emotion_cache')
              .select('emotions')
              .eq('symbol', symbol)
              .eq('time_range', '24H')
              .gt('expires_at', new Date().toISOString())
              .maybeSingle()
            
            if (emotionCache?.emotions) {
              const emotions = emotionCache.emotions as any
              const emotionList = emotions.current || emotions.emotions || []
              
              if (Array.isArray(emotionList)) {
                for (const e of emotionList) {
                  const name = e.emotion || e.name
                  const score = e.score || e.percentage || 0
                  if (name && typeof score === 'number') {
                    const existing = emotionScores.get(name) || { total: 0, count: 0 }
                    emotionScores.set(name, { 
                      total: existing.total + score, 
                      count: existing.count + 1 
                    })
                  }
                }
              }
            }
          }
          
          // Calculate aggregated emotions
          const aggregatedEmotions: EmotionScore[] = []
          for (const [name, { total, count }] of emotionScores) {
            aggregatedEmotions.push({
              name,
              score: Math.round(total / count),
            })
          }
          aggregatedEmotions.sort((a, b) => b.score - a.score)
          
          // Skip if no emotion data
          if (aggregatedEmotions.length === 0) continue
          
          // Calculate psychology metrics
          const fearGreedIndex = calculateFearGreedIndex(aggregatedEmotions)
          const fearGreedLabel = getFearGreedLabel(fearGreedIndex)
          const signalStrength = getSignalStrength(aggregatedEmotions)
          const signals = generateSignals(aggregatedEmotions, fearGreedIndex)
          
          // Find dominant signal emotion
          const signalEmotionNames = ['FOMO', 'Greed', 'Fear', 'Capitulation', 'Euphoria', 'Regret']
          const signalEmotions = aggregatedEmotions.filter(e => signalEmotionNames.includes(e.name))
          const dominantSignal = signalEmotions.length > 0 ? signalEmotions[0].name : null
          
          // Convert to emotion breakdown object
          const emotionBreakdown: Record<string, number> = {}
          for (const e of aggregatedEmotions) {
            emotionBreakdown[e.name] = e.score
          }
          
          const psychologyData = {
            user_id: userId,
            fear_greed_index: fearGreedIndex,
            fear_greed_label: fearGreedLabel,
            dominant_signal: dominantSignal,
            signal_strength: signalStrength,
            symbols: userSymbols,
            symbol_count: userSymbols.length,
            emotion_breakdown: emotionBreakdown,
            signals: signals,
            recorded_at: new Date().toISOString(),
          }
          
          if (existingSnapshot && existingSnapshot.length > 0) {
            // Update existing snapshot
            const { error } = await supabase
              .from('market_psychology_history')
              .update(psychologyData)
              .eq('id', existingSnapshot[0].id)
            
            if (!error) psychologyRecorded++
          } else {
            // Insert new snapshot
            const { error } = await supabase
              .from('market_psychology_history')
              .insert(psychologyData)
            
            if (!error) psychologyRecorded++
          }
        } catch (error) {
          console.error(`Error recording psychology for user ${userId}:`, error)
        }
      }
    }

    console.log(`Recorded ${psychologyRecorded} psychology snapshots`)

    return new Response(
      JSON.stringify({
        success: true,
        sentiment_recorded: snapshots.length,
        volume_recorded: volumeRecorded,
        psychology_recorded: psychologyRecorded,
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