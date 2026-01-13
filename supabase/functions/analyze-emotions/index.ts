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

interface EmotionTimePoint {
  timestamp: string;
  label: string;
  emotions: Record<string, number>;
}

// Standard emotion names - includes trading-specific psychology emotions
const EMOTION_NAMES = [
  // Core retail trader emotions
  "Excitement", "Fear", "Hopefulness", "Frustration", "Conviction", 
  "Disappointment", "Sarcasm", "Humor", "Grit", "Surprise",
  // Trading-specific psychology
  "FOMO", "Greed", "Capitulation", "Euphoria", "Regret"
];

// Emotion categories for analysis
const POSITIVE_EMOTIONS = ["Excitement", "Hopefulness", "Conviction", "Humor", "Grit", "Euphoria"];
const NEGATIVE_EMOTIONS = ["Fear", "Frustration", "Disappointment", "FOMO", "Greed", "Capitulation", "Regret"];
const NEUTRAL_EMOTIONS = ["Sarcasm", "Surprise"];

// Helper to convert timeRange to date parameters
function getDateRange(timeRange: string): { start: string; end: string; limit: number } {
  const now = new Date();
  let daysBack = 1;
  let limit = 500;

  switch (timeRange) {
    case "1H":
      daysBack = 1;
      limit = 500;
      break;
    case "6H":
      daysBack = 1;
      limit = 750;
      break;
    case "24H":
      daysBack = 1;
      limit = 1000;
      break;
    case "7D":
      daysBack = 7;
      limit = 1500;
      break;
    case "30D":
      daysBack = 30;
      limit = 2500;
      break;
    default:
      daysBack = 1;
      limit = 500;
  }

  const pastDate = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);
  return {
    start: pastDate.toISOString().split("T")[0],
    end: now.toISOString().split("T")[0],
    limit,
  };
}

