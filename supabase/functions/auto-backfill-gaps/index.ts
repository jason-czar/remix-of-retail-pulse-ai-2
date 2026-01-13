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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { symbol, startDate, endDate } = await req.json();

    if (!symbol || !startDate || !endDate) {
      return new Response(
        JSON.stringify({ error: "symbol, startDate, and endDate are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Auto-backfill gaps for ${symbol} from ${startDate} to ${endDate}`);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;
    const stocktwitsApiKey = Deno.env.get("STOCKTWITS_API_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get expected weekdays in range
    const expectedDates = getWeekdaysInRange(new Date(startDate), new Date(endDate));
    console.log(`Expected ${expectedDates.length} weekdays in range`);

    // Query existing narrative_history dates
    const { data: existingData, error: queryError } = await supabase
      .from("narrative_history")
      .select("recorded_at")
      .eq("symbol", symbol.toUpperCase())
      .eq("period_type", "daily")
      .gte("recorded_at", startDate)
      .lte("recorded_at", endDate + "T23:59:59Z");

    if (queryError) {
      console.error("Query error:", queryError);
      throw new Error(`Database query failed: ${queryError.message}`);
    }

    // Get unique dates that already have data
    const existingDates = new Set(
      (existingData || []).map(row => 
        new Date(row.recorded_at).toISOString().split('T')[0]
      )
    );
    console.log(`Found ${existingDates.size} existing dates with data`);

    // Find missing dates
    const missingDates = expectedDates.filter(d => !existingDates.has(d));
    console.log(`Missing data for ${missingDates.length} dates:`, missingDates);

    if (missingDates.length === 0) {
      return new Response(
        JSON.stringify({ 
          symbol,
          message: "No missing dates found",
          expectedDates: expectedDates.length,
          existingDates: existingDates.size,
          backfilledDates: [],
          skippedDates: expectedDates,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results = {
      symbol,
      missingDates: missingDates.length,
      backfilledDates: [] as string[],
      skippedDates: [] as string[],
      errors: [] as string[],
    };

    // Process each missing date (limit to 3 per request to avoid timeouts)
    const datesToProcess = missingDates.slice(0, 3);
    
    for (const dateStr of datesToProcess) {
      console.log(`Processing missing date: ${dateStr}`);
      
      try {
        // Fetch messages from StockTwits API for this date
        const dayStart = `${dateStr}T00:00:00Z`;
        const dayEnd = `${dateStr}T23:59:59Z`;
        
        const stocktwitsUrl = `https://srwjqgmqqsuazsczmywh.supabase.co/functions/v1/stocktwits-proxy`;
        const messagesResponse = await fetch(stocktwitsUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": stocktwitsApiKey,
          },
          body: JSON.stringify({
            action: "messages",
            symbol: symbol.toUpperCase(),
            limit: 500,
            start: dayStart,
            end: dayEnd,
          }),
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

        // Analyze narratives
        const narratives = await analyzeNarratives(messages, lovableApiKey);
        
        if (narratives.length > 0) {
          const dominantNarrative = narratives.sort((a, b) => b.count - a.count)[0]?.name || null;
          
          // Store with timestamp at end of the day
          const recordedAt = `${dateStr}T23:00:00Z`;
          
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
          }
        }

        await delay(300);

        // Analyze emotions
        const emotions = await analyzeEmotions(messages, lovableApiKey);
        
        if (emotions.length > 0) {
          const dominantEmotion = emotions.sort((a, b) => b.score - a.score)[0]?.name || null;
          
          const recordedAt = `${dateStr}T23:00:00Z`;
          
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
          }
        }

        results.backfilledDates.push(dateStr);
        
        await delay(500); // Rate limit between dates
        
      } catch (dateError: unknown) {
        const errorMessage = dateError instanceof Error ? dateError.message : String(dateError);
        console.error(`Error processing ${dateStr}:`, errorMessage);
        results.errors.push(`${dateStr}: ${errorMessage}`);
      }
    }

    // Check if there are more dates to process
    const hasMore = missingDates.length > datesToProcess.length;
    
    console.log("Auto-backfill complete:", results);

    return new Response(
      JSON.stringify({ 
        ...results,
        hasMore,
        remainingDates: hasMore ? missingDates.length - datesToProcess.length : 0,
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
