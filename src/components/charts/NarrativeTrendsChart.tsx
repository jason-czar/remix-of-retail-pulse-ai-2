import { useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { useNarrativeHistory } from "@/hooks/use-narrative-history";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChartErrorState } from "@/components/ChartErrorState";
import { format } from "date-fns";
import { TrendingUp, History, Layers } from "lucide-react";

interface NarrativeTrendsChartProps {
  symbol: string;
  days?: number;
  periodType?: "hourly" | "daily" | "all";
}

// Color palette for different themes
const THEME_COLORS = [
  "hsl(199 89% 48%)", // Blue
  "hsl(142 71% 45%)", // Green
  "hsl(0 72% 51%)",   // Red
  "hsl(45 93% 47%)",  // Yellow
  "hsl(280 65% 60%)", // Purple
  "hsl(180 60% 45%)", // Teal
  "hsl(25 95% 53%)",  // Orange
  "hsl(320 70% 50%)", // Pink
];

export function NarrativeTrendsChart({ 
  symbol, 
  days = 7, 
  periodType = "all" 
}: NarrativeTrendsChartProps) {
  const { data, isLoading, error, refetch } = useNarrativeHistory(symbol, days, periodType);
  const [selectedThemes, setSelectedThemes] = useState<Set<string>>(new Set());

  // Transform data for the chart
  const chartData = useMemo(() => {
    if (!data?.data || data.data.length === 0) return [];

    // Group by timestamp and create data points
    const timePoints = new Map<string, Record<string, number>>();
    
    data.data.forEach((point) => {
      const timeKey = point.recorded_at;
      if (!timePoints.has(timeKey)) {
        timePoints.set(timeKey, { timestamp: new Date(timeKey).getTime() });
      }
      const entry = timePoints.get(timeKey)!;
      
      point.narratives.forEach((narrative) => {
        const theme = narrative.name;
        if (data.dominantThemes.includes(theme)) {
          entry[theme] = (entry[theme] || 0) + narrative.count;
        }
      });
    });

    return Array.from(timePoints.values())
      .sort((a, b) => (a.timestamp as number) - (b.timestamp as number));
  }, [data]);

  // Themes to display (either selected or all dominant)
  const displayThemes = useMemo(() => {
    if (selectedThemes.size > 0) {
      return data?.dominantThemes.filter(t => selectedThemes.has(t)) || [];
    }
    return data?.dominantThemes || [];
  }, [data?.dominantThemes, selectedThemes]);

  const toggleTheme = (theme: string) => {
    setSelectedThemes(prev => {
      const next = new Set(prev);
      if (next.has(theme)) {
        next.delete(theme);
      } else {
        next.add(theme);
      }
      return next;
    });
  };

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
        message="Could not fetch historical narrative data."
        onRetry={() => refetch()}
      />
    );
  }

  if (!data || chartData.length === 0) {
    return (
      <div className="h-[400px] w-full flex flex-col items-center justify-center gap-4 text-muted-foreground">
        <History className="h-12 w-12 opacity-50" />
        <div className="text-center">
          <p className="font-medium">No Historical Data Yet</p>
          <p className="text-sm mt-1">
            Narrative history will populate as hourly/daily snapshots are recorded.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with stats */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Layers className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h4 className="font-semibold">Narrative Evolution</h4>
            <p className="text-sm text-muted-foreground">
              {data.data.length} snapshots over {days} days
            </p>
          </div>
        </div>
        <Badge variant="outline" className="gap-1">
          <TrendingUp className="h-3 w-3" />
          {data.dominantThemes.length} themes tracked
        </Badge>
      </div>

      {/* Theme filter chips */}
      <div className="flex flex-wrap gap-2">
        {data.dominantThemes.map((theme, index) => {
          const isSelected = selectedThemes.size === 0 || selectedThemes.has(theme);
          return (
            <Button
              key={theme}
              variant={isSelected ? "default" : "outline"}
              size="sm"
              className="h-7 text-xs gap-1.5"
              style={{
                backgroundColor: isSelected ? THEME_COLORS[index % THEME_COLORS.length] : undefined,
                borderColor: THEME_COLORS[index % THEME_COLORS.length],
                color: isSelected ? "white" : THEME_COLORS[index % THEME_COLORS.length],
              }}
              onClick={() => toggleTheme(theme)}
            >
              <div 
                className="w-2 h-2 rounded-full" 
                style={{ backgroundColor: isSelected ? "white" : THEME_COLORS[index % THEME_COLORS.length] }}
              />
              {theme}
            </Button>
          );
        })}
        {selectedThemes.size > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={() => setSelectedThemes(new Set())}
          >
            Show All
          </Button>
        )}
      </div>

      {/* Chart */}
      <div className="h-[350px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 10 }}>
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
              tickFormatter={(value) => value.toLocaleString()}
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
                `${value.toLocaleString()} mentions`,
                name,
              ]}
            />
            <Legend 
              wrapperStyle={{ paddingTop: "10px" }}
              formatter={(value) => (
                <span className="text-xs text-muted-foreground">{value}</span>
              )}
            />
            {displayThemes.map((theme, index) => (
              <Line
                key={theme}
                type="monotone"
                dataKey={theme}
                stroke={THEME_COLORS[data.dominantThemes.indexOf(theme) % THEME_COLORS.length]}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 2 }}
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {displayThemes.slice(0, 4).map((theme, index) => {
          const themeData = data.themeEvolution.get(theme) || [];
          const totalMentions = themeData.reduce((sum, d) => sum + d.count, 0);
          const latestSentiment = themeData[themeData.length - 1]?.sentiment || "neutral";
          
          return (
            <div 
              key={theme}
              className="p-3 rounded-lg border bg-card/50"
              style={{ borderLeftColor: THEME_COLORS[index % THEME_COLORS.length], borderLeftWidth: 3 }}
            >
              <div className="text-xs text-muted-foreground mb-1 truncate">{theme}</div>
              <div className="text-lg font-semibold">{totalMentions.toLocaleString()}</div>
              <Badge 
                variant={latestSentiment === "bullish" ? "bullish" : latestSentiment === "bearish" ? "bearish" : "neutral"}
                className="text-[10px] mt-1"
              >
                {latestSentiment}
              </Badge>
            </div>
          );
        })}
      </div>
    </div>
  );
}
