import { useMemo } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Legend,
  Area,
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { useSentimentHistory, SentimentHistoryPoint } from "@/hooks/use-sentiment-history";
import { ChartErrorState } from "@/components/ChartErrorState";
import { TrendingUp, TrendingDown, Minus, Activity } from "lucide-react";
import { format } from "date-fns";

interface SentimentHistoryChartProps {
  symbol: string;
  days?: number;
  compareSymbols?: string[];
  showVolume?: boolean;
  periodType?: "hourly" | "daily"; // Used for display formatting only
}

export function SentimentHistoryChart({
  symbol,
  days = 30,
  compareSymbols = [],
  showVolume = true,
  periodType = "daily",
}: SentimentHistoryChartProps) {
  const { data, isLoading, error, refetch } = useSentimentHistory(symbol, days, compareSymbols);

  const chartData = useMemo(() => {
    if (!data?.history || data.history.length === 0) return [];

    return data.history.map((point: SentimentHistoryPoint) => ({
      date: format(new Date(point.recorded_at), periodType === "hourly" ? "HH:mm" : "MMM d"),
      fullDate: format(new Date(point.recorded_at), periodType === "hourly" ? "MMM d, HH:mm" : "MMM d, yyyy"),
      sentiment: point.sentiment_score,
      bullish: point.bullish_count,
      bearish: point.bearish_count,
      neutral: point.neutral_count,
      volume: point.message_volume,
      emotion: point.dominant_emotion,
      narrative: point.dominant_narrative,
    }));
  }, [data, periodType]);

  if (isLoading) {
    return <Skeleton className="h-[400px] w-full" />;
  }

  if (error) {
    return (
      <ChartErrorState
        message="Unable to fetch sentiment history"
        onRetry={refetch}
      />
    );
  }

  if (!data || data.history.length === 0) {
    return (
      <div className="h-[400px] flex flex-col items-center justify-center text-muted-foreground">
        <Activity className="h-12 w-12 mb-4 opacity-50" />
        <p className="text-lg font-medium">No Historical Data Yet</p>
        <p className="text-sm mt-1">
          Historical snapshots are recorded daily. Check back tomorrow!
        </p>
      </div>
    );
  }

  const { stats, momentum } = data;

  const MomentumIcon =
    momentum.direction === "bullish"
      ? TrendingUp
      : momentum.direction === "bearish"
      ? TrendingDown
      : Minus;

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          label="Avg Sentiment"
          value={stats.avgSentiment}
          subtext={`Range: ${stats.minSentiment} - ${stats.maxSentiment}`}
        />
        <StatCard
          label="Volatility"
          value={stats.volatility.toFixed(1)}
          subtext={stats.volatility > 15 ? "High" : stats.volatility > 8 ? "Medium" : "Low"}
        />
        <StatCard
          label="Total Volume"
          value={formatNumber(stats.totalVolume)}
          subtext={`${stats.dataPoints} data points`}
        />
        <div className="p-3 rounded-lg bg-secondary/30">
          <div className="text-xs text-muted-foreground mb-1">Momentum</div>
          <div className="flex items-center gap-2">
            <MomentumIcon
              className={`h-5 w-5 ${
                momentum.direction === "bullish"
                  ? "text-bullish"
                  : momentum.direction === "bearish"
                  ? "text-bearish"
                  : "text-muted-foreground"
              }`}
            />
            <span className="text-lg font-semibold">
              {momentum.change > 0 ? "+" : ""}
              {momentum.change}
            </span>
          </div>
          <div className="text-xs text-muted-foreground capitalize">{momentum.trend}</div>
        </div>
      </div>

      {/* Chart */}
      <div className="h-[350px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="sentimentGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="volumeGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0.5} />
                <stop offset="95%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
            <XAxis
              dataKey="date"
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              yAxisId="sentiment"
              domain={[0, 100]}
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            {showVolume && (
              <YAxis
                yAxisId="volume"
                orientation="right"
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => formatNumber(v)}
              />
            )}
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                padding: "12px",
              }}
              labelStyle={{ color: "hsl(var(--foreground))", fontWeight: 600 }}
              formatter={(value: any, name: string) => {
                if (name === "volume") return [formatNumber(value), "Volume"];
                return [value, name.charAt(0).toUpperCase() + name.slice(1)];
              }}
              labelFormatter={(label, payload) => {
                const item = payload?.[0]?.payload;
                return item?.fullDate || label;
              }}
            />
            <Legend />
            <ReferenceLine
              yAxisId="sentiment"
              y={50}
              stroke="hsl(var(--muted-foreground))"
              strokeDasharray="5 5"
              opacity={0.5}
            />

            {showVolume && (
              <Bar
                yAxisId="volume"
                dataKey="volume"
                fill="url(#volumeGradient)"
                radius={[2, 2, 0, 0]}
                opacity={0.6}
              />
            )}

            <Area
              yAxisId="sentiment"
              type="monotone"
              dataKey="sentiment"
              stroke="hsl(var(--primary))"
              fill="url(#sentimentGradient)"
              strokeWidth={2}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Period Info */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {format(new Date(data.period.start), "MMM d, yyyy")} -{" "}
          {format(new Date(data.period.end), "MMM d, yyyy")}
        </span>
        <Badge variant="outline" className="text-xs">
          {data.history.length} snapshots
        </Badge>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  subtext,
}: {
  label: string;
  value: string | number;
  subtext: string;
}) {
  return (
    <div className="p-3 rounded-lg bg-secondary/30">
      <div className="text-xs text-muted-foreground mb-1">{label}</div>
      <div className="text-lg font-semibold">{value}</div>
      <div className="text-xs text-muted-foreground">{subtext}</div>
    </div>
  );
}

function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}