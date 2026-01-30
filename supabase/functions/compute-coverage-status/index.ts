import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { symbol, dates } = await req.json();

    if (!symbol) {
      return new Response(
        JSON.stringify({ error: 'Symbol is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Computing coverage for ${symbol}`, dates ? `dates: ${dates.join(', ')}` : 'last 30 days');

    // Determine date range
    let targetDates: string[];
    if (dates && dates.length > 0) {
      targetDates = dates;
    } else {
      // Default: last 30 days
      const today = new Date();
      targetDates = [];
      for (let i = 0; i < 30; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        targetDates.push(d.toISOString().split('T')[0]);
      }
    }

    const results = [];

    for (const date of targetDates) {
      // Check for messages (sentiment_history records for this date)
      const { data: sentimentData, error: sentimentError } = await supabase
        .from('sentiment_history')
        .select('message_volume')
        .eq('symbol', symbol)
        .gte('recorded_at', `${date}T00:00:00Z`)
        .lt('recorded_at', `${date}T23:59:59Z`);

      if (sentimentError) {
        console.error(`Error fetching sentiment for ${date}:`, sentimentError);
        continue;
      }

      const hasMessages = sentimentData && sentimentData.length > 0;
      const messageCount = sentimentData?.reduce((sum, r) => sum + (r.message_volume || 0), 0) || 0;

      // Check for analytics (narrative_history AND emotion_history)
      const { data: narrativeData } = await supabase
        .from('narrative_history')
        .select('id')
        .eq('symbol', symbol)
        .gte('recorded_at', `${date}T00:00:00Z`)
        .lt('recorded_at', `${date}T23:59:59Z`)
        .limit(1);

      const { data: emotionData } = await supabase
        .from('emotion_history')
        .select('id')
        .eq('symbol', symbol)
        .gte('recorded_at', `${date}T00:00:00Z`)
        .lt('recorded_at', `${date}T23:59:59Z`)
        .limit(1);

      const hasAnalytics = (narrativeData && narrativeData.length > 0) || 
                           (emotionData && emotionData.length > 0);

      // Check for psychology snapshots (critical for Decision Readiness)
      const { data: psychologyData } = await supabase
        .from('psychology_snapshots')
        .select('id')
        .eq('symbol', symbol)
        .gte('snapshot_start', `${date}T00:00:00Z`)
        .lt('snapshot_start', `${date}T23:59:59Z`)
        .limit(1);

      const hasPsychology = psychologyData && psychologyData.length > 0;

      // Check for price history (required for narrative outcomes)
      const { data: priceData } = await supabase
        .from('price_history')
        .select('id')
        .eq('symbol', symbol)
        .eq('date', date)
        .limit(1);

      const hasPrice = priceData && priceData.length > 0;

      // Upsert coverage record
      const { error: upsertError } = await supabase
        .from('symbol_daily_coverage')
        .upsert({
          symbol,
          date,
          has_messages: hasMessages,
          has_analytics: hasAnalytics,
          has_psychology: hasPsychology,
          has_price: hasPrice,
          message_count: messageCount,
          last_updated: new Date().toISOString(),
        }, { onConflict: 'symbol,date' });

      if (upsertError) {
        console.error(`Error upserting coverage for ${date}:`, upsertError);
      } else {
        results.push({ date, hasMessages, hasAnalytics, hasPsychology, hasPrice, messageCount });
      }
    }

    console.log(`Computed coverage for ${results.length} dates`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        symbol,
        datesProcessed: results.length,
        results 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error computing coverage:', error);
    const errMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
