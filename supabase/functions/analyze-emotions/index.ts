import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmotionScore {
  name: string;
  score: number;
  percentage: number;
  trend: "rising" | "falling" | "stable";
  examples: string[];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { symbol, timeRange = "24H" } = await req.json();

    if (!symbol) {
      return new Response(
        JSON.stringify({ error: "Symbol is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const STOCKTWITS_API_KEY = Deno.env.get("STOCKTWITS_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Initialize Supabase client with service role for cache operations
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Check cache first
    const { data: cached } = await supabase
      .from("emotion_cache")
      .select("*")
      .eq("symbol", symbol.toUpperCase())
      .eq("time_range", timeRange)
      .gt("expires_at", new Date().toISOString())
      .single();

    if (cached) {
      console.log(`Cache hit for emotions ${symbol} ${timeRange}`);
      return new Response(
        JSON.stringify({ emotions: cached.emotions, cached: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Cache miss for emotions ${symbol} ${timeRange}, fetching messages...`);

    // Fetch messages from StockTwits proxy
    const stocktwitsUrl = `${SUPABASE_URL}/functions/v1/stocktwits-proxy?action=messages&symbol=${symbol}&limit=300`;
    const messagesResponse = await fetch(stocktwitsUrl, {
      headers: {
        "x-api-key": STOCKTWITS_API_KEY || "",
        "Content-Type": "application/json",
      },
    });

    if (!messagesResponse.ok) {
      console.error("Failed to fetch messages:", await messagesResponse.text());
      throw new Error("Failed to fetch StockTwits messages");
    }

    const messagesData = await messagesResponse.json();
    const messages = messagesData.data?.messages || messagesData.messages || [];

    if (messages.length === 0) {
      return new Response(
        JSON.stringify({ emotions: [], message: "No messages found for analysis" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Prepare message content for AI analysis
    const messageTexts = messages
      .slice(0, 200)
      .map((m: any) => m.body || m.content || "")
      .filter((text: string) => text.length > 10)
      .join("\n---\n");

    console.log(`Analyzing emotions in ${messages.length} messages for ${symbol}...`);

    // Call Lovable AI with tool calling for structured output
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `You are an expert sentiment analyst specializing in retail trader psychology and social media analysis for stocks. You detect and quantify emotional signals in StockTwits messages, understanding modern slang, emoji usage, and trader jargon.

The 10 emotions you detect (adapted for retail trading):
1. Excitement - Hype, FOMO, pump energy ("🚀", "LFG", "moon", enthusiasm)
2. Fear/Anxiety - Panic, worry about losses ("scared", "worried", crash fears)
3. Hopefulness - Optimistic but uncertain ("fingers crossed", "hopefully", prayer hands)
4. Frustration - Annoyance with stock/market ("why won't it move", complaints)
5. Certainty/Conviction - Diamond hands, strong belief ("HODL", "loading up", "easy money")
6. Disappointment - Let down by performance ("expected more", "another red day")
7. Sarcasm/Irony - Mocking, dark humor about losses ("doing great 🙃", inverse indicators)
8. Humor - Genuine jokes and memes (not sarcastic)
9. Grit/Steadfastness - Holding through pain ("not selling", "long term hold", patience)
10. Surprise/Shock - Unexpected moves ("WTF", "didn't see that coming")`
          },
          {
            role: "user",
            content: `Analyze these ${messages.length} StockTwits messages about ${symbol.toUpperCase()} and score each of the 10 emotions on a scale of 0-100 based on prevalence and intensity.

For each emotion, provide:
- score: 0-100 indicating how present this emotion is in the messages
- percentage: What % of messages express this emotion
- trend: Is this emotion "rising", "falling", or "stable" compared to what you'd expect
- examples: 1-2 short example phrases from the messages that show this emotion

Messages:
${messageTexts}`
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_emotions",
              description: "Extract emotional analysis scores from stock messages",
              parameters: {
                type: "object",
                properties: {
                  emotions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: {
                          type: "string",
                          enum: ["Excitement", "Fear", "Hopefulness", "Frustration", "Conviction", "Disappointment", "Sarcasm", "Humor", "Grit", "Surprise"],
                        },
                        score: {
                          type: "number",
                          description: "Score from 0-100",
                        },
                        percentage: {
                          type: "number",
                          description: "Percentage of messages with this emotion (0-100)",
                        },
                        trend: {
                          type: "string",
                          enum: ["rising", "falling", "stable"],
                        },
                        examples: {
                          type: "array",
                          items: { type: "string" },
                          description: "1-2 example phrases from messages",
                        },
                      },
                      required: ["name", "score", "percentage", "trend"],
                    },
                  },
                  dominantEmotion: {
                    type: "string",
                    description: "The most prevalent emotion overall",
                  },
                  emotionalIntensity: {
                    type: "string",
                    enum: ["low", "moderate", "high", "extreme"],
                    description: "Overall emotional intensity of the messages",
                  },
                },
                required: ["emotions", "dominantEmotion", "emotionalIntensity"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "extract_emotions" } },
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI API error:", aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add funds." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`AI analysis failed: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    console.log("AI emotion response:", JSON.stringify(aiData, null, 2));

    // Extract emotions from tool call response
    let result = { emotions: [] as EmotionScore[], dominantEmotion: "", emotionalIntensity: "moderate" };
    
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      try {
        result = JSON.parse(toolCall.function.arguments);
      } catch (e) {
        console.error("Failed to parse tool call arguments:", e);
      }
    }

    // Ensure all 10 emotions are present with at least 0 score
    const emotionNames = ["Excitement", "Fear", "Hopefulness", "Frustration", "Conviction", "Disappointment", "Sarcasm", "Humor", "Grit", "Surprise"];
    const completeEmotions = emotionNames.map(name => {
      const found = result.emotions.find((e: EmotionScore) => e.name === name);
      return found || { name, score: 0, percentage: 0, trend: "stable", examples: [] };
    });

    const cacheData = {
      emotions: completeEmotions,
      dominantEmotion: result.dominantEmotion,
      emotionalIntensity: result.emotionalIntensity,
    };

    // Cache the results (1 hour expiry)
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    
    await supabase
      .from("emotion_cache")
      .upsert(
        {
          symbol: symbol.toUpperCase(),
          time_range: timeRange,
          emotions: cacheData,
          expires_at: expiresAt,
        },
        { onConflict: "symbol,time_range" }
      );

    console.log(`Cached emotion analysis for ${symbol} ${timeRange}`);

    return new Response(
      JSON.stringify({ ...cacheData, cached: false }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("analyze-emotions error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
