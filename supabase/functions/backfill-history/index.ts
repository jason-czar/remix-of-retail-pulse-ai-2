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

interface TimeBucket {
  timestamp: Date;
  periodType: "hourly" | "daily";
  messages: StocktwitsMessage[];
}

// Check if a date is a weekday (Mon-Fri)
function isWeekday(date: Date): boolean {
  const day = date.getUTCDay();
  return day >= 1 && day <= 5;
}

// Check if time is within market hours (7:30 AM - 6:00 PM ET)
// ET is UTC-5 (or UTC-4 during DST)
function isMarketHours(date: Date): boolean {
  const hour = date.getUTCHours();
  // Approximate: 12:30 UTC to 23:00 UTC covers 7:30 AM - 6:00 PM ET
  return hour >= 12 && hour <= 23;
}

// Group messages into hourly and daily buckets
function groupMessagesIntoBuckets(messages: StocktwitsMessage[]): TimeBucket[] {
  const hourlyBuckets = new Map<string, StocktwitsMessage[]>();
  const dailyBuckets = new Map<string, StocktwitsMessage[]>();

  for (const msg of messages) {
    const date = new Date(msg.created_at);
    const dateStr = date.toISOString().split("T")[0];
    const hourStr = `${dateStr}T${String(date.getUTCHours()).padStart(2, "0")}:00:00Z`;

    // Add to daily bucket
    if (!dailyBuckets.has(dateStr)) {
      dailyBuckets.set(dateStr, []);
    }
    dailyBuckets.get(dateStr)!.push(msg);

    // Add to hourly bucket only during market hours on weekdays
    if (isWeekday(date) && isMarketHours(date)) {
      if (!hourlyBuckets.has(hourStr)) {
        hourlyBuckets.set(hourStr, []);
      }
      hourlyBuckets.get(hourStr)!.push(msg);
    }
  }

  const buckets: TimeBucket[] = [];

  // Add hourly buckets
  for (const [hourStr, msgs] of hourlyBuckets) {
    if (msgs.length >= 5) { // Lower threshold for backfill
      buckets.push({
        timestamp: new Date(hourStr),
        periodType: "hourly",
        messages: msgs,
      });
    }
  }

  // Add daily buckets
  for (const [dateStr, msgs] of dailyBuckets) {
    const date = new Date(dateStr);
    if (isWeekday(date) && msgs.length >= 10) {
      // Set to end of day
      date.setUTCHours(23, 0, 0, 0);
      buckets.push({
        timestamp: date,
        periodType: "daily",
        messages: msgs,
      });
    }
  }

  return buckets.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
}

async function analyzeNarratives(messages: StocktwitsMessage[], apiKey: string): Promise<Narrative[]> {
  const messageContent = messages
    .slice(0, 100)
    .map((m, i) => `${i + 1}. ${m.body}`)
    .join("\n");

  const response = await fetch("https://api.lovable.dev/v1/chat/completions", {
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

  const response = await fetch("https://api.lovable.dev/v1/chat/completions", {
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

// Delay helper
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { symbol, messages } = await req.json();

    if (!symbol || !messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: "Symbol and messages array required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Processing ${messages.length} messages for ${symbol}`);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse and sort messages
    const sortedMessages = messages
      .filter((m: StocktwitsMessage) => m.body && m.created_at)
      .sort((a: StocktwitsMessage, b: StocktwitsMessage) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );

    console.log(`Sorted ${sortedMessages.length} valid messages`);

    // Group into buckets
    const buckets = groupMessagesIntoBuckets(sortedMessages);
    console.log(`Created ${buckets.length} time buckets`);

    const results = {
      symbol,
      totalMessages: sortedMessages.length,
      bucketsProcessed: 0,
      narrativeRecords: 0,
      emotionRecords: 0,
      errors: [] as string[],
    };

    // Process each bucket
    for (let i = 0; i < buckets.length; i++) {
      const bucket = buckets[i];
      console.log(`Processing bucket ${i + 1}/${buckets.length}: ${bucket.periodType} at ${bucket.timestamp.toISOString()}`);

      try {
        // Analyze narratives
        const narratives = await analyzeNarratives(bucket.messages, lovableApiKey);
        
        if (narratives.length > 0) {
          const dominantNarrative = narratives.sort((a, b) => b.count - a.count)[0]?.name || null;
          
          const { error: narrativeError } = await supabase.from("narrative_history").insert({
            symbol: symbol.toUpperCase(),
            period_type: bucket.periodType,
            recorded_at: bucket.timestamp.toISOString(),
            narratives: narratives,
            dominant_narrative: dominantNarrative,
            message_count: bucket.messages.length,
          });

          if (narrativeError) {
            console.error("Narrative insert error:", narrativeError);
            results.errors.push(`Narrative error at ${bucket.timestamp.toISOString()}: ${narrativeError.message}`);
          } else {
            results.narrativeRecords++;
          }
        }

        await delay(300); // Rate limit between AI calls

        // Analyze emotions
        const emotions = await analyzeEmotions(bucket.messages, lovableApiKey);
        
        if (emotions.length > 0) {
          const dominantEmotion = emotions.sort((a, b) => b.score - a.score)[0]?.name || null;
          
          const { error: emotionError } = await supabase.from("emotion_history").insert({
            symbol: symbol.toUpperCase(),
            period_type: bucket.periodType,
            recorded_at: bucket.timestamp.toISOString(),
            emotions: emotions,
            dominant_emotion: dominantEmotion,
            message_count: bucket.messages.length,
          });

          if (emotionError) {
            console.error("Emotion insert error:", emotionError);
            results.errors.push(`Emotion error at ${bucket.timestamp.toISOString()}: ${emotionError.message}`);
          } else {
            results.emotionRecords++;
          }
        }

        results.bucketsProcessed++;
        await delay(300); // Rate limit between buckets

      } catch (bucketError: unknown) {
        const errorMessage = bucketError instanceof Error ? bucketError.message : String(bucketError);
        console.error(`Bucket error:`, bucketError);
        results.errors.push(`Bucket ${bucket.timestamp.toISOString()}: ${errorMessage}`);
      }
    }

    console.log("Backfill complete:", results);

    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Backfill error:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
