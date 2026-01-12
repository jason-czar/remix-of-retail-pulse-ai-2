import { 
  BarChart,
  Bar,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  LineChart,
  Line,
} from "recharts";
import { useMemo, useState } from "react";
import { useEmotionAnalysis, EmotionScore, EmotionTimePoint } from "@/hooks/use-emotion-analysis";
import { AlertCircle, TrendingUp, TrendingDown, Minus, BarChart3, Target, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AIAnalysisLoader } from "@/components/AIAnalysisLoader";
import { Sparkles } from "lucide-react";

type TimeRange = '1H' | '6H' | '24H' | '7D' | '30D';

interface EmotionChartProps {
  symbol: string;
  timeRange?: TimeRange;
  start?: string;
  end?: string;
}

// Emotion colors
const emotionColors: Record<string, string> = {
  "Excitement": "hsl(168 84% 45%)",
  "Fear": "hsl(0 72% 51%)",
  "Hopefulness": "hsl(142 71% 45%)",
  "Frustration": "hsl(38 92% 50%)",
  "Conviction": "hsl(199 89% 48%)",
  "Disappointment": "hsl(280 65% 60%)",
  "Sarcasm": "hsl(330 81% 60%)",
  "Humor": "hsl(45 93% 47%)",
  "Grit": "hsl(262 83% 58%)",
  "Surprise": "hsl(173 80% 40%)"
};

const getTrendIcon = (trend: string) => {
  switch (trend) {
    case "rising":
      return <TrendingUp className="h-3 w-3 text-emerald-400" />;
    case "falling":
      return <TrendingDown className="h-3 w-3 text-red-400" />;
    default:
      return <Minus className="h-3 w-3 text-muted-foreground" />;
  }
};