// Aggregate emotions from multiple history snapshots
function aggregateEmotions(historyData: any[]): {
  emotions: EmotionScore[];
  dominantEmotion: string;
  emotionalIntensity: string;
  historicalData: EmotionTimePoint[];
} {
  // Collect all emotion scores across snapshots
  const emotionTotals: Record<string, { scores: number[]; percentages: number[] }> = {};
  EMOTION_NAMES.forEach(name => {
    emotionTotals[name] = { scores: [], percentages: [] };
  });

  // Build historical data points from snapshots
  const historicalData: EmotionTimePoint[] = [];

  historyData.forEach((snapshot, index) => {
    const emotions = snapshot.emotions || {};
    const snapshotEmotions: Record<string, number> = {};
    
    // Handle different emotion data formats
    if (Array.isArray(emotions)) {
      // Format: [{name: "Fear", score: 50, ...}, ...]
      emotions.forEach((e: any) => {
        if (e.name && EMOTION_NAMES.includes(e.name)) {
          emotionTotals[e.name].scores.push(e.score || 0);
          emotionTotals[e.name].percentages.push(e.percentage || 0);
          snapshotEmotions[e.name] = e.score || 0;
        }
      });
    } else if (typeof emotions === 'object') {
      // Format: {Fear: 50, Excitement: 30, ...} or {emotions: [...]}
      if (emotions.emotions && Array.isArray(emotions.emotions)) {
        emotions.emotions.forEach((e: any) => {
          if (e.name && EMOTION_NAMES.includes(e.name)) {
            emotionTotals[e.name].scores.push(e.score || 0);
            emotionTotals[e.name].percentages.push(e.percentage || 0);
            snapshotEmotions[e.name] = e.score || 0;
          }
        });
      } else {
        EMOTION_NAMES.forEach(name => {
          const score = emotions[name];
          if (typeof score === 'number') {
            emotionTotals[name].scores.push(score);
            snapshotEmotions[name] = score;
          }
        });
      }
    }

    // Add to historical timeline with appropriate label based on period type
    const recordedAt = new Date(snapshot.recorded_at);
    
    // Format label based on data - use date format for daily data
    let label: string;
    const periodType = snapshot.period_type;
    if (periodType === 'daily' || periodType === 'eod') {
      // Date format for daily/eod snapshots
      label = recordedAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } else {
      // Time format for hourly snapshots
      label = recordedAt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    }
    
    historicalData.push({
      timestamp: snapshot.recorded_at,
      label,
      emotions: snapshotEmotions
    });
  });

  // Sort historical data chronologically (oldest first for chart)
  historicalData.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  
  // For aggregated data, group by date to get one point per day
  const dailyAggregated = new Map<string, { timestamp: string; emotions: Record<string, { total: number; count: number }> }>();
  historicalData.forEach(point => {
    const dateKey = new Date(point.timestamp).toISOString().split('T')[0];
    if (!dailyAggregated.has(dateKey)) {
      const emotionData: Record<string, { total: number; count: number }> = {};
      Object.entries(point.emotions).forEach(([name, score]) => {
        emotionData[name] = { total: score, count: 1 };
      });
      dailyAggregated.set(dateKey, { timestamp: point.timestamp, emotions: emotionData });
    } else {
      // Accumulate emotions for averaging
      const existing = dailyAggregated.get(dateKey)!;
      Object.entries(point.emotions).forEach(([name, score]) => {
        if (existing.emotions[name]) {
          existing.emotions[name].total += score;
          existing.emotions[name].count += 1;
        } else {
          existing.emotions[name] = { total: score, count: 1 };
        }
      });
    }
  });
  
  // Convert back to array with proper date labels and averaged emotions
  const timelineData: EmotionTimePoint[] = Array.from(dailyAggregated.entries())
    .map(([dateKey, data]) => {
      const date = new Date(dateKey);
      const averagedEmotions: Record<string, number> = {};
      Object.entries(data.emotions).forEach(([name, { total, count }]) => {
        averagedEmotions[name] = Math.round(total / count);
      });
      return {
        timestamp: data.timestamp,
        label: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        emotions: averagedEmotions
      };
    })
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  // Calculate average scores and determine trends
  const emotions: EmotionScore[] = EMOTION_NAMES.map(name => {
    const data = emotionTotals[name];
    const avgScore = data.scores.length > 0 
      ? Math.round(data.scores.reduce((a, b) => a + b, 0) / data.scores.length)
      : 0;
    const avgPercentage = data.percentages.length > 0
      ? Math.round(data.percentages.reduce((a, b) => a + b, 0) / data.percentages.length)
      : 0;
    
    // Determine trend by comparing first half to second half
    let trend: "rising" | "falling" | "stable" = "stable";
    if (data.scores.length >= 4) {
      const mid = Math.floor(data.scores.length / 2);
      const firstHalf = data.scores.slice(0, mid).reduce((a, b) => a + b, 0) / mid;
      const secondHalf = data.scores.slice(mid).reduce((a, b) => a + b, 0) / (data.scores.length - mid);
      if (secondHalf > firstHalf + 5) trend = "rising";
      else if (secondHalf < firstHalf - 5) trend = "falling";
    }
    
    return {
      name,
      score: avgScore,
      percentage: avgPercentage,
      trend,
      examples: [] // No examples when aggregating
    };
  });

  // Find dominant emotion
  const sortedEmotions = [...emotions].sort((a, b) => b.score - a.score);
  const dominantEmotion = sortedEmotions[0]?.name || "Neutral";

  // Determine overall intensity
  const avgTopScores = sortedEmotions.slice(0, 3).reduce((sum, e) => sum + e.score, 0) / 3;
  let emotionalIntensity = "low";
  if (avgTopScores >= 70) emotionalIntensity = "extreme";
  else if (avgTopScores >= 50) emotionalIntensity = "high";
  else if (avgTopScores >= 30) emotionalIntensity = "moderate";

  return {
    emotions: sortedEmotions,
    dominantEmotion,
    emotionalIntensity,
    historicalData: timelineData
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { symbol, timeRange = "24H", skipCache = false } = await req.json();

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

    // Check cache first (unless skipCache is true)
    if (!skipCache) {
      const { data: cached } = await supabase
        .from("emotion_cache")
        .select("*")
        .eq("symbol", symbol.toUpperCase())
        .eq("time_range", timeRange)
        .gt("expires_at", new Date().toISOString())
        .maybeSingle();

      if (cached) {
        console.log(`Cache hit for emotions ${symbol} ${timeRange}`);
        // Handle both old format (raw array) and new format (full object with emotions property)
        const rawEmotions = cached.emotions;
        let cachedData: any;
        
        if (Array.isArray(rawEmotions)) {
          // Old format: emotions column contains the array directly
          cachedData = {
            emotions: rawEmotions,
            dominantEmotion: rawEmotions[0]?.name || "Neutral",
            emotionalIntensity: "moderate",
            historicalData: [],
            messageCount: 0,
          };
        } else if (typeof rawEmotions === 'object' && rawEmotions !== null) {
          // New format: emotions column contains full response object
          cachedData = rawEmotions;
        } else {
          cachedData = { emotions: [], messageCount: 0 };
        }
        
        return new Response(
          JSON.stringify({ 
            ...cachedData,
            messageCount: cachedData.messageCount || 0,
            cached: true 
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // For 7D and 30D time ranges, try to aggregate from historical snapshots first
    if (timeRange === "7D" || timeRange === "30D") {
      const daysBack = timeRange === "7D" ? 7 : 30;
      const startDate = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);
      
      console.log(`Checking emotion_history for ${symbol} since ${startDate.toISOString()}`);
      
      const { data: historyData, error: historyError } = await supabase
        .from("emotion_history")
        .select("emotions, message_count, recorded_at, dominant_emotion")
        .eq("symbol", symbol.toUpperCase())
        .gte("recorded_at", startDate.toISOString())
        .order("recorded_at", { ascending: false });
      
      if (!historyError && historyData && historyData.length > 0) {
        // Minimum snapshots needed for aggregation
        const minSnapshots = timeRange === "7D" ? 8 : 20;
        
        if (historyData.length >= minSnapshots) {
          console.log(`Aggregating ${historyData.length} emotion snapshots for ${symbol} ${timeRange}`);
          
          const aggregated = aggregateEmotions(historyData);
          const totalMessages = historyData.reduce((sum, h) => sum + (h.message_count || 0), 0);
          
          const cacheData = {
            ...aggregated,
            messageCount: totalMessages,
            snapshotCount: historyData.length,
          };

          // Cache the aggregated result (2 hour expiry)
          const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
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
          
          return new Response(
            JSON.stringify({ 
              ...cacheData,
              cached: false, 
              aggregated: true 
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        } else {
          console.log(`Only ${historyData.length} emotion snapshots found, need ${minSnapshots}. Falling back to AI analysis.`);
        }
      }
    }

    console.log(`${skipCache ? 'Force refresh' : 'Cache miss'} for emotions ${symbol} ${timeRange}, fetching messages...`);

    // Get date range based on timeRange
    const { start, end, limit } = getDateRange(timeRange);

    // Fetch messages from StockTwits proxy with date range
    const stocktwitsUrl = `${SUPABASE_URL}/functions/v1/stocktwits-proxy?action=messages&symbol=${symbol}&limit=${limit}&start=${start}&end=${end}`;
    console.log(`Fetching from: ${stocktwitsUrl}`);
    
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
        JSON.stringify({ emotions: [], messageCount: 0, message: "No messages found for analysis" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const totalMessages = messages.length;

    // Group messages by time periods for historical analysis
    const messagesWithTime = messages.slice(0, 1000).map((m: any) => ({
      text: m.body || m.content || "",
      created_at: m.created_at || new Date().toISOString()
    })).filter((m: any) => m.text.length > 10);

    // Determine time bucket size based on timeRange
    const bucketMinutes = timeRange === "1H" ? 10 : timeRange === "6H" ? 60 : timeRange === "24H" ? 240 : timeRange === "7D" ? 1440 : 2880;
    
    // Group messages into time buckets
    const now = Date.now();
    const buckets: Map<string, string[]> = new Map();
    
    messagesWithTime.forEach((m: any) => {
      const msgTime = new Date(m.created_at).getTime();
      const bucketIndex = Math.floor((now - msgTime) / (bucketMinutes * 60 * 1000));
      const bucketKey = `bucket_${bucketIndex}`;
      if (!buckets.has(bucketKey)) {
        buckets.set(bucketKey, []);
      }
      buckets.get(bucketKey)!.push(m.text);
    });

    // Create time point labels
    const sortedBuckets = Array.from(buckets.entries())
      .sort((a, b) => parseInt(b[0].split('_')[1]) - parseInt(a[0].split('_')[1]))
      .slice(0, 8); // Last 8 time points

    const timePoints = sortedBuckets.map(([key, texts], index) => {
      const bucketIndex = parseInt(key.split('_')[1]);
      const minutesAgo = bucketIndex * bucketMinutes;
      const timestamp = new Date(now - minutesAgo * 60 * 1000);
      
      // Use appropriate label format based on time range
      let label = "";
      if (timeRange === "7D" || timeRange === "30D") {
        // For 7D/30D, use date format like "Jan 6"
        label = timestamp.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      } else if (minutesAgo < 60) {
        label = `${minutesAgo}m ago`;
      } else {
        label = `${Math.round(minutesAgo / 60)}h ago`;
      }
      
      return { label, texts, timestamp: timestamp.toISOString() };
    }).reverse();

    // Prepare message content for AI analysis
    const messageTexts = messagesWithTime
      .map((m: any) => m.text)
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

The 15 emotions you detect (adapted for retail trading):

**Core Trading Emotions:**
1. Excitement - Hype, pump energy ("🚀", "LFG", "moon", enthusiasm)
2. Fear/Anxiety - Panic, worry about losses ("scared", "worried", crash fears)  
3. Hopefulness - Optimistic but uncertain ("fingers crossed", "hopefully", 🙏)
4. Frustration - Annoyance with stock/market ("why won't it move", complaints)
5. Conviction - Diamond hands, strong belief ("HODL", "loading up", "easy money")
6. Disappointment - Let down by performance ("expected more", "another red day")
7. Sarcasm/Irony - Mocking, dark humor about losses ("doing great 🙃")
8. Humor - Genuine jokes and memes (not sarcastic)
9. Grit/Steadfastness - Holding through pain ("not selling", "long term hold")
10. Surprise/Shock - Unexpected moves ("WTF", "didn't see that coming")

**Trading-Specific Psychology:**
11. FOMO (Fear of Missing Out) - Anxiety about missing gains, chasing entries ("getting in before it moons", "can't miss this", late entries, regret not buying earlier)
12. Greed - Excessive desire for gains, overleveraging ("going all in", "100x", "lambo", unrealistic profit targets)
13. Capitulation - Giving up, panic selling, exhaustion ("I'm done", "selling everything", "can't take it anymore", surrender)
14. Euphoria - Extreme elation, irrational exuberance ("we're all gonna make it", "infinite money", peak optimism, victory lap)
15. Regret - Wishing for different actions ("should have sold", "why didn't I buy", hindsight pain, missed opportunities)

These emotions help identify key market psychology signals:
- High FOMO + Euphoria = potential top signal
- High Capitulation + Fear = potential bottom signal  
- High Greed = overbought conditions
- Rising Regret = trend exhaustion`
          },
          {
            role: "user",
            content: `Analyze these ${messages.length} StockTwits messages about ${symbol.toUpperCase()} and score each of the 10 emotions on a scale of 0-100 based on prevalence and intensity.

For each emotion, provide:
- score: 0-100 indicating how present this emotion is in the messages
- percentage: What % of messages express this emotion
- trend: Is this emotion "rising", "falling", or "stable" compared to what you'd expect
- examples: 1-2 short example phrases from the messages that show this emotion

ALSO analyze emotions over time. I've grouped messages into ${timePoints.length} time buckets:
${timePoints.map((tp, i) => `\nPeriod ${i + 1} (${tp.label}): ${tp.texts.slice(0, 10).join(' | ')}`).join('')}

For each time period, provide emotion scores to show the emotional journey over time.

All Messages:
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
                          enum: ["Excitement", "Fear", "Hopefulness", "Frustration", "Conviction", "Disappointment", "Sarcasm", "Humor", "Grit", "Surprise", "FOMO", "Greed", "Capitulation", "Euphoria", "Regret"],
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
                  historicalData: {
                    type: "array",
                    description: "Emotion scores over time for trend visualization",
                    items: {
                      type: "object",
                      properties: {
                        periodIndex: { type: "number", description: "Time period index (0 = oldest)" },
                        Excitement: { type: "number" },
                        Fear: { type: "number" },
                        Hopefulness: { type: "number" },
                        Frustration: { type: "number" },
                        Conviction: { type: "number" },
                        Disappointment: { type: "number" },
                        Sarcasm: { type: "number" },
                        Humor: { type: "number" },
                        Grit: { type: "number" },
                        Surprise: { type: "number" },
                        FOMO: { type: "number" },
                        Greed: { type: "number" },
                        Capitulation: { type: "number" },
                        Euphoria: { type: "number" },
                        Regret: { type: "number" },
                      },
                      required: ["periodIndex"],
                    },
                  },
                },
                required: ["emotions", "dominantEmotion", "emotionalIntensity", "historicalData"],
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
    let result = { emotions: [] as EmotionScore[], dominantEmotion: "", emotionalIntensity: "moderate", historicalData: [] as any[] };
    
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      try {
        result = JSON.parse(toolCall.function.arguments);
      } catch (e) {
        console.error("Failed to parse tool call arguments:", e);
      }
    }

    // Map historical data with proper timestamps
    const historicalWithTimestamps: EmotionTimePoint[] = (result.historicalData || []).map((point: any, index: number) => {
      const tp = timePoints[point.periodIndex] || timePoints[index] || { label: `T${index}`, timestamp: new Date().toISOString() };
      return {
        timestamp: tp.timestamp,
        label: tp.label,
        emotions: {
          Excitement: point.Excitement || 0,
          Fear: point.Fear || 0,
          Hopefulness: point.Hopefulness || 0,
          Frustration: point.Frustration || 0,
          Conviction: point.Conviction || 0,
          Disappointment: point.Disappointment || 0,
          Sarcasm: point.Sarcasm || 0,
          Humor: point.Humor || 0,
          Grit: point.Grit || 0,
          Surprise: point.Surprise || 0,
          FOMO: point.FOMO || 0,
          Greed: point.Greed || 0,
          Capitulation: point.Capitulation || 0,
          Euphoria: point.Euphoria || 0,
          Regret: point.Regret || 0,
        }
      };
    });

    // Ensure all 10 emotions are present with at least 0 score
    const completeEmotions = EMOTION_NAMES.map(name => {
      const found = result.emotions.find((e: EmotionScore) => e.name === name);
      return found || { name, score: 0, percentage: 0, trend: "stable", examples: [] };
    });

    const cacheData = {
      emotions: completeEmotions,
      dominantEmotion: result.dominantEmotion,
      emotionalIntensity: result.emotionalIntensity,
      historicalData: historicalWithTimestamps,
      messageCount: totalMessages,
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
      JSON.stringify({ ...cacheData, cached: false, aggregated: false }),
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