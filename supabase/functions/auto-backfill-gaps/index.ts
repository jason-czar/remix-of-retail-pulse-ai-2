import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface StocktwitsMessage {
  id: string | number;
  body: string;
  created_at: string;
  sentiment?: {
    basic?: string;
  };
}

interface Narrative {
  name: string;
  count: number;
  sentiment: "bullish" | "bearish" | "neutral";
}

interface EmotionScore {
  name: string;
  score: number;
  percentage: number;
}

type IngestionType = 'messages' | 'analytics' | 'all';

// Check if a date is a weekday (Mon-Fri)
function isWeekday(date: Date): boolean {
  const day = date.getUTCDay();
  return day >= 1 && day <= 5;
}

// Generate all weekdays between start and end dates
function getWeekdaysInRange(startDate: Date, endDate: Date): string[] {
  const weekdays: string[] = [];
  const current = new Date(startDate);
  current.setUTCHours(0, 0, 0, 0);
  
  const end = new Date(endDate);
  end.setUTCHours(23, 59, 59, 999);
  
  while (current <= end) {
    if (isWeekday(current)) {
      weekdays.push(current.toISOString().split('T')[0]);
    }
    current.setUTCDate(current.getUTCDate() + 1);
  }
  
  return weekdays;
}

// Delay helper
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Compute sentiment aggregates from messages
function computeSentimentFromMessages(messages: StocktwitsMessage[]): {
  sentimentScore: number;
  bullishCount: number;
  bearishCount: number;
  neutralCount: number;
} {
  let bullish = 0, bearish = 0, neutral = 0;
  
  for (const msg of messages) {
    const sentiment = msg.sentiment?.basic?.toLowerCase();
    if (sentiment === 'bullish') bullish++;
    else if (sentiment === 'bearish') bearish++;
    else neutral++;
  }
  
  const total = bullish + bearish + neutral;
  if (total === 0) {
    return { sentimentScore: 50, bullishCount: 0, bearishCount: 0, neutralCount: 0 };
  }
  
  // Score: 0 = all bearish, 50 = neutral, 100 = all bullish
  const sentimentScore = Math.round(((bullish - bearish) / total + 1) * 50);
  
  return { sentimentScore, bullishCount: bullish, bearishCount: bearish, neutralCount: neutral };
}

// Get end-of-day timestamp for consistent alignment with other history tables
function getEndOfDayTimestamp(dateStr: string): string {
  const recordedAt = new Date(`${dateStr}T00:00:00Z`);
  recordedAt.setUTCHours(23, 59, 59, 999);
  return recordedAt.toISOString();
}

async function analyzeNarratives(messages: StocktwitsMessage[], apiKey: string): Promise<Narrative[]> {
  const messageContent = messages
    .slice(0, 100)
    .map((m, i) => `${i + 1}. ${m.body}`)
    .join("\n");

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        {
          role: "system",
          content: `You are a financial analyst specializing in identifying key narratives and themes from social media discussions about stocks. Analyze the messages and extract the main narratives being discussed.`,
        },
        {
          role: "user",
          content: `Analyze these ${messages.length} messages and identify the top 5 narratives:\n\n${messageContent}\n\nFor each narrative, provide:\n1. A short name (2-4 words)\n2. How many messages mention it (approximate count)\n3. Overall sentiment: bullish, bearish, or neutral`,
        },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "extract_narratives",
            description: "Extract narratives from messages",
            parameters: {
              type: "object",
              properties: {
                narratives: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      name: { type: "string" },
                      count: { type: "number" },
                      sentiment: { type: "string", enum: ["bullish", "bearish", "neutral"] },
                    },
                    required: ["name", "count", "sentiment"],
                  },
                },
              },
              required: ["narratives"],
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "extract_narratives" } },
    }),
  });

  if (!response.ok) {
    throw new Error(`AI API error: ${response.status}`);
  }

  const data = await response.json();
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
  
  if (toolCall?.function?.arguments) {
    const parsed = JSON.parse(toolCall.function.arguments);
    return parsed.narratives || [];
  }

  return [];
}

