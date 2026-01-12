import { useMemo, useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { useEmotionHistory } from "@/hooks/use-emotion-history";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChartErrorState } from "@/components/ChartErrorState";
import { format } from "date-fns";
import { Brain, TrendingUp, TrendingDown, Minus } from "lucide-react";

interface EmotionTrendsChartProps {
  symbol: string;
  days?: number;
  periodType?: "hourly" | "daily" | "all";
}

// Emotion color palette - warm/cool based on emotion type
const EMOTION_COLORS: Record<string, string> = {
  Excitement: "hsl(45 93% 47%)",    // Gold - high energy positive
  Fear: "hsl(0 72% 51%)",           // Red - negative
  Hopefulness: "hsl(142 71% 45%)",  // Green - positive outlook
  Frustration: "hsl(25 95% 53%)",   // Orange - negative energy
  Conviction: "hsl(199 89% 48%)",   // Blue - confident
  Disappointment: "hsl(280 65% 60%)", // Purple - sad
  Sarcasm: "hsl(320 70% 50%)",      // Pink - mixed
  Humor: "hsl(180 60% 45%)",        // Teal - light
  Grit: "hsl(215 80% 55%)",         // Deep blue - steady
  Surprise: "hsl(50 100% 50%)",     // Bright yellow
};

// Categorize emotions
const POSITIVE_EMOTIONS = ["Excitement", "Hopefulness", "Conviction", "Humor", "Grit"];
const NEGATIVE_EMOTIONS = ["Fear", "Frustration", "Disappointment"];

