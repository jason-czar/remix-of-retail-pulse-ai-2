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
  const currentHour = now.getHours();
  
  const ranges: Record<string, { points: number; intervalMs: number }> = {
    '1H': { points: 12, intervalMs: 5 * 60 * 1000 }, // 5 min intervals
    '6H': { points: 24, intervalMs: 15 * 60 * 1000 }, // 15 min intervals
    '1D': { points: 24, intervalMs: 60 * 60 * 1000 }, // Today: all 24 hours (static)
    '24H': { points: 24, intervalMs: 60 * 60 * 1000 }, // 1 hour intervals
    '7D': { points: 28, intervalMs: 6 * 60 * 60 * 1000 }, // 6 hour intervals
    '30D': { points: 30, intervalMs: 24 * 60 * 60 * 1000 }, // 1 day intervals
  };
  
  const config = ranges[timeRange] || ranges['24H'];
  const data = [];
  
  // For 1D (Today), start from midnight in user's timezone and show all 24 hours
  const startTime = timeRange === '1D' 
    ? new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
    : now.getTime() - (config.points - 1) * config.intervalMs;
  
  for (let i = 0; i < config.points; i++) {
    const time = new Date(startTime + i * config.intervalMs);
    const hourIndex = time.getHours();
    
    // For Today view, check if this hour is in the future
    const isFutureHour = timeRange === '1D' && hourIndex > currentHour;
    
    let timeLabel: string;
    if (timeRange === '7D' || timeRange === '30D') {
      // Use user's locale for date formatting
      timeLabel = time.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    } else if (timeRange === '1D') {
      // Use consistent hour labels for Today view (12 AM, 1 AM, etc.)
      const h = hourIndex;
      timeLabel = h === 0 ? '12 AM' : h < 12 ? `${h} AM` : h === 12 ? '12 PM' : `${h - 12} PM`;
    } else {
      // Use user's locale for time formatting
      timeLabel = time.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
    }
    
    // For future hours in Today view, use null values (no data yet)
    if (isFutureHour) {
      data.push({
        time: timeLabel,
        sentiment: null,
        bullish: null,
        bearish: null,
        isEmpty: true,
      });
    } else {
      const baseValue = 55 + Math.sin(i / 4) * 15;
      const noise = (Math.random() - 0.5) * 10;
      
      data.push({
        time: timeLabel,
        sentiment: Math.round(Math.max(0, Math.min(100, baseValue + noise))),
        bullish: Math.round(Math.max(0, Math.min(100, baseValue + noise + 5))),
        bearish: Math.round(Math.max(0, Math.min(100, 100 - baseValue - noise))),
        isEmpty: false,
      });
    }
  }
  return data;
};

