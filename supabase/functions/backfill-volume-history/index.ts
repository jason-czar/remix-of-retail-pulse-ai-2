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
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get symbols to backfill from request or use defaults
    const body = await req.json().catch(() => ({}))
    const symbols: string[] = body.symbols || ['AAPL', 'NVDA', 'BABA', 'JPM', 'GLD', 'SLV', 'NFLX']
    const daysToBackfill = body.days || 30

    console.log(`Backfilling volume history for ${symbols.length} symbols over ${daysToBackfill} days`)

    const results: { symbol: string; records: number; error?: string }[] = []

    for (const symbol of symbols) {
      try {
        // Fetch current volume data from stocktwits-proxy
        const volumeResponse = await fetch(
          `${supabaseUrl}/functions/v1/stocktwits-proxy?action=analytics&symbol=${symbol}&type=volume`,
          {
            headers: {
              'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
              'Content-Type': 'application/json',
            },
          }
        )

        if (!volumeResponse.ok) {
          throw new Error(`Volume fetch failed: ${volumeResponse.status}`)
        }

        const volumeData = await volumeResponse.json()
        const hourlyDistribution = volumeData?.hourlyDistribution || []
        
        // Calculate total daily volume
        const totalVolume = hourlyDistribution.reduce(
          (sum: number, h: any) => sum + (h.count || 0), 
          0
        )

        if (totalVolume === 0) {
          console.log(`No volume data for ${symbol}, skipping`)
          results.push({ symbol, records: 0 })
          continue
        }

        // Insert current snapshot into volume_history
        const now = new Date()
        const { error: insertError } = await supabase
          .from('volume_history')
          .insert({
            symbol,
            period_type: 'hourly',
            message_count: totalVolume,
            daily_volume: totalVolume,
            hourly_distribution: hourlyDistribution,
            recorded_at: now.toISOString(),
          })

        if (insertError) {
          // Check if duplicate
          if (insertError.code !== '23505') {
            throw insertError
          }
        }

        // Update volume_cache with 2-hour TTL
        const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString()
        await supabase
          .from('volume_cache')
          .upsert({
            symbol,
            time_range: '24H',
            hourly_data: hourlyDistribution,
            daily_data: [],
            message_count: totalVolume,
            expires_at: expiresAt,
          }, { onConflict: 'symbol,time_range' })

        // Also update 7D and 30D cache with aggregated data
        for (const range of ['7D', '30D']) {
          await supabase
            .from('volume_cache')
            .upsert({
              symbol,
              time_range: range,
              hourly_data: [],
              daily_data: [{ date: now.toISOString().split('T')[0], volume: totalVolume }],
              message_count: totalVolume,
              expires_at: expiresAt,
            }, { onConflict: 'symbol,time_range' })
        }

        results.push({ symbol, records: 1 })
        console.log(`Backfilled ${symbol}: ${totalVolume} total messages`)

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 300))
      } catch (error) {
        console.error(`Error backfilling ${symbol}:`, error)
        results.push({ 
          symbol, 
          records: 0, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        })
      }
    }

    const totalRecords = results.reduce((sum, r) => sum + r.records, 0)

    return new Response(
      JSON.stringify({
        success: true,
        message: `Backfilled volume history for ${symbols.length} symbols`,
        total_records: totalRecords,
        results,
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  } catch (error) {
    console.error('Backfill error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})