async function analyzeEmotions(messages: StocktwitsMessage[], apiKey: string): Promise<EmotionScore[]> {
  const EMOTIONS = [
    "Excitement", "Fear", "Greed", "Hope", "Frustration",
    "Confidence", "Uncertainty", "FOMO", "Relief", "Skepticism",
  ];

  const messageContent = messages
    .slice(0, 100)
    .map((m, i) => `${i + 1}. ${m.body}`)
    .join("\n");

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        {
          role: "system",
          content: `You are an expert at analyzing emotional sentiment in financial social media posts. Analyze the messages and score these emotions: ${EMOTIONS.join(", ")}`,
        },
        {
          role: "user",
          content: `Analyze these ${messages.length} messages for emotional content:\n\n${messageContent}\n\nScore each emotion from 0-100 based on prevalence.`,
        },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "extract_emotions",
            description: "Extract emotion scores from messages",
            parameters: {
              type: "object",
              properties: {
                emotions: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      name: { type: "string" },
                      score: { type: "number" },
                      percentage: { type: "number" },
                    },
                    required: ["name", "score", "percentage"],
                  },
                },
              },
              required: ["emotions"],
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "extract_emotions" } },
    }),
  });

  if (!response.ok) {
    throw new Error(`AI API error: ${response.status}`);
  }

  const data = await response.json();
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
  
  if (toolCall?.function?.arguments) {
    const parsed = JSON.parse(toolCall.function.arguments);
    return parsed.emotions || [];
  }

  return EMOTIONS.map((name) => ({ name, score: 50, percentage: 10 }));
}

// Extended trading hours for hourly backfill (5 AM - 6 PM ET)
const START_HOUR_ET = 5;
const END_HOUR_ET = 18;

// Get missing hours for today
async function getMissingHoursForToday(
  supabaseUrl: string,
  supabaseServiceKey: string,
  symbol: string,
  dateStr: string
): Promise<number[]> {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const now = new Date();
  
  // Convert current time to ET (simplified - assumes EST/UTC-5)
  const etOffset = -5;
  const utcHour = now.getUTCHours();
  const etHour = (utcHour + 24 + etOffset) % 24;
  
  // Determine which hours should have data
  const expectedHours: number[] = [];
  const endCheckHour = Math.min(etHour, END_HOUR_ET);
  
  for (let hour = START_HOUR_ET; hour <= endCheckHour; hour++) {
    expectedHours.push(hour);
  }
  
  if (expectedHours.length === 0) {
    return [];
  }
  
  // Query existing hourly records for today
  const todayStart = `${dateStr}T00:00:00Z`;
  const todayEnd = `${dateStr}T23:59:59Z`;
  
  const { data: existingData, error } = await supabase
    .from("narrative_history")
    .select("recorded_at")
    .eq("symbol", symbol.toUpperCase())
    .eq("period_type", "hourly")
    .gte("recorded_at", todayStart)
    .lte("recorded_at", todayEnd);
  
  if (error) {
    console.error("Error querying existing hourly data:", error);
    return expectedHours; // Assume all hours are missing on error
  }
  
  // Extract hours that have data (convert to ET)
  const hoursWithData = new Set<number>();
  for (const record of (existingData || []) as { recorded_at: string }[]) {
    const recordDate = new Date(record.recorded_at);
    const recordUtcHour = recordDate.getUTCHours();
    const recordEtHour = (recordUtcHour + 24 + etOffset) % 24;
    hoursWithData.add(recordEtHour);
  }
  
  // Find missing hours
  return expectedHours.filter(hour => !hoursWithData.has(hour));
}

// Check if sentiment data exists for a date
async function hasSentimentData(
  supabase: any,
  symbol: string,
  dateStr: string
): Promise<boolean> {
  const dayStart = `${dateStr}T00:00:00Z`;
  const dayEnd = `${dateStr}T23:59:59Z`;
  
  const { data, error } = await supabase
    .from('sentiment_history')
    .select('id')
    .eq('symbol', symbol.toUpperCase())
    .gte('recorded_at', dayStart)
    .lte('recorded_at', dayEnd)
    .limit(1);
  
  if (error) {
    console.error('Error checking sentiment_history:', error);
    return false;
  }
  
  return data && data.length > 0;
}

