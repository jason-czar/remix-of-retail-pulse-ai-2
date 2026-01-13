import { 
  BarChart,
  Bar,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from "recharts";
import { useMemo } from "react";
import { useNarrativeAnalysis, Narrative } from "@/hooks/use-narrative-analysis";
import { AlertCircle, RefreshCw, Sparkles } from "lucide-react";
import { AIAnalysisLoader } from "@/components/AIAnalysisLoader";
import { Button } from "@/components/ui/button";

type TimeRange = '1H' | '6H' | '24H' | '7D' | '30D';

interface NarrativeChartProps {
  symbol: string;
  timeRange?: TimeRange;
  start?: string;
  end?: string;
}

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

export function NarrativeChart({ symbol, timeRange = '24H' }: NarrativeChartProps) {
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
      
      <ResponsiveContainer width="100%" height="85%">
        <BarChart 
          data={chartData} 
          layout="vertical"
          margin={{ top: 10, right: 30, left: 10, bottom: 10 }}
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
            fontSize={12}
            tickLine={false}
            axisLine={false}
            width={150}
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
      
      {/* Legend with sentiment indicators */}
      <div className="flex flex-wrap gap-3 mt-2 justify-center">
        {chartData.map((narrative: any, index: number) => (
          <div 
            key={narrative.name}
            className="flex items-center gap-2 text-xs"
          >
            <div 
              className="w-3 h-3 rounded-sm" 
              style={{ backgroundColor: narrative.fill }}
            />
            <span className="text-muted-foreground">{narrative.name}</span>
            <span className={`px-1.5 py-0.5 rounded text-[10px] border ${getSentimentBadge(narrative.sentiment)}`}>
              {narrative.sentiment}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
