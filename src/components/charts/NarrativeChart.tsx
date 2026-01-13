import { 
  BarChart,
  Bar,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
  Legend
} from "recharts";
import { useMemo } from "react";
import { useNarrativeAnalysis, Narrative } from "@/hooks/use-narrative-analysis";
import { useNarrativeHistory } from "@/hooks/use-narrative-history";
import { AlertCircle, RefreshCw, Sparkles, TrendingUp } from "lucide-react";
import { AIAnalysisLoader } from "@/components/AIAnalysisLoader";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

type TimeRange = '1H' | '6H' | '1D' | '24H' | '7D' | '30D';

interface NarrativeChartProps {
  symbol: string;
  timeRange?: TimeRange;
  start?: string;
  end?: string;
}

// Color palette for stacked bar chart themes
const THEME_COLORS = [
  "hsl(199 89% 48%)",   // Blue
  "hsl(142 71% 45%)",   // Green
  "hsl(262 83% 58%)",   // Purple
  "hsl(24 95% 53%)",    // Orange
  "hsl(340 75% 55%)",   // Pink
  "hsl(47 96% 53%)",    // Yellow
  "hsl(172 66% 50%)",   // Teal
  "hsl(291 64% 42%)",   // Violet
];

// Color palette for narratives based on sentiment
const getSentimentColor = (sentiment: string, index: number) => {
  const bullishColors = [
    "hsl(142 71% 45%)", // Green
    "hsl(152 76% 40%)",
    "hsl(162 72% 42%)",
  ];
  const bearishColors = [
    "hsl(0 72% 51%)", // Red
    "hsl(10 78% 54%)",
    "hsl(20 75% 50%)",
  ];
  const neutralColors = [
    "hsl(199 89% 48%)", // Blue
    "hsl(215 80% 55%)",
    "hsl(230 75% 58%)",
  ];

  const palette = sentiment === "bullish" 
    ? bullishColors 
    : sentiment === "bearish" 
      ? bearishColors 
      : neutralColors;

  return palette[index % palette.length];
};

const getSentimentBadge = (sentiment: string) => {
  const styles = {
    bullish: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    bearish: "bg-red-500/20 text-red-400 border-red-500/30",
    neutral: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  };
  return styles[sentiment as keyof typeof styles] || styles.neutral;
};

