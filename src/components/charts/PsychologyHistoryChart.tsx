import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown, Minus, History } from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  CartesianGrid,
} from "recharts";
import { format, parseISO } from "date-fns";
import { usePsychologyHistory, PsychologySnapshot } from "@/hooks/use-psychology-history";

interface PsychologyHistoryChartProps {
  days?: number;
}

function getZoneColor(value: number): string {
  if (value <= 20) return "hsl(0, 70%, 50%)"; // Extreme Fear - red
  if (value <= 40) return "hsl(25, 70%, 50%)"; // Fear - orange
  if (value <= 60) return "hsl(45, 70%, 50%)"; // Neutral - yellow
  if (value <= 80) return "hsl(80, 60%, 45%)"; // Greed - lime
  return "hsl(120, 60%, 40%)"; // Extreme Greed - green
}

function getZoneLabel(value: number): string {
  if (value <= 20) return "Extreme Fear";
  if (value <= 40) return "Fear";
  if (value <= 60) return "Neutral";
  if (value <= 80) return "Greed";
  return "Extreme Greed";
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;

  const data = payload[0].payload as PsychologySnapshot & { dateLabel: string };
  const value = data.fear_greed_index;

  return (
    <div className="bg-popover border border-border rounded-lg shadow-lg p-3 min-w-48">
      <p className="text-xs text-muted-foreground mb-2">{data.dateLabel}</p>
      <div className="flex items-center gap-2 mb-2">
        <div
          className="w-3 h-3 rounded-full"
          style={{ backgroundColor: getZoneColor(value) }}
        />
        <span className="font-display text-2xl">{value}</span>
        <Badge
          variant="outline"
          style={{ borderColor: getZoneColor(value), color: getZoneColor(value) }}
        >
          {data.fear_greed_label}
        </Badge>
      </div>
      {data.dominant_signal && (
        <p className="text-xs text-muted-foreground">
          Signal: <span className="text-foreground">{data.dominant_signal}</span>
        </p>
      )}
      <p className="text-xs text-muted-foreground">
        Symbols: <span className="text-foreground">{data.symbol_count}</span>
      </p>
    </div>
  );
}

export function PsychologyHistoryChart({ days = 30 }: PsychologyHistoryChartProps) {
  const { data: history, isLoading } = usePsychologyHistory(days);

  const chartData = useMemo(() => {
    if (!history || history.length === 0) return [];

    return history.map((snapshot) => ({
      ...snapshot,
      dateLabel: format(parseISO(snapshot.recorded_at), "MMM d, yyyy"),
      date: format(parseISO(snapshot.recorded_at), "MMM d"),
    }));
  }, [history]);

  // Calculate trend
  const trend = useMemo(() => {
    if (chartData.length < 2) return { direction: "stable" as const, change: 0 };

    const recent = chartData.slice(-3);
    const older = chartData.slice(0, 3);

    const recentAvg = recent.reduce((sum, d) => sum + d.fear_greed_index, 0) / recent.length;
    const olderAvg = older.reduce((sum, d) => sum + d.fear_greed_index, 0) / older.length;
    const change = Math.round(recentAvg - olderAvg);

    return {
      direction: change > 5 ? ("rising" as const) : change < -5 ? ("falling" as const) : ("stable" as const),
      change,
    };
  }, [chartData]);

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <History className="h-5 w-5 text-accent" />
          <h3 className="text-lg font-semibold">Fear/Greed History</h3>
        </div>
        <Skeleton className="h-48 w-full" />
      </Card>
    );
  }

  if (!chartData || chartData.length === 0) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <History className="h-5 w-5 text-accent" />
          <h3 className="text-lg font-semibold">Fear/Greed History</h3>
        </div>
        <div className="text-center py-8">
          <History className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">
            No historical data yet. Snapshots are saved daily.
          </p>
        </div>
      </Card>
    );
  }

  const TrendIcon = trend.direction === "rising" ? TrendingUp : trend.direction === "falling" ? TrendingDown : Minus;
  const trendColor = trend.direction === "rising" ? "text-bullish" : trend.direction === "falling" ? "text-bearish" : "text-muted-foreground";

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <History className="h-5 w-5 text-accent" />
          <h3 className="text-lg font-semibold">Fear/Greed History</h3>
        </div>
        <div className="flex items-center gap-2">
          <TrendIcon className={`h-4 w-4 ${trendColor}`} />
          <span className={`text-sm ${trendColor}`}>
            {trend.change > 0 ? "+" : ""}{trend.change} pts
          </span>
          <Badge variant="secondary" className="text-xs">
            {days}D
          </Badge>
        </div>
      </div>

      {/* Zone legend */}
      <div className="flex items-center gap-3 mb-4 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: getZoneColor(10) }} />
          <span className="text-muted-foreground">Fear</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: getZoneColor(50) }} />
          <span className="text-muted-foreground">Neutral</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: getZoneColor(90) }} />
          <span className="text-muted-foreground">Greed</span>
        </div>
      </div>

      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="fearGreedGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--accent))" stopOpacity={0.3} />
                <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
              axisLine={{ stroke: "hsl(var(--border))" }}
              tickLine={false}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
              axisLine={{ stroke: "hsl(var(--border))" }}
              tickLine={false}
              width={30}
            />
            <Tooltip content={<CustomTooltip />} />
            
            {/* Zone reference lines */}
            <ReferenceLine y={20} stroke="hsl(0, 70%, 50%)" strokeDasharray="3 3" strokeOpacity={0.5} />
            <ReferenceLine y={50} stroke="hsl(45, 70%, 50%)" strokeDasharray="3 3" strokeOpacity={0.5} />
            <ReferenceLine y={80} stroke="hsl(120, 60%, 40%)" strokeDasharray="3 3" strokeOpacity={0.5} />
            
            <Area
              type="monotone"
              dataKey="fear_greed_index"
              stroke="hsl(var(--accent))"
              strokeWidth={2}
              fill="url(#fearGreedGradient)"
              dot={(props: any) => {
                const { cx, cy, payload } = props;
                return (
                  <circle
                    cx={cx}
                    cy={cy}
                    r={4}
                    fill={getZoneColor(payload.fear_greed_index)}
                    stroke="hsl(var(--background))"
                    strokeWidth={2}
                  />
                );
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