const getIntensityColor = (intensity: string) => {
  switch (intensity) {
    case "extreme":
      return "bg-red-500/20 text-red-400 border-red-500/30";
    case "high":
      return "bg-orange-500/20 text-orange-400 border-orange-500/30";
    case "moderate":
      return "bg-blue-500/20 text-blue-400 border-blue-500/30";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
};

export function EmotionChart({ symbol, timeRange = '24H' }: EmotionChartProps) {
  const [viewMode, setViewMode] = useState<"bar" | "radar" | "timeline">("bar");
  const [selectedEmotions, setSelectedEmotions] = useState<string[]>(["Excitement", "Fear", "Conviction"]);
  const { data, isLoading, error } = useEmotionAnalysis(symbol, timeRange);
  
  const chartData = useMemo(() => {
    if (!data?.emotions || data.emotions.length === 0) {
      return [];
    }
    
    return data.emotions
      .map((emotion: EmotionScore) => ({
        ...emotion,
        fill: emotionColors[emotion.name] || "hsl(215 20% 55%)",
      }))
      .sort((a, b) => b.score - a.score);
  }, [data]);

  const timelineData = useMemo(() => {
    if (!data?.historicalData || data.historicalData.length === 0) {
      return [];
    }
    
    return data.historicalData.map((point: EmotionTimePoint) => ({
      label: point.label,
      timestamp: point.timestamp,
      ...point.emotions,
    }));
  }, [data]);

  const toggleEmotion = (emotion: string) => {
    setSelectedEmotions(prev => 
      prev.includes(emotion) 
        ? prev.filter(e => e !== emotion)
        : [...prev, emotion].slice(-5) // Max 5 emotions at once
    );
  };

  if (isLoading) {
    return <AIAnalysisLoader symbol={symbol} analysisType="emotions" />;
  }

  if (error) {
    return (
      <div className="h-[500px] w-full flex flex-col items-center justify-center gap-4 text-muted-foreground">
        <AlertCircle className="h-8 w-8 text-destructive" />
        <p className="text-sm">Failed to analyze emotions. Please try again.</p>
      </div>
    );
  }

  if (chartData.length === 0) {
    return (
      <div className="h-[500px] w-full flex flex-col items-center justify-center gap-4 text-muted-foreground">
        <Sparkles className="h-8 w-8" />
        <p className="text-sm">No emotions found for {symbol}. Try a different time range.</p>
      </div>
    );
  }

  return (
    <div className="h-[550px] w-full">
      {/* Header with metadata */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Sparkles className="h-4 w-4 text-primary" />
          <span>AI-powered emotion analysis from {symbol} messages</span>
          {data?.cached && (
            <span className="px-2 py-0.5 rounded bg-muted text-muted-foreground">cached</span>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {data?.dominantEmotion && (
            <Badge variant="outline" className="text-xs">
              Dominant: {data.dominantEmotion}
            </Badge>
          )}
          {data?.emotionalIntensity && (
            <Badge variant="outline" className={`text-xs ${getIntensityColor(data.emotionalIntensity)}`}>
              {data.emotionalIntensity} intensity
            </Badge>
          )}
          
          <div className="flex gap-1 ml-2">
            <Button
              variant={viewMode === "bar" ? "secondary" : "ghost"}
              size="icon"
              className="h-7 w-7"
              onClick={() => setViewMode("bar")}
              title="Bar Chart"
            >
              <BarChart3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "radar" ? "secondary" : "ghost"}
              size="icon"
              className="h-7 w-7"
              onClick={() => setViewMode("radar")}
              title="Radar Chart"
            >
              <Target className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "timeline" ? "secondary" : "ghost"}
              size="icon"
              className="h-7 w-7"
              onClick={() => setViewMode("timeline")}
              title="Timeline View"
            >
              <Activity className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
      
      {viewMode === "bar" ? (
        <ResponsiveContainer width="100%" height="75%">
          <BarChart 
            data={chartData} 
            layout="vertical"
            margin={{ top: 10, right: 30, left: 10, bottom: 10 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(217 33% 17%)" horizontal={false} />
            <XAxis 
              type="number"
              domain={[0, 100]}
              stroke="hsl(215 20% 55%)" 
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis 
              type="category"
              dataKey="name"
              stroke="hsl(215 20% 55%)" 
              fontSize={12}
              tickLine={false}
              axisLine={false}
              width={110}
              tick={({ x, y, payload }) => (
                <g transform={`translate(${x},${y})`}>
                  <text
                    x={-5}
                    y={0}
                    dy={4}
                    textAnchor="end"
                    fill="hsl(210 40% 98%)"
                    fontSize={12}
                  >
                    {payload.value}
                  </text>
                </g>
              )}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(222 47% 8%)",
                border: "1px solid hsl(217 33% 17%)",
                borderRadius: "8px",
                boxShadow: "0 4px 24px -4px hsl(0 0% 0% / 0.3)"
              }}
              labelStyle={{ color: "hsl(210 40% 98%)" }}
              formatter={(value: number, name: string, props: any) => [
                <div key="tooltip" className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-lg">{value}</span>
                    <span className="text-muted-foreground text-xs">/ 100 score</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span>{props.payload.percentage}% of messages</span>
                    {getTrendIcon(props.payload.trend)}
                    <span className="text-muted-foreground">{props.payload.trend}</span>
                  </div>
                  {props.payload.examples?.length > 0 && (
                    <div className="text-xs text-muted-foreground italic border-t border-border pt-2 mt-1">
                      "{props.payload.examples[0]}"
                    </div>
                  )}
                </div>,
                ""
              ]}
            />
            <Bar 
              dataKey="score" 
              radius={[0, 4, 4, 0]}
              maxBarSize={35}
            >
              {chartData.map((entry: any, index: number) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      ) : viewMode === "radar" ? (
        <ResponsiveContainer width="100%" height="75%">
          <RadarChart data={chartData} margin={{ top: 20, right: 30, bottom: 20, left: 30 }}>
            <PolarGrid stroke="hsl(217 33% 17%)" />
            <PolarAngleAxis 
              dataKey="name" 
              tick={{ fill: "hsl(210 40% 98%)", fontSize: 11 }}
            />
            <PolarRadiusAxis 
              angle={90} 
              domain={[0, 100]} 
              tick={{ fill: "hsl(215 20% 55%)", fontSize: 10 }}
            />
            <Radar
              name="Score"
              dataKey="score"
              stroke="hsl(199 89% 48%)"
              fill="hsl(199 89% 48%)"
              fillOpacity={0.3}
              strokeWidth={2}
            />
          </RadarChart>
        </ResponsiveContainer>
      ) : (
        // Timeline view
        <div className="h-[75%] flex flex-col">
          {/* Emotion selector pills */}
          <div className="flex flex-wrap gap-2 mb-4 px-2">
            {Object.entries(emotionColors).map(([emotion, color]) => (
              <button
                key={emotion}
                onClick={() => toggleEmotion(emotion)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs transition-all border ${
                  selectedEmotions.includes(emotion)
                    ? "border-primary/50 bg-primary/10"
                    : "border-border bg-card/30 opacity-60 hover:opacity-100"
                }`}
              >
                <div 
                  className="w-2 h-2 rounded-full" 
                  style={{ backgroundColor: color }}
                />
                <span className="text-foreground">{emotion}</span>
              </button>
            ))}
          </div>
          
          {timelineData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={timelineData} margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(217 33% 17%)" />
                <XAxis 
                  dataKey="label" 
                  stroke="hsl(215 20% 55%)" 
                  fontSize={11}
                  tickLine={false}
                />
                <YAxis 
                  domain={[0, 100]} 
                  stroke="hsl(215 20% 55%)" 
                  fontSize={11}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(222 47% 8%)",
                    border: "1px solid hsl(217 33% 17%)",
                    borderRadius: "8px",
                    boxShadow: "0 4px 24px -4px hsl(0 0% 0% / 0.3)"
                  }}
                  labelStyle={{ color: "hsl(210 40% 98%)" }}
                />
                {selectedEmotions.map((emotion) => (
                  <Line
                    key={emotion}
                    type="monotone"
                    dataKey={emotion}
                    stroke={emotionColors[emotion]}
                    strokeWidth={2}
                    dot={{ fill: emotionColors[emotion], strokeWidth: 0, r: 4 }}
                    activeDot={{ r: 6, strokeWidth: 0 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <p className="text-sm">No historical data available yet</p>
            </div>
          )}
        </div>
      )}
      
      {/* Legend with trends */}
      {viewMode !== "timeline" && (
        <div className="flex flex-wrap gap-3 mt-4 justify-center">
          {chartData.slice(0, 5).map((emotion: any) => (
            <div 
              key={emotion.name}
              className="flex items-center gap-2 text-xs bg-card/50 px-3 py-1.5 rounded-full border border-border"
            >
              <div 
                className="w-2.5 h-2.5 rounded-full" 
                style={{ backgroundColor: emotion.fill }}
              />
              <span className="text-foreground font-medium">{emotion.name}</span>
              <span className="text-muted-foreground">{emotion.score}</span>
              {getTrendIcon(emotion.trend)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