// Time series stacked bar chart for 7D/30D
function TimeSeriesNarrativeChart({ 
  symbol, 
  timeRange 
}: { 
  symbol: string; 
  timeRange: '7D' | '30D';
}) {
  const days = timeRange === '7D' ? 7 : 30;
  const { data: historyData, isLoading, error, refetch, isFetching } = useNarrativeHistory(
    symbol, 
    days, 
    "daily"
  );

  const { stackedChartData, topThemes, totalMessages } = useMemo(() => {
    if (!historyData?.themeEvolution || historyData.themeEvolution.size === 0) {
      return { stackedChartData: [], topThemes: [], totalMessages: 0 };
    }

    // Get top themes for the legend
    const topThemes = historyData.dominantThemes.slice(0, 8);
    
    // Build date-based data structure
    const byDate = new Map<string, Record<string, number | string>>();
    
    historyData.themeEvolution.forEach((points, theme) => {
      if (!topThemes.includes(theme)) return;
      
      points.forEach(point => {
        const dateKey = format(new Date(point.time), 'MMM d');
        const sortKey = new Date(point.time).toISOString().split('T')[0];
        
        if (!byDate.has(sortKey)) {
          byDate.set(sortKey, { date: dateKey, sortKey });
        }
        const entry = byDate.get(sortKey)!;
        entry[theme] = ((entry[theme] as number) || 0) + point.count;
      });
    });

    // Sort by date and return
    const stackedChartData = Array.from(byDate.values())
      .sort((a, b) => (a.sortKey as string).localeCompare(b.sortKey as string));

    // Calculate total messages
    const totalMessages = historyData.data.reduce((sum, point) => sum + point.message_count, 0);

    return { stackedChartData, topThemes, totalMessages };
  }, [historyData]);

  if (isLoading) {
    return <AIAnalysisLoader symbol={symbol} analysisType="narratives" />;
  }

  if (error) {
    return (
      <div className="h-[500px] w-full flex flex-col items-center justify-center gap-4 text-muted-foreground">
        <AlertCircle className="h-8 w-8 text-destructive" />
        <p className="text-sm">Failed to load narrative history. Please try again.</p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  if (stackedChartData.length === 0) {
    return (
      <div className="h-[500px] w-full flex flex-col items-center justify-center gap-4 text-muted-foreground">
        <Sparkles className="h-8 w-8" />
        <p className="text-sm">No narrative history found for {symbol}. Data will accumulate over time.</p>
      </div>
    );
  }

  return (
    <div className="h-[500px] w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 p-3 rounded-lg bg-card/50 border border-border">
        <div className="flex items-center gap-3">
          <TrendingUp className="h-5 w-5 text-primary" />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Narrative Trends</span>
              <span className="px-2 py-0.5 rounded bg-primary/20 text-primary text-xs">
                time series
              </span>
              <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-400 text-xs">
                {historyData?.data.length || 0} snapshots
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
              {totalMessages > 0 && (
                <span className="flex items-center gap-1">
                  <span className="font-semibold text-primary">{totalMessages.toLocaleString()}</span> total messages
                </span>
              )}
              <span>{days} days of data</span>
            </div>
          </div>
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => refetch()}
          disabled={isFetching}
          className="h-8 px-3 text-xs"
        >
          <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isFetching ? 'animate-spin' : ''}`} />
          {isFetching ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>

      <ResponsiveContainer width="100%" height="85%">
        <BarChart 
          data={stackedChartData}
          margin={{ top: 10, right: 30, left: 0, bottom: 10 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(217 33% 17%)" vertical={false} />
          <XAxis 
            dataKey="date"
            stroke="hsl(215 20% 55%)" 
            fontSize={11}
            tickLine={false}
            axisLine={false}
          />
          <YAxis 
            stroke="hsl(215 20% 55%)" 
            fontSize={11}
            tickLine={false}
            axisLine={false}
            width={45}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(222 47% 8%)",
              border: "1px solid hsl(217 33% 17%)",
              borderRadius: "8px",
              boxShadow: "0 4px 24px -4px hsl(0 0% 0% / 0.3)"
            }}
            labelStyle={{ color: "hsl(210 40% 98%)", fontWeight: 600, marginBottom: 4 }}
            formatter={(value: number, name: string) => [
              `${value} mentions`,
              name
            ]}
          />
          <Legend 
            wrapperStyle={{ 
              paddingTop: "12px",
              fontSize: "11px"
            }}
            iconSize={10}
          />
          {topThemes.map((theme, index) => (
            <Bar 
              key={theme}
              dataKey={theme}
              stackId="narratives"
              fill={THEME_COLORS[index % THEME_COLORS.length]}
              radius={index === topThemes.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// Horizontal bar chart for 1H/6H/24H
function HorizontalNarrativeChart({ 
  symbol, 
  timeRange 
}: { 
  symbol: string; 
  timeRange: TimeRange;
}) {
  const { data, isLoading, error, forceRefresh, isFetching } = useNarrativeAnalysis(symbol, timeRange);
  
  const chartData = useMemo(() => {
    if (!data?.narratives || data.narratives.length === 0) {
      return [];
    }
    
    return data.narratives.map((narrative: Narrative, index: number) => ({
      ...narrative,
      fill: getSentimentColor(narrative.sentiment, index),
    }));
  }, [data]);

  if (isLoading) {
    return <AIAnalysisLoader symbol={symbol} analysisType="narratives" />;
  }

  if (error) {
    return (
      <div className="h-[500px] w-full flex flex-col items-center justify-center gap-4 text-muted-foreground">
        <AlertCircle className="h-8 w-8 text-destructive" />
        <p className="text-sm">Failed to analyze narratives. Please try again.</p>
        <Button variant="outline" size="sm" onClick={forceRefresh}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  if (chartData.length === 0) {
    return (
      <div className="h-[500px] w-full flex flex-col items-center justify-center gap-4 text-muted-foreground">
        <Sparkles className="h-8 w-8" />
        <p className="text-sm">No narratives found for {symbol}. Try a different time range.</p>
      </div>
    );
  }

  return (
    <div className="h-[500px] w-full">
      {/* Prominent metadata header */}
      <div className="flex items-center justify-between mb-4 p-3 rounded-lg bg-card/50 border border-border">
        <div className="flex items-center gap-3">
          <Sparkles className="h-5 w-5 text-primary" />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">AI Narrative Analysis</span>
              {data?.cached && (
                <span className="px-2 py-0.5 rounded bg-muted text-muted-foreground text-xs">cached</span>
              )}
              {data?.aggregated && (
                <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-400 text-xs">
                  {data.snapshotCount} snapshots
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
              {data?.messageCount && data.messageCount > 0 && (
                <span className="flex items-center gap-1">
                  <span className="font-semibold text-primary">{data.messageCount.toLocaleString()}</span> messages analyzed
                </span>
              )}
              {data?.timestamp && (
                <span className="flex items-center gap-1">
                  Updated: {new Date(data.timestamp).toLocaleTimeString()}
                </span>
              )}
            </div>
          </div>
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={forceRefresh}
          disabled={isFetching}
          className="h-8 px-3 text-xs"
        >
          <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isFetching ? 'animate-spin' : ''}`} />
          {isFetching ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>
      
      <ResponsiveContainer width="100%" height="90%">
        <BarChart 
          data={chartData} 
          layout="vertical"
          margin={{ top: 10, right: 30, left: 20, bottom: 10 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(217 33% 17%)" horizontal={false} />
          <XAxis 
            type="number"
            stroke="hsl(215 20% 55%)" 
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <YAxis 
            type="category"
            dataKey="name"
            stroke="hsl(215 20% 55%)" 
            fontSize={11}
            tickLine={false}
            axisLine={false}
            width={220}
            tick={({ x, y, payload }) => (
              <g transform={`translate(${x},${y})`}>
                <text
                  x={-5}
                  y={0}
                  dy={4}
                  textAnchor="end"
                  fill="hsl(210 40% 98%)"
                  fontSize={11}
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
              <div key="tooltip" className="flex flex-col gap-1">
                <span className="font-semibold">{value} mentions</span>
                <span className={`text-xs px-2 py-0.5 rounded border inline-block w-fit ${getSentimentBadge(props.payload.sentiment)}`}>
                  {props.payload.sentiment}
                </span>
              </div>,
              ""
            ]}
          />
          <Bar 
            dataKey="count" 
            radius={[0, 4, 4, 0]}
            maxBarSize={40}
          >
            {chartData.map((entry: any, index: number) => (
              <Cell key={`cell-${index}`} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function NarrativeChart({ symbol, timeRange = '24H' }: NarrativeChartProps) {
  // Use time series stacked bar chart for 7D and 30D
  if (timeRange === '7D' || timeRange === '30D') {
    return <TimeSeriesNarrativeChart symbol={symbol} timeRange={timeRange} />;
  }

  // Use horizontal bar chart for shorter time ranges
  return <HorizontalNarrativeChart symbol={symbol} timeRange={timeRange} />;
}
