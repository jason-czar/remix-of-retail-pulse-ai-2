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
import { useMemo, useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { MarketSessionSelector, MarketSession, SESSION_RANGES } from "./MarketSessionSelector";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface SentimentChartProps {
  symbol: string;
  start?: string;
  end?: string;
  timeRange?: string;
}

// Types for side panel data
interface SentimentSidePanelData {
  label: string;
  sentiment: number | null;
  bullish: number | null;
  bearish: number | null;
  isEmpty: boolean;
}

// Persistent side panel component with liquid glass styling
function SentimentSidePanel({ 
  data, 
  isHovering 
}: { 
  data: SentimentSidePanelData | null;
  isHovering: boolean;
}) {
  if (!data) {
    return (
      <div className={cn(
        "w-[280px] flex-shrink-0 p-5 hidden md:flex items-center justify-center",
        "glass-card"
      )}>
        <p className="text-base text-muted-foreground text-center">
          No data available
        </p>
      </div>
    );
  }

  // Handle empty slots
  if (data.isEmpty) {
    return (
      <div className={cn(
        "w-[280px] flex-shrink-0 p-5 hidden md:block",
        "glass-card"
      )}>
        <span className="font-semibold text-lg text-card-foreground">{data.label}</span>
        <p className="text-base text-muted-foreground mt-2">
          No data available yet
        </p>
        {!isHovering && (
          <div className="mt-4 pt-3 border-t border-border/50 dark:border-white/10">
            <span className="text-sm text-muted-foreground italic">
              Showing latest • Hover chart to explore
            </span>
          </div>
        )}
      </div>
    );
  }

  // Determine sentiment trend
  const getSentimentTrend = () => {
    if (data.sentiment === null) return { label: 'Neutral', icon: Minus, color: 'text-muted-foreground' };
    if (data.sentiment >= 60) return { label: 'Bullish', icon: TrendingUp, color: 'text-emerald-400' };
    if (data.sentiment <= 40) return { label: 'Bearish', icon: TrendingDown, color: 'text-red-400' };
    return { label: 'Neutral', icon: Minus, color: 'text-blue-400' };
  };

  const trend = getSentimentTrend();
  const TrendIcon = trend.icon;
  
  return (
    <div className={cn(
      "w-[280px] flex-shrink-0 p-5 hidden md:block",
      "glass-card",
      !isHovering && "ring-1 ring-primary/20"
    )}>
      {/* Time Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="font-semibold text-lg text-card-foreground">{data.label}</span>
        <div className={cn("flex items-center gap-1.5 text-sm", trend.color)}>
          <TrendIcon className="h-4 w-4" />
          <span className="font-medium">{trend.label}</span>
        </div>
      </div>
      
      {/* Sentiment Score */}
      {data.sentiment !== null && (
        <div className="mb-4 pb-3 border-b border-border/50 dark:border-white/10">
          <div className="text-sm text-muted-foreground mb-1">Sentiment Score</div>
          <div className="flex items-center gap-3">
            <span className="font-bold text-3xl" style={{ color: "hsl(168 84% 45%)" }}>
              {data.sentiment}
            </span>
            <div className="flex-1">
              <div className="h-2 bg-muted/30 dark:bg-white/10 rounded-full overflow-hidden">
                <div 
                  className="h-full rounded-full transition-all"
                  style={{ 
                    width: `${data.sentiment}%`,
                    backgroundColor: "hsl(168 84% 45%)"
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Bullish/Bearish Breakdown */}
      <div className="space-y-3 pt-2">
        <div className="text-sm text-muted-foreground mb-2">Breakdown:</div>
        
        {data.bullish !== null && (
          <div className="flex items-center gap-3">
            <div 
              className="w-3.5 h-3.5 rounded-sm flex-shrink-0" 
              style={{ backgroundColor: "hsl(142 71% 45%)" }}
            />
            <span className="text-card-foreground flex-1 text-sm">Bullish</span>
            <span className="text-sm font-medium" style={{ color: "hsl(142 71% 45%)" }}>
              {data.bullish}
            </span>
          </div>
        )}
        
        {data.bearish !== null && (
          <div className="flex items-center gap-3">
            <div 
              className="w-3.5 h-3.5 rounded-sm flex-shrink-0" 
              style={{ backgroundColor: "hsl(0 72% 51%)" }}
            />
            <span className="text-card-foreground flex-1 text-sm">Bearish</span>
            <span className="text-sm font-medium" style={{ color: "hsl(0 72% 51%)" }}>
              {data.bearish}
            </span>
          </div>
        )}
      </div>
      
      {/* Default indicator */}
      {!isHovering && (
        <div className="mt-4 pt-3 border-t border-border/50 dark:border-white/10">
          <span className="text-sm text-muted-foreground italic">
            Showing latest • Hover chart to explore
          </span>
        </div>
      )}
    </div>
  );
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
  const [marketSession, setMarketSession] = useState<MarketSession>('regular');
  const [hoveredData, setHoveredData] = useState<SentimentSidePanelData | null>(null);
  const [isHovering, setIsHovering] = useState(false);
  
  // Get session-specific hour range
  const { startHour: START_HOUR, endHour: END_HOUR } = SESSION_RANGES[marketSession];
  
  // Helper to parse API time format to hour index
  const parseTimeToHourIndex = (timeStr: string): number | null => {
    if (!timeStr) return null;
    
    // Handle "HH:MM" format (e.g., "7:00", "14:00")
    if (timeStr.includes(':')) {
      const hour = parseInt(timeStr.split(':')[0], 10);
      return isNaN(hour) ? null : hour;
    }
    
    // Handle "X AM/PM" format
    const match = timeStr.match(/^(\d{1,2})\s*(AM|PM)?$/i);
    if (match) {
      let hour = parseInt(match[1], 10);
      const period = match[2]?.toUpperCase();
      if (period === 'PM' && hour !== 12) hour += 12;
      if (period === 'AM' && hour === 12) hour = 0;
      return hour;
    }
    
    return null;
  };

  // Generate data based on time range - regenerates when timeRange changes
  const chartData = useMemo(() => {
    // For Today view, generate skeleton for selected session hours only
    if (timeRange === '1D') {
      const now = new Date();
      const currentHour = now.getHours();

      // Create skeleton for session hours
      const hourSlots: { time: string; hourIndex: number; sentiment: number | null; bullish: number | null; bearish: number | null; isEmpty: boolean }[] = [];
      
      for (let h = START_HOUR; h <= END_HOUR; h++) {
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
      
      // Merge API data if available - match by hour index, not time string
      if (apiData && apiData.length > 0) {
        apiData.forEach(item => {
          const itemHourIndex = parseTimeToHourIndex(item.time);
          if (itemHourIndex !== null) {
            const slot = hourSlots.find(s => s.hourIndex === itemHourIndex);
            if (slot) {
              slot.sentiment = item.sentiment;
              slot.bullish = item.bullish;
              slot.bearish = item.bearish;
              slot.isEmpty = false;
            }
          }
        });
      }
      
      // For hours without data (past hours), generate placeholder values
      hourSlots.forEach((slot) => {
        const h = slot.hourIndex;
        if (h <= currentHour && slot.isEmpty) {
          // Use deterministic values based on hour to avoid re-render flicker
          const baseValue = 55 + Math.sin(h / 4) * 15;
          const noise = ((h * 7) % 10 - 5); // Deterministic "noise" based on hour
          slot.sentiment = Math.round(Math.max(0, Math.min(100, baseValue + noise)));
          slot.bullish = Math.round(Math.max(0, Math.min(100, baseValue + noise + 5)));
          slot.bearish = Math.round(Math.max(0, Math.min(100, 100 - baseValue - noise)));
          slot.isEmpty = false;
        }
      });
      
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
  }, [apiData, timeRange, START_HOUR, END_HOUR]);

  // Get default side panel data (latest non-empty point)
  const defaultSidePanelData = useMemo((): SentimentSidePanelData | null => {
    const nonEmptyPoints = chartData.filter(d => !d.isEmpty);
    if (nonEmptyPoints.length === 0) return null;
    const latest = nonEmptyPoints[nonEmptyPoints.length - 1];
    return {
      label: latest.time,
      sentiment: latest.sentiment,
      bullish: latest.bullish,
      bearish: latest.bearish,
      isEmpty: latest.isEmpty,
    };
  }, [chartData]);

  // Handle mouse move on chart
  const handleMouseMove = useCallback((state: any) => {
    if (state?.activePayload?.length > 0) {
      const dataPoint = state.activePayload[0].payload;
      setHoveredData({
        label: dataPoint.time,
        sentiment: dataPoint.sentiment,
        bullish: dataPoint.bullish,
        bearish: dataPoint.bearish,
        isEmpty: dataPoint.isEmpty,
      });
      setIsHovering(true);
    }
  }, []);

  const handleMouseLeave = useCallback(() => {
    setHoveredData(null);
    setIsHovering(false);
  }, []);

  // Determine which data to show in side panel
  const sidePanelData = hoveredData || defaultSidePanelData;

  if (isLoading) {
    return <Skeleton className="h-[300px] md:h-[400px] w-full" />;
  }

  return (
    <div className="w-full">
      {/* Session selector for Today view */}
      {timeRange === '1D' && (
        <div className="flex justify-end mb-2">
          <MarketSessionSelector session={marketSession} onSessionChange={setMarketSession} />
        </div>
      )}
      
      {/* Main layout: Side panel + Chart */}
      <div className="flex gap-4">
        {/* Persistent Side Panel */}
        <SentimentSidePanel 
          data={sidePanelData} 
          isHovering={isHovering}
        />
        
        {/* Chart */}
        <div className="flex-1 h-[300px] md:h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart 
              data={chartData} 
              margin={{ top: 20, right: 30, left: 0, bottom: 0 }}
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
            >
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
              {/* Mobile tooltip - hidden on desktop where side panel shows */}
              <Tooltip
                content={({ active, payload, label }) => {
                  // Only show tooltip on mobile (side panel handles desktop)
                  if (typeof window !== 'undefined' && window.innerWidth >= 768) {
                    return null;
                  }
                  
                  if (!active || !payload) return null;
                  
                  const dataPoint = payload[0]?.payload;
                  
                  // Handle empty hours (no data yet)
                  if (dataPoint?.isEmpty) {
                    return (
                      <div className="glass-popover rounded-lg p-3 min-w-[150px]">
                        <div className="font-semibold mb-1 text-card-foreground">{label}</div>
                        <p className="text-sm text-muted-foreground">No data available yet</p>
                      </div>
                    );
                  }
                  
                  return (
                    <div className="glass-popover rounded-lg p-3">
                      <div className="font-semibold mb-2 text-card-foreground">{label}</div>
                      <div className="space-y-1 text-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: "hsl(168 84% 45%)" }} />
                          <span className="text-card-foreground">Sentiment: {dataPoint?.sentiment}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: "hsl(142 71% 45%)" }} />
                          <span className="text-card-foreground">Bullish: {dataPoint?.bullish}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: "hsl(0 72% 51%)" }} />
                          <span className="text-card-foreground">Bearish: {dataPoint?.bearish}</span>
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
      </div>
    </div>
  );
}