// Check if analytics data exists for a date
async function hasAnalyticsData(
  supabase: any,
  symbol: string,
  dateStr: string
): Promise<boolean> {
  const dayStart = `${dateStr}T00:00:00Z`;
  const dayEnd = `${dateStr}T23:59:59Z`;
  
  const { data, error } = await supabase
    .from('narrative_history')
    .select('id')
    .eq('symbol', symbol.toUpperCase())
    .eq('period_type', 'daily')
    .gte('recorded_at', dayStart)
    .lte('recorded_at', dayEnd)
    .limit(1);
  
  if (error) {
    console.error('Error checking narrative_history:', error);
    return false;
  }
  
  return data && data.length > 0;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { symbol, startDate, endDate, forceHourly, type, force } = await req.json();

    if (!symbol || !startDate || !endDate) {
      return new Response(
        JSON.stringify({ error: "symbol, startDate, and endDate are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse ingestion type (default to 'all' for backwards compatibility)
    const ingestionType: IngestionType = type || 'all';
    const forceRefetch = force === true;

    console.log(`Auto-backfill gaps for ${symbol} from ${startDate} to ${endDate}${forceHourly ? " (hourly mode)" : ""} [type=${ingestionType}, force=${forceRefetch}]`);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // HOURLY MODE: Fill missing hourly snapshots for today
    if (forceHourly && startDate === endDate) {
      console.log("Running in hourly backfill mode for today");
      
      const missingHours = await getMissingHoursForToday(supabaseUrl, supabaseServiceKey, symbol, startDate);
      console.log(`Missing hours for ${symbol} on ${startDate}:`, missingHours);
      
      if (missingHours.length === 0) {
        return new Response(
          JSON.stringify({
            symbol,
            mode: "hourly",
            message: "No missing hourly snapshots for today",
            missingHours: [],
            narrativeRecords: 0,
            emotionRecords: 0,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      const results = {
        symbol,
        mode: "hourly",
        processedHours: [] as number[],
        narrativeRecords: 0,
        emotionRecords: 0,
        errors: [] as string[],
      };
      
      // Process each missing hour (limit to 5 per request)
      const hoursToProcess = missingHours.slice(0, 5);
      
      for (const hour of hoursToProcess) {
        console.log(`Processing missing hour: ${hour}:00`);
        
        try {
          // Calculate UTC hour from ET hour (simplified)
          const etOffset = -5;
          const utcHour = (hour - etOffset) % 24;
          
          // Fetch messages for this hour window
          const hourStart = `${startDate}T${String(utcHour).padStart(2, '0')}:00:00Z`;
          const hourEnd = `${startDate}T${String(utcHour).padStart(2, '0')}:59:59Z`;
          
          const stocktwitsUrl = new URL(`${supabaseUrl}/functions/v1/stocktwits-proxy`);
          stocktwitsUrl.searchParams.set('action', 'messages');
          stocktwitsUrl.searchParams.set('symbol', symbol.toUpperCase());
          stocktwitsUrl.searchParams.set('limit', '200');
          stocktwitsUrl.searchParams.set('start', hourStart);
          stocktwitsUrl.searchParams.set('end', hourEnd);
          
          const messagesResponse = await fetch(stocktwitsUrl.toString(), {
            method: "GET",
            headers: { "Content-Type": "application/json" },
          });
          
          if (!messagesResponse.ok) {
            const errorText = await messagesResponse.text();
            console.error(`StockTwits API error for hour ${hour}:`, errorText);
            results.errors.push(`Hour ${hour}: StockTwits API error`);
            continue;
          }
          
          const messagesData = await messagesResponse.json();
          const messages: StocktwitsMessage[] = messagesData.messages || [];
          
          console.log(`Fetched ${messages.length} messages for hour ${hour}`);
          
          if (messages.length < 5) {
            console.log(`Skipping hour ${hour}: only ${messages.length} messages (minimum 5 required)`);
            continue;
          }
          
          // Analyze narratives
          const narratives = await analyzeNarratives(messages, lovableApiKey);
          
          if (narratives.length > 0) {
            const dominantNarrative = narratives.sort((a, b) => b.count - a.count)[0]?.name || null;
            const recordedAt = `${startDate}T${String(utcHour).padStart(2, '0')}:30:00Z`;
            
            const { error: narrativeError } = await supabase.from("narrative_history").insert({
              symbol: symbol.toUpperCase(),
              period_type: "hourly",
              recorded_at: recordedAt,
              narratives: narratives,
              dominant_narrative: dominantNarrative,
              message_count: messages.length,
            });
            
            if (narrativeError) {
              console.error(`Narrative insert error for hour ${hour}:`, narrativeError);
              results.errors.push(`Hour ${hour}: ${narrativeError.message}`);
            } else {
              results.narrativeRecords++;
            }
          }
          
          await delay(300);
          
          // Analyze emotions
          const emotions = await analyzeEmotions(messages, lovableApiKey);
          
          if (emotions.length > 0) {
            const dominantEmotion = emotions.sort((a, b) => b.score - a.score)[0]?.name || null;
            const recordedAt = `${startDate}T${String(utcHour).padStart(2, '0')}:30:00Z`;
            
            const { error: emotionError } = await supabase.from("emotion_history").insert({
              symbol: symbol.toUpperCase(),
              period_type: "hourly",
              recorded_at: recordedAt,
              emotions: emotions,
              dominant_emotion: dominantEmotion,
              message_count: messages.length,
            });
            
            if (emotionError) {
              console.error(`Emotion insert error for hour ${hour}:`, emotionError);
              results.errors.push(`Hour ${hour}: ${emotionError.message}`);
            } else {
              results.emotionRecords++;
            }
          }
          
          results.processedHours.push(hour);
          await delay(500);
          
        } catch (hourError: unknown) {
          const errorMessage = hourError instanceof Error ? hourError.message : String(hourError);
          console.error(`Error processing hour ${hour}:`, errorMessage);
          results.errors.push(`Hour ${hour}: ${errorMessage}`);
        }
      }
      
      console.log("Hourly backfill complete:", results);
      
      return new Response(
        JSON.stringify({
          ...results,
          hasMore: missingHours.length > hoursToProcess.length,
          remainingHours: missingHours.length - hoursToProcess.length,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // DAILY MODE: Original daily backfill logic with type/force support
    // Get expected weekdays in range
    const expectedDates = getWeekdaysInRange(new Date(startDate), new Date(endDate));
    console.log(`Expected ${expectedDates.length} weekdays in range`);

    const results = {
      symbol,
      ingestionType,
      force: forceRefetch,
      processedDates: [] as string[],
      skippedDates: [] as string[],
      sentimentRecords: 0,
      narrativeRecords: 0,
      emotionRecords: 0,
      errors: [] as string[],
    };

    // Process each date (limit to 3 per request to avoid timeouts)
    const datesToProcess = expectedDates.slice(0, 3);
    
    for (const dateStr of datesToProcess) {
      console.log(`Processing date: ${dateStr}`);
      
      try {
        // Determine what needs to be done based on type and existing data
        const needsMessages = ingestionType === 'messages' || ingestionType === 'all';
        const needsAnalytics = ingestionType === 'analytics' || ingestionType === 'all';
        
        let shouldFetchMessages = false;
        let shouldRunAnalytics = false;
        
        if (forceRefetch) {
          // Force mode: always process
          shouldFetchMessages = needsMessages;
          shouldRunAnalytics = needsAnalytics;
        } else {
          // Check what data already exists
          if (needsMessages) {
            const hasSentiment = await hasSentimentData(supabase, symbol, dateStr);
            shouldFetchMessages = !hasSentiment;
          }
          if (needsAnalytics) {
            const hasAnalytics = await hasAnalyticsData(supabase, symbol, dateStr);
            shouldRunAnalytics = !hasAnalytics;
          }
        }
        
        if (!shouldFetchMessages && !shouldRunAnalytics) {
          console.log(`Skipping ${dateStr}: data already exists`);
          results.skippedDates.push(dateStr);
          continue;
        }
        
        // Fetch messages from StockTwits proxy
        const dayStart = `${dateStr}T00:00:00Z`;
        const dayEnd = `${dateStr}T23:59:59Z`;
        
        const stocktwitsUrl = new URL(`${supabaseUrl}/functions/v1/stocktwits-proxy`);
        stocktwitsUrl.searchParams.set('action', 'messages');
        stocktwitsUrl.searchParams.set('symbol', symbol.toUpperCase());
        stocktwitsUrl.searchParams.set('limit', '500');
        stocktwitsUrl.searchParams.set('start', dayStart);
        stocktwitsUrl.searchParams.set('end', dayEnd);

        const messagesResponse = await fetch(stocktwitsUrl.toString(), {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (!messagesResponse.ok) {
          const errorText = await messagesResponse.text();
          console.error(`StockTwits API error for ${dateStr}:`, errorText);
          results.errors.push(`${dateStr}: StockTwits API error`);
          results.skippedDates.push(dateStr);
          continue;
        }

        const messagesData = await messagesResponse.json();
        const messages: StocktwitsMessage[] = messagesData.messages || [];
        
        console.log(`Fetched ${messages.length} messages for ${dateStr}`);

        if (messages.length < 10) {
          console.log(`Skipping ${dateStr}: only ${messages.length} messages (minimum 10 required)`);
          results.skippedDates.push(dateStr);
          continue;
        }

        const recordedAt = getEndOfDayTimestamp(dateStr);

        // MESSAGES FLOW: Compute and store sentiment aggregates
        if (shouldFetchMessages) {
          const { sentimentScore, bullishCount, bearishCount, neutralCount } = 
            computeSentimentFromMessages(messages);
          
          console.log(`Sentiment for ${dateStr}: score=${sentimentScore}, bullish=${bullishCount}, bearish=${bearishCount}, neutral=${neutralCount}`);
          
          const { error: sentimentError } = await supabase
            .from('sentiment_history')
            .upsert({
              symbol: symbol.toUpperCase(),
              recorded_at: recordedAt,
              sentiment_score: sentimentScore,
              bullish_count: bullishCount,
              bearish_count: bearishCount,
              neutral_count: neutralCount,
              message_volume: messages.length,
            }, { 
              onConflict: 'symbol,recorded_at',
              ignoreDuplicates: false 
            });
          
          if (sentimentError) {
            console.error(`Sentiment insert error for ${dateStr}:`, sentimentError);
            results.errors.push(`${dateStr}: ${sentimentError.message}`);
          } else {
            results.sentimentRecords++;
            console.log(`Stored sentiment data for ${dateStr}`);
          }
        }

        // ANALYTICS FLOW: Run AI analysis for narratives and emotions
        if (shouldRunAnalytics) {
          // Analyze narratives
          const narratives = await analyzeNarratives(messages, lovableApiKey);
          
          if (narratives.length > 0) {
            const dominantNarrative = narratives.sort((a, b) => b.count - a.count)[0]?.name || null;
            
            const { error: narrativeError } = await supabase.from("narrative_history").insert({
              symbol: symbol.toUpperCase(),
              period_type: "daily",
              recorded_at: recordedAt,
              narratives: narratives,
              dominant_narrative: dominantNarrative,
              message_count: messages.length,
            });

            if (narrativeError) {
              console.error(`Narrative insert error for ${dateStr}:`, narrativeError);
              results.errors.push(`${dateStr}: ${narrativeError.message}`);
            } else {
              results.narrativeRecords++;
            }
          }

          await delay(300);

          // Analyze emotions
          const emotions = await analyzeEmotions(messages, lovableApiKey);
          
          if (emotions.length > 0) {
            const dominantEmotion = emotions.sort((a, b) => b.score - a.score)[0]?.name || null;
            
            const { error: emotionError } = await supabase.from("emotion_history").insert({
              symbol: symbol.toUpperCase(),
              period_type: "daily",
              recorded_at: recordedAt,
              emotions: emotions,
              dominant_emotion: dominantEmotion,
              message_count: messages.length,
            });

            if (emotionError) {
              console.error(`Emotion insert error for ${dateStr}:`, emotionError);
              results.errors.push(`${dateStr}: ${emotionError.message}`);
            } else {
              results.emotionRecords++;
            }
          }
        }

        results.processedDates.push(dateStr);
        
        await delay(500); // Rate limit between dates
        
      } catch (dateError: unknown) {
        const errorMessage = dateError instanceof Error ? dateError.message : String(dateError);
        console.error(`Error processing ${dateStr}:`, errorMessage);
        results.errors.push(`${dateStr}: ${errorMessage}`);
      }
    }

    // Check if there are more dates to process
    const hasMore = expectedDates.length > datesToProcess.length;
    
    console.log("Auto-backfill complete:", results);

    return new Response(
      JSON.stringify({ 
        ...results,
        hasMore,
        remainingDates: hasMore ? expectedDates.length - datesToProcess.length : 0,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Auto-backfill error:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
