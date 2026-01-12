import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  ReferenceLine 
} from "recharts";
import { useSentimentAnalytics } from "@/hooks/use-stocktwits";
import { Skeleton } from "@/components/ui/skeleton";
import { useMemo } from "react";

interface SentimentChartProps {
  symbol: string;
  start?: string;
  end?: string;
  timeRange?: string;
}

// Generate chart data based on time range
const generateDataPoints = (timeRange: string) => {
  const now = new Date();
  const ranges: Record<string, { points: number; intervalMs: number }> = {
    '1H': { points: 12, intervalMs: 5 * 60 * 1000 }, // 5 min intervals
    '6H': { points: 24, intervalMs: 15 * 60 * 1000 }, // 15 min intervals
    '24H': { points: 24, intervalMs: 60 * 60 * 1000 }, // 1 hour intervals
    '7D': { points: 28, intervalMs: 6 * 60 * 60 * 1000 }, // 6 hour intervals
    '30D': { points: 30, intervalMs: 24 * 60 * 60 * 1000 }, // 1 day intervals
  };
  
  const config = ranges[timeRange] || ranges['24H'];
  const data = [];
  
  for (let i = config.points - 1; i >= 0; i--) {
    const time = new Date(now.getTime() - i * config.intervalMs);
    const baseValue = 55 + Math.sin(i / 4) * 15;
    const noise = (Math.random() - 0.5) * 10;
    
    let timeLabel: string;
    if (timeRange === '7D' || timeRange === '30D') {
      timeLabel = time.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    } else {
      timeLabel = time.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
    }
    
    data.push({
      time: timeLabel,
      sentiment: Math.round(Math.max(0, Math.min(100, baseValue + noise))),
      bullish: Math.round(Math.max(0, Math.min(100, baseValue + noise + 5))),
      bearish: Math.round(Math.max(0, Math.min(100, 100 - baseValue - noise)))
    });
  }
  return data;
};

export function SentimentChart({ symbol, start, end, timeRange = '24H' }: SentimentChartProps) {
  const { data: apiData, isLoading } = useSentimentAnalytics(symbol, timeRange, start, end);
  
  // Generate data based on time range - regenerates when timeRange changes
  const chartData = useMemo(() => {
    if (apiData && apiData.length > 0) {
      return apiData.map(item => ({
        time: item.time,
        sentiment: item.sentiment,
        bullish: item.bullish,
        bearish: item.bearish
      }));
    }
    // Fall back to generated data if API returns nothing
    return generateDataPoints(timeRange);
  }, [apiData, timeRange]);

  if (isLoading) {
    return <Skeleton className="h-[400px] w-full" />;
  }

  return (
    <div className="h-[400px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="sentimentGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(168 84% 45%)" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="hsl(168 84% 45%)" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(217 33% 17%)" />
          <XAxis 
            dataKey="time" 
            stroke="hsl(215 20% 55%)" 
            fontSize={12}
            tickLine={false}
          />
          <YAxis 
            domain={[0, 100]} 
            stroke="hsl(215 20% 55%)" 
            fontSize={12}
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
            itemStyle={{ color: "hsl(168 84% 45%)" }}
          />
          <ReferenceLine y={50} stroke="hsl(215 20% 55%)" strokeDasharray="5 5" />
          <Line 
            type="monotone" 
            dataKey="sentiment" 
            stroke="hsl(168 84% 45%)" 
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 6, fill: "hsl(168 84% 45%)" }}
          />
          <Line 
            type="monotone" 
            dataKey="bullish" 
            stroke="hsl(142 71% 45%)" 
            strokeWidth={1.5}
            strokeDasharray="5 5"
            dot={false}
          />
          <Line 
            type="monotone" 
            dataKey="bearish" 
            stroke="hsl(0 72% 51%)" 
            strokeWidth={1.5}
            strokeDasharray="5 5"
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}