export function SentimentChart({ symbol, start, end, timeRange = '24H' }: SentimentChartProps) {
  const { data: apiData, isLoading } = useSentimentAnalytics(symbol, timeRange, start, end);
  
  // Generate data based on time range - regenerates when timeRange changes
  const chartData = useMemo(() => {
    // For Today view, generate static 24-hour skeleton and merge with API data
    if (timeRange === '1D') {
      const now = new Date();
      const currentHour = now.getHours();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      
      // Create 24-hour skeleton
      const hourSlots: { time: string; hourIndex: number; sentiment: number | null; bullish: number | null; bearish: number | null; isEmpty: boolean }[] = [];
      
      for (let h = 0; h < 24; h++) {
        const hourLabel = h === 0 ? '12 AM' : h < 12 ? `${h} AM` : h === 12 ? '12 PM' : `${h - 12} PM`;
        const isFutureHour = h > currentHour;
        
        hourSlots.push({
          time: hourLabel,
          hourIndex: h,
          sentiment: isFutureHour ? null : null, // Will be filled from API data
          bullish: isFutureHour ? null : null,
          bearish: isFutureHour ? null : null,
          isEmpty: true,
        });
      }
      
      // Merge API data if available
      if (apiData && apiData.length > 0) {
        apiData.forEach(item => {
          // Try to match by parsing the time string to hour index
          const slot = hourSlots.find(s => s.time === item.time);
          if (slot) {
            slot.sentiment = item.sentiment;
            slot.bullish = item.bullish;
            slot.bearish = item.bearish;
            slot.isEmpty = false;
          }
        });
      } else {
        // Fall back to generated data for past hours only
        for (let h = 0; h <= currentHour; h++) {
          const baseValue = 55 + Math.sin(h / 4) * 15;
          const noise = (Math.random() - 0.5) * 10;
          hourSlots[h].sentiment = Math.round(Math.max(0, Math.min(100, baseValue + noise)));
          hourSlots[h].bullish = Math.round(Math.max(0, Math.min(100, baseValue + noise + 5)));
          hourSlots[h].bearish = Math.round(Math.max(0, Math.min(100, 100 - baseValue - noise)));
          hourSlots[h].isEmpty = false;
        }
      }
      
      return hourSlots;
    }
    
    // For other time ranges, use original logic
    if (apiData && apiData.length > 0) {
      return apiData.map(item => ({
        time: item.time,
        sentiment: item.sentiment,
        bullish: item.bullish,
        bearish: item.bearish,
        isEmpty: false,
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
            minTickGap={timeRange === '1D' ? 30 : 50}
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
            content={({ active, payload, label }) => {
              if (!active || !payload) return null;
              
              const dataPoint = payload[0]?.payload;
              
              // Handle empty hours (no data yet)
              if (dataPoint?.isEmpty) {
                return (
                  <div 
                    className="p-3 rounded-lg min-w-[150px]"
                    style={{
                      backgroundColor: "hsl(222 47% 8%)",
                      border: "1px solid hsl(217 33% 17%)",
                      boxShadow: "0 4px 24px -4px hsl(0 0% 0% / 0.3)"
                    }}
                  >
                    <div className="font-semibold mb-1" style={{ color: "hsl(210 40% 98%)" }}>{label}</div>
                    <p className="text-sm" style={{ color: "hsl(215 20% 55%)" }}>No data available yet</p>
                  </div>
                );
              }
              
              return (
                <div 
                  className="p-3 rounded-lg"
                  style={{
                    backgroundColor: "hsl(222 47% 8%)",
                    border: "1px solid hsl(217 33% 17%)",
                    boxShadow: "0 4px 24px -4px hsl(0 0% 0% / 0.3)"
                  }}
                >
                  <div className="font-semibold mb-2" style={{ color: "hsl(210 40% 98%)" }}>{label}</div>
                  <div className="space-y-1 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: "hsl(168 84% 45%)" }} />
                      <span style={{ color: "hsl(210 40% 98%)" }}>Sentiment: {dataPoint?.sentiment}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: "hsl(142 71% 45%)" }} />
                      <span style={{ color: "hsl(210 40% 98%)" }}>Bullish: {dataPoint?.bullish}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: "hsl(0 72% 51%)" }} />
                      <span style={{ color: "hsl(210 40% 98%)" }}>Bearish: {dataPoint?.bearish}</span>
                    </div>
                  </div>
                </div>
              );
            }}
          />
          <ReferenceLine y={50} stroke="hsl(215 20% 55%)" strokeDasharray="5 5" />
          <Line 
            type="monotone" 
            dataKey="sentiment" 
            stroke="hsl(168 84% 45%)" 
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 6, fill: "hsl(168 84% 45%)" }}
            connectNulls={false}
          />
          <Line 
            type="monotone" 
            dataKey="bullish" 
            stroke="hsl(142 71% 45%)" 
            strokeWidth={1.5}
            strokeDasharray="5 5"
            dot={false}
            connectNulls={false}
          />
          <Line 
            type="monotone" 
            dataKey="bearish" 
            stroke="hsl(0 72% 51%)" 
            strokeWidth={1.5}
            strokeDasharray="5 5"
            dot={false}
            connectNulls={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}