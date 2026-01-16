import { useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
  LineChart,
  Line,
  ComposedChart,
  Area,
} from "recharts";
import { useEmotionMomentum, EmotionMomentum, EmotionDivergence } from "@/hooks/use-emotion-momentum";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChartErrorState } from "@/components/ChartErrorState";
import { format } from "date-fns";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Activity,
  AlertTriangle,
  Zap,
  ArrowUp,
  ArrowDown,
  BarChart3,
  LineChartIcon,
} from "lucide-react";

interface EmotionMomentumChartProps {
  symbol: string;
  days?: number;
}

// Color mapping for emotions
const EMOTION_COLORS: Record<string, string> = {
  Excitement: "hsl(168 84% 45%)",
  Fear: "hsl(0 72% 51%)",
  Hopefulness: "hsl(142 71% 45%)",
  Frustration: "hsl(38 92% 50%)",
  Conviction: "hsl(199 89% 48%)",
  Disappointment: "hsl(280 65% 60%)",
  Sarcasm: "hsl(330 81% 60%)",
  Humor: "hsl(45 93% 47%)",
  Grit: "hsl(262 83% 58%)",
  Surprise: "hsl(173 80% 40%)",
  FOMO: "hsl(25 95% 55%)",
  Greed: "hsl(50 100% 45%)",
  Capitulation: "hsl(0 50% 35%)",
  Euphoria: "hsl(300 80% 60%)",
  Regret: "hsl(220 60% 50%)",
};

// Signal emotions get special treatment
const SIGNAL_EMOTIONS = ["FOMO", "Greed", "Capitulation", "Euphoria", "Regret"];

function getTrendIcon(trend: EmotionMomentum["trend"]) {
  switch (trend) {
    case "surging":
      return <ArrowUp className="h-4 w-4 text-emerald-400" />;
    case "rising":
      return <TrendingUp className="h-4 w-4 text-emerald-400" />;
    case "falling":
      return <TrendingDown className="h-4 w-4 text-red-400" />;
    case "crashing":
      return <ArrowDown className="h-4 w-4 text-red-400" />;
    default:
      return <Minus className="h-4 w-4 text-muted-foreground" />;
  }
}

function getVelocityColor(velocity: number): string {
  if (velocity > 15) return "hsl(142 71% 45%)"; // Strong positive - green
  if (velocity > 5) return "hsl(168 84% 45%)"; // Positive - teal
  if (velocity > -5) return "hsl(215 20% 55%)"; // Neutral - gray
  if (velocity > -15) return "hsl(38 92% 50%)"; // Negative - orange
  return "hsl(0 72% 51%)"; // Strong negative - red
}

function getSignalBadgeVariant(type: string): "default" | "destructive" | "outline" | "secondary" {
  switch (type) {
    case "potential_top":
    case "overbought":
      return "destructive";
    case "potential_bottom":
    case "oversold":
      return "default";
    default:
      return "secondary";
  }
}

export function EmotionMomentumChart({ symbol, days = 7 }: EmotionMomentumChartProps) {
  const { data, isLoading, error, refetch } = useEmotionMomentum(symbol, days);
  const [viewMode, setViewMode] = useState<"velocity" | "timeline">("velocity");
  const [showSignalsOnly, setShowSignalsOnly] = useState(false);

  // Prepare velocity chart data
  const velocityData = useMemo(() => {
    if (!data?.emotions) return [];
    
    let emotions = data.emotions;
    if (showSignalsOnly) {
      emotions = emotions.filter(e => e.isSignal);
    }
    
    return emotions.slice(0, 12).map((m) => ({
      name: m.emotion,
      velocity: m.velocity,
      currentScore: m.currentScore,
      previousScore: m.previousScore,
      acceleration: m.acceleration,
      trend: m.trend,
      isExtreme: m.isExtreme,
      isSignal: m.isSignal,
      fill: EMOTION_COLORS[m.emotion] || "hsl(215 20% 55%)",
    }));
  }, [data, showSignalsOnly]);

  // Prepare timeline data
  const timelineData = useMemo(() => {
    if (!data?.dataPoints) return [];
    
    return data.dataPoints.slice(-20).map((dp) => ({
      timestamp: new Date(dp.timestamp).getTime(),
      sentimentScore: dp.sentimentScore,
      ...dp.emotions,
    }));
  }, [data]);

  if (isLoading) {
    return (
      <div className="h-[500px] w-full space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[450px] w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <ChartErrorState
        message="Could not calculate emotion momentum."
        onRetry={() => refetch()}
      />
    );
  }

  if (!data || data.emotions.length === 0) {
    return (
      <div className="h-[500px] w-full flex flex-col items-center justify-center gap-4 text-muted-foreground">
        <Activity className="h-12 w-12 opacity-50" />
        <div className="text-center">
          <p className="font-medium">Insufficient Data for Momentum</p>
          <p className="text-sm mt-1">
            Need at least 2 emotion snapshots to calculate momentum.
          </p>
        </div>
      </div>
    );
  }

  const overallMomentumLabel = {
    strongly_positive: { text: "Strongly Bullish", color: "text-emerald-400" },
    positive: { text: "Bullish", color: "text-emerald-400" },
    neutral: { text: "Neutral", color: "text-muted-foreground" },
    negative: { text: "Bearish", color: "text-red-400" },
    strongly_negative: { text: "Strongly Bearish", color: "text-red-400" },
  }[data.overallMomentum];

  return (
    <div className="space-y-6">
      {/* Header with market signal */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Zap className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h4 className="font-semibold flex items-center gap-2">
              Emotion Momentum
              <span className={`text-sm font-normal ${overallMomentumLabel.color}`}>
                ({overallMomentumLabel.text})
              </span>
            </h4>
            <p className="text-sm text-muted-foreground">
              Tracking velocity of emotional shifts
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={showSignalsOnly ? "secondary" : "outline"}
            size="sm"
            onClick={() => setShowSignalsOnly(!showSignalsOnly)}
            className="text-xs"
          >
            <AlertTriangle className="h-3.5 w-3.5 mr-1" />
            Signals Only
          </Button>
          <div className="flex gap-1 border rounded-lg p-0.5">
            <Button
              variant={viewMode === "velocity" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setViewMode("velocity")}
              className="h-7 px-2"
            >
              <BarChart3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "timeline" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setViewMode("timeline")}
              className="h-7 px-2"
            >
              <LineChartIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Market Signal Alert */}
      {data.marketSignal && (
        <Card className="p-4 bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
          <div className="flex items-start gap-3">
            <AlertTriangle className={`h-5 w-5 mt-0.5 ${
              data.marketSignal.type.includes("top") || data.marketSignal.type.includes("overbought") 
                ? "text-red-400" 
                : "text-emerald-400"
            }`} />
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-semibold">
                  {data.marketSignal.type.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
                </span>
                <Badge variant={getSignalBadgeVariant(data.marketSignal.type)}>
                  {data.marketSignal.confidence}% confidence
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {data.marketSignal.description}
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Divergence Alerts */}
      {data.divergences.length > 0 && (
        <div className="grid gap-3 md:grid-cols-2">
          {data.divergences.slice(0, 4).map((div, idx) => (
            <Card 
              key={idx} 
              className={`p-3 border-l-4 ${
                div.type === "bullish_divergence" 
                  ? "border-l-emerald-500 bg-emerald-500/5" 
                  : div.type === "bearish_divergence"
                  ? "border-l-red-500 bg-red-500/5"
                  : "border-l-blue-500 bg-blue-500/5"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium uppercase tracking-wide">
                  {div.type.replace(/_/g, " ")}
                </span>
                <Badge variant="outline" className="text-xs">
                  {div.confidence}%
                </Badge>
              </div>
              <p className="text-sm">{div.description}</p>
              {div.signal && (
                <Badge className="mt-2 text-xs" variant="secondary">
                  {div.signal}
                </Badge>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Charts */}
      <div className="h-[350px]">
        {viewMode === "velocity" ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart 
              data={velocityData} 
              layout="vertical"
              margin={{ top: 10, right: 30, left: 10, bottom: 10 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(217 33% 17%)" horizontal={false} />
              <XAxis
                type="number"
                domain={[-50, 50]}
                stroke="hsl(var(--muted-foreground))"
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                type="category"
                dataKey="name"
                stroke="hsl(var(--muted-foreground))"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                width={100}
                tick={({ x, y, payload }) => (
                  <g transform={`translate(${x},${y})`}>
                    <text
                      x={-5}
                      y={0}
                      dy={4}
                      textAnchor="end"
                      fill={SIGNAL_EMOTIONS.includes(payload.value) ? "hsl(45 93% 60%)" : "hsl(var(--foreground))"}
                      fontSize={11}
                      fontWeight={SIGNAL_EMOTIONS.includes(payload.value) ? 600 : 400}
                    >
                      {payload.value}
                    </text>
                  </g>
                )}
              />
              <ReferenceLine x={0} stroke="hsl(var(--border))" strokeWidth={2} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  boxShadow: "0 4px 24px -4px hsl(0 0% 0% / 0.3)",
                }}
                labelStyle={{ color: "hsl(var(--foreground))" }}
                formatter={(value: number, name: string, props: any) => {
                  const item = props.payload;
                  return [
                    <div key="tooltip" className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-lg">
                          {value > 0 ? "+" : ""}{value}
                        </span>
                        <span className="text-xs text-muted-foreground">velocity</span>
                        {getTrendIcon(item.trend)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Score: {item.previousScore} → {item.currentScore}
                      </div>
                      {item.isExtreme && (
                        <Badge variant="destructive" className="text-xs mt-1">
                          Extreme Movement
                        </Badge>
                      )}
                    </div>,
                    "",
                  ];
                }}
              />
              <Bar 
                dataKey="velocity" 
                radius={[0, 4, 4, 0]} 
                maxBarSize={30}
                shape={(props: any) => {
                  const { x, y, width, height, fill, radius } = props;
                  const entry = velocityData[props.index];
                  const isExtreme = entry?.isExtreme;
                  const baseOpacity = 0.45;
                  const extremeOpacity = 0.75;
                  const opacity = isExtreme ? extremeOpacity : baseOpacity;
                  
                  if (width === 0 || height === 0) return null;
                  
                  // Handle negative width (bars going left from 0)
                  const actualX = width < 0 ? x + width : x;
                  const actualWidth = Math.abs(width);
                  
                  const glassStyle = { 
                    transition: 'fill-opacity 0.2s ease-out',
                    filter: 'saturate(1.05)'
                  };
                  
                  return (
                    <g>
                      <rect
                        x={actualX}
                        y={y}
                        width={actualWidth}
                        height={height}
                        fill={fill}
                        fillOpacity={opacity}
                        stroke={fill}
                        strokeOpacity={isExtreme ? 0.8 : 0.5}
                        strokeWidth={1}
                        rx={4}
                        ry={4}
                        style={glassStyle}
                      />
                      {/* Inner glass highlight */}
                      <rect
                        x={actualX}
                        y={y + 1}
                        width={actualWidth}
                        height={Math.max(0, Math.min(height * 0.2, 4))}
                        fill="white"
                        fillOpacity={0.08}
                        rx={4}
                        style={{ pointerEvents: 'none' }}
                      />
                    </g>
                  );
                }}
              >
                {velocityData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={getVelocityColor(entry.velocity)}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={timelineData} margin={{ top: 10, right: 30, left: 0, bottom: 10 }}>
              <defs>
                <linearGradient id="sentimentGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(199 89% 48%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(199 89% 48%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
              <XAxis
                dataKey="timestamp"
                stroke="hsl(var(--muted-foreground))"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => format(new Date(value), "MMM d HH:mm")}
                minTickGap={60}
              />
              <YAxis
                yAxisId="emotions"
                stroke="hsl(var(--muted-foreground))"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                domain={[0, 100]}
              />
              <YAxis
                yAxisId="sentiment"
                orientation="right"
                stroke="hsl(199 89% 48%)"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                domain={[0, 100]}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
                labelFormatter={(value) => format(new Date(value), "MMM d, yyyy HH:mm")}
              />
              {/* Sentiment area */}
              <Area
                yAxisId="sentiment"
                type="monotone"
                dataKey="sentimentScore"
                stroke="hsl(199 89% 48%)"
                fill="url(#sentimentGradient)"
                strokeWidth={2}
                name="Sentiment"
              />
              {/* Signal emotion lines */}
              {SIGNAL_EMOTIONS.map((emotion) => (
                <Line
                  key={emotion}
                  yAxisId="emotions"
                  type="monotone"
                  dataKey={emotion}
                  stroke={EMOTION_COLORS[emotion]}
                  strokeWidth={2}
                  dot={{ r: 2 }}
                  name={emotion}
                />
              ))}
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Momentum Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {data.emotions
          .filter((e) => e.isSignal)
          .slice(0, 5)
          .map((m) => (
            <Card key={m.emotion} className="p-3">
              <div className="flex items-center justify-between mb-1">
                <span
                  className="text-xs font-medium"
                  style={{ color: EMOTION_COLORS[m.emotion] }}
                >
                  {m.emotion}
                </span>
                {getTrendIcon(m.trend)}
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-lg font-semibold">{m.currentScore}</span>
                <span
                  className={`text-xs ${
                    m.velocity > 0 ? "text-emerald-400" : m.velocity < 0 ? "text-red-400" : "text-muted-foreground"
                  }`}
                >
                  {m.velocity > 0 ? "+" : ""}
                  {m.velocity}
                </span>
              </div>
              {m.isExtreme && (
                <Badge variant="destructive" className="text-[10px] mt-1">
                  Extreme
                </Badge>
              )}
            </Card>
          ))}
      </div>
    </div>
  );
}