export function EmotionTrendsChart({
  symbol,
  days = 7,
  periodType = "all",
}: EmotionTrendsChartProps) {
  const { data, isLoading, error, refetch } = useEmotionHistory(symbol, days, periodType);
  const [selectedEmotions, setSelectedEmotions] = useState<Set<string>>(new Set());

  // Transform data for the chart
  const chartData = useMemo(() => {
    if (!data?.data || data.data.length === 0) return [];

    return data.data.map((point) => ({
      timestamp: new Date(point.recorded_at).getTime(),
      ...point.emotions,
    }));
  }, [data]);

  // Emotions to display
  const displayEmotions = useMemo(() => {
    if (selectedEmotions.size > 0) {
      return data?.dominantEmotions.filter((e) => selectedEmotions.has(e)) || [];
    }
    // Show top 5 by default
    return data?.dominantEmotions.slice(0, 5) || [];
  }, [data?.dominantEmotions, selectedEmotions]);

  const toggleEmotion = (emotion: string) => {
    setSelectedEmotions((prev) => {
      const next = new Set(prev);
      if (next.has(emotion)) {
        next.delete(emotion);
      } else {
        next.add(emotion);
      }
      return next;
    });
  };

  // Calculate sentiment balance
  const sentimentBalance = useMemo(() => {
    if (!data?.averageScores) return { positive: 0, negative: 0, trend: "neutral" };
    
    const positive = POSITIVE_EMOTIONS.reduce(
      (sum, e) => sum + (data.averageScores[e] || 0),
      0
    ) / POSITIVE_EMOTIONS.length;
    
    const negative = NEGATIVE_EMOTIONS.reduce(
      (sum, e) => sum + (data.averageScores[e] || 0),
      0
    ) / NEGATIVE_EMOTIONS.length;

    const trend = positive > negative + 10 ? "positive" : negative > positive + 10 ? "negative" : "neutral";
    
    return { positive: Math.round(positive), negative: Math.round(negative), trend };
  }, [data?.averageScores]);

  if (isLoading) {
    return (
      <div className="h-[400px] w-full space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[350px] w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <ChartErrorState
        message="Could not fetch historical emotion data."
        onRetry={() => refetch()}
      />
    );
  }

  if (!data || chartData.length === 0) {
    return (
      <div className="h-[400px] w-full flex flex-col items-center justify-center gap-4 text-muted-foreground">
        <Brain className="h-12 w-12 opacity-50" />
        <div className="text-center">
          <p className="font-medium">No Historical Data Yet</p>
          <p className="text-sm mt-1">
            Emotion history will populate as hourly/daily snapshots are recorded.
          </p>
        </div>
      </div>
    );
  }

  const TrendIcon = sentimentBalance.trend === "positive" 
    ? TrendingUp 
    : sentimentBalance.trend === "negative" 
      ? TrendingDown 
      : Minus;

  return (
    <div className="space-y-4">
      {/* Header with sentiment balance */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Brain className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h4 className="font-semibold">Emotional Journey</h4>
            <p className="text-sm text-muted-foreground">
              {data.data.length} snapshots over {days} days
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-xs text-muted-foreground">Sentiment Balance</div>
            <div className="flex items-center gap-2">
              <span className="text-bullish font-medium">+{sentimentBalance.positive}</span>
              <span className="text-muted-foreground">/</span>
              <span className="text-bearish font-medium">-{sentimentBalance.negative}</span>
              <TrendIcon className={`h-4 w-4 ${
                sentimentBalance.trend === "positive" ? "text-bullish" :
                sentimentBalance.trend === "negative" ? "text-bearish" : "text-muted-foreground"
              }`} />
            </div>
          </div>
        </div>
      </div>

      {/* Emotion filter chips */}
      <div className="flex flex-wrap gap-2">
        {data.dominantEmotions.map((emotion) => {
          const isSelected = selectedEmotions.size === 0 
            ? displayEmotions.includes(emotion) 
            : selectedEmotions.has(emotion);
          const color = EMOTION_COLORS[emotion] || "hsl(var(--muted))";
          
          return (
            <Button
              key={emotion}
              variant={isSelected ? "default" : "outline"}
              size="sm"
              className="h-7 text-xs gap-1.5"
              style={{
                backgroundColor: isSelected ? color : undefined,
                borderColor: color,
                color: isSelected ? "white" : color,
              }}
              onClick={() => toggleEmotion(emotion)}
            >
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: isSelected ? "white" : color }}
              />
              {emotion}
              <span className="opacity-70">({data.averageScores[emotion]})</span>
            </Button>
          );
        })}
        {selectedEmotions.size > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={() => setSelectedEmotions(new Set())}
          >
            Reset
          </Button>
        )}
      </div>

      {/* Chart */}
      <div className="h-[350px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 10 }}>
            <defs>
              {displayEmotions.map((emotion) => (
                <linearGradient key={emotion} id={`gradient-${emotion}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={EMOTION_COLORS[emotion]} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={EMOTION_COLORS[emotion]} stopOpacity={0} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
            <XAxis
              dataKey="timestamp"
              stroke="hsl(var(--muted-foreground))"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => format(new Date(value), days <= 2 ? "HH:mm" : "MMM d")}
              minTickGap={50}
            />
            <YAxis
              stroke="hsl(var(--muted-foreground))"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              domain={[0, 100]}
              tickFormatter={(value) => `${value}`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                boxShadow: "0 4px 24px -4px hsl(0 0% 0% / 0.3)",
              }}
              labelStyle={{ color: "hsl(var(--foreground))" }}
              labelFormatter={(value) => format(new Date(value), "MMM d, yyyy HH:mm")}
              formatter={(value: number, name: string) => [
                `${value} score`,
                name,
              ]}
            />
            <Legend
              wrapperStyle={{ paddingTop: "10px" }}
              formatter={(value) => (
                <span className="text-xs text-muted-foreground">{value}</span>
              )}
            />
            {displayEmotions.map((emotion) => (
              <Area
                key={emotion}
                type="monotone"
                dataKey={emotion}
                stroke={EMOTION_COLORS[emotion]}
                strokeWidth={2}
                fill={`url(#gradient-${emotion})`}
                connectNulls
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Emotion summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {displayEmotions.slice(0, 5).map((emotion) => {
          const trendData = data.emotionTrends.get(emotion) || [];
          const latestScore = trendData[trendData.length - 1]?.score || 0;
          const firstScore = trendData[0]?.score || 0;
          const change = latestScore - firstScore;
          const isPositiveEmotion = POSITIVE_EMOTIONS.includes(emotion);

          return (
            <div
              key={emotion}
              className="p-3 rounded-lg border bg-card/50"
              style={{
                borderLeftColor: EMOTION_COLORS[emotion],
                borderLeftWidth: 3,
              }}
            >
              <div className="text-xs text-muted-foreground mb-1">{emotion}</div>
              <div className="flex items-baseline gap-2">
                <span className="text-lg font-semibold">{data.averageScores[emotion]}</span>
                {change !== 0 && (
                  <span className={`text-xs flex items-center ${
                    (change > 0 && isPositiveEmotion) || (change < 0 && !isPositiveEmotion)
                      ? "text-bullish"
                      : "text-bearish"
                  }`}>
                    {change > 0 ? "+" : ""}{change}
                  </span>
                )}
              </div>
              <Badge
                variant={isPositiveEmotion ? "bullish" : "bearish"}
                className="text-[10px] mt-1"
              >
                {isPositiveEmotion ? "positive" : "negative"}
              </Badge>
            </div>
          );
        })}
      </div>
    </div>
  );
}
