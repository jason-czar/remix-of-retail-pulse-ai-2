import { 
  BarChart,
  Bar,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  ReferenceLine
} from "recharts";
import { useVolumeAnalytics } from "@/hooks/use-stocktwits";
import { useCachedVolumeAnalytics } from "@/hooks/use-analytics-cache";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useMemo } from "react";
import { Database } from "lucide-react";

interface VolumeChartProps {
  symbol: string;
  start?: string;
  end?: string;
  timeRange?: string;
}

const generateVolumeData = (timeRange: string) => {
  const now = new Date();
  const baselineVolume = 5000;
  
  // For '1D' (Today), generate full 24-hour skeleton
  if (timeRange === '1D') {
    const currentHour = now.getHours();
    const data = [];
    
    for (let h = 0; h < 24; h++) {
      const timeLabel = h === 0 ? '12 AM' : h < 12 ? `${h} AM` : h === 12 ? '12 PM' : `${h - 12} PM`;
      const isPastOrCurrent = h <= currentHour;
      
      if (isPastOrCurrent) {
        const volume = Math.round(baselineVolume * (0.7 + Math.random() * 0.6));
        data.push({
          time: timeLabel,
          volume,
          baseline: baselineVolume,
          isSpike: volume > baselineVolume * 2,
          isEmpty: false,
        });
      } else {
        // Future hours - no data
        data.push({
          time: timeLabel,
          volume: 0,
          baseline: baselineVolume,
          isSpike: false,
          isEmpty: true,
        });
      }
    }
    return data;
  }
  
  const ranges: Record<string, { points: number; intervalMs: number }> = {
    '1H': { points: 12, intervalMs: 5 * 60 * 1000 },
    '6H': { points: 24, intervalMs: 15 * 60 * 1000 },
    '24H': { points: 24, intervalMs: 60 * 60 * 1000 },
    '7D': { points: 7, intervalMs: 24 * 60 * 60 * 1000 },
    '30D': { points: 30, intervalMs: 24 * 60 * 60 * 1000 },
  };
  
  const config = ranges[timeRange] || ranges['24H'];
  const data = [];
  
  for (let i = config.points - 1; i >= 0; i--) {
    const time = new Date(now.getTime() - i * config.intervalMs);
    const spikeMultiplier = i === Math.floor(config.points / 4) ? 3.5 : 
                           i === Math.floor(config.points / 4) - 1 || i === Math.floor(config.points / 4) + 1 ? 2 : 1;
    const volume = Math.round(baselineVolume * spikeMultiplier * (0.7 + Math.random() * 0.6));
    const isSpike = volume > baselineVolume * 2;
    
    let timeLabel: string;
    if (timeRange === '7D' || timeRange === '30D') {
      timeLabel = time.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    } else {
      timeLabel = time.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
    }
    
    data.push({
      time: timeLabel,
      volume,
      baseline: baselineVolume,
      isSpike,
      isEmpty: false,
    });
  }
  return data;
};

export function VolumeChart({ symbol, start, end, timeRange = '24H' }: VolumeChartProps) {
  // Try cache first
  const { data: cacheResult, isLoading: cacheLoading } = useCachedVolumeAnalytics(symbol, timeRange);
  
  // Fall back to API if cache empty
  const { data: apiData, isLoading: apiLoading } = useVolumeAnalytics(
    symbol, 
    timeRange, 
    start, 
    end
  );

  const isLoading = cacheLoading || (cacheResult?.source === 'api' && apiLoading);
  const isFromCache = cacheResult?.source === 'cache';
  const isFromHistory = cacheResult?.source === 'history';
  const snapshotCount = cacheResult?.snapshotCount;
  
  const chartData = useMemo(() => {
    const now = new Date();
    const currentHour = now.getHours();
    const isTodayView = timeRange === '1D';
    
    // For '1D' (Today), always generate 24-hour skeleton
    if (isTodayView) {
      const hourSlots: any[] = [];
      
      for (let h = 0; h < 24; h++) {
        const timeLabel = h === 0 ? '12 AM' : h < 12 ? `${h} AM` : h === 12 ? '12 PM' : `${h - 12} PM`;
        const isPastOrCurrent = h <= currentHour;
        
        hourSlots.push({
          time: timeLabel,
          hour: h,
          volume: 0,
          baseline: 5000,
          isSpike: false,
          isEmpty: !isPastOrCurrent, // Future hours are empty
        });
      }
      
      // Merge cached/API data into slots
      const sourceData = cacheResult?.data || apiData || [];
      if (sourceData.length > 0) {
        const volumes = sourceData.map((d: any) => d.volume || d.message_count || 0);
        const baseline = volumes.length > 0 
          ? Math.round(volumes.reduce((a: number, b: number) => a + b, 0) / volumes.length)
          : 5000;
        
        sourceData.forEach((item: any) => {
          let itemHour: number | null = null;
          
          if (item.recorded_at) {
            const recordedDate = new Date(item.recorded_at);
            const today = new Date();
            if (recordedDate.toDateString() === today.toDateString()) {
              itemHour = recordedDate.getHours();
            }
          } else if (item.time && typeof item.time === 'string') {
            // Parse time label like "12 AM", "1 PM"
            const match = item.time.match(/^(\d{1,2})\s*(AM|PM)$/i);
            if (match) {
              let h = parseInt(match[1]);
              const period = match[2].toUpperCase();
              if (period === 'AM' && h === 12) h = 0;
              else if (period === 'PM' && h !== 12) h += 12;
              itemHour = h;
            }
          }
          
          if (itemHour !== null && itemHour >= 0 && itemHour < 24 && itemHour <= currentHour) {
            const volume = item.volume || item.message_count || item.daily_volume || 0;
            hourSlots[itemHour] = {
              ...hourSlots[itemHour],
              volume,
              baseline,
              isSpike: volume > baseline * 2,
              isEmpty: false,
            };
          }
        });
        
        // Update baseline for all slots
        hourSlots.forEach(slot => {
          slot.baseline = baseline;
        });
      }
      
      return hourSlots;
    }
    
    // Use cache data if available (for non-1D views)
    if (cacheResult?.data && cacheResult.data.length > 0) {
      const volumes = cacheResult.data.map((d: any) => d.volume || d.message_count || 0);
      const baseline = volumes.length > 0 
        ? Math.round(volumes.reduce((a: number, b: number) => a + b, 0) / volumes.length)
        : 5000;
      
      return cacheResult.data.map((item: any) => ({
        time: item.time || item.recorded_at,
        volume: item.volume || item.message_count || item.daily_volume || 0,
        baseline,
        isSpike: (item.volume || item.message_count || 0) > baseline * 2,
        isEmpty: false,
      }));
    }
    
    // Use API data if available
    if (apiData && apiData.length > 0) {
      return apiData;
    }
    
    // Fall back to mock data
    return generateVolumeData(timeRange);
  }, [cacheResult?.data, apiData, timeRange]);

  const baseline = useMemo(() => {
    if (chartData.length === 0) return 5000;
    const volumes = chartData.map(d => d.volume);
    return Math.round(volumes.reduce((a, b) => a + b, 0) / volumes.length);
  }, [chartData]);

  if (isLoading) {
    return <Skeleton className="h-[400px] w-full" />;
  }

  if (chartData.length === 0) {
    return (
      <div className="h-[400px] w-full flex items-center justify-center text-muted-foreground">
        No volume data available for this time range
      </div>
    );
  }

  return (
    <div className="h-[400px] w-full">
      {(isFromCache || isFromHistory) && (
        <div className="flex justify-end mb-2">
          <Badge variant="outline" className="text-xs bg-purple-500/10 text-purple-400 border-purple-500/30">
            <Database className="w-3 h-3 mr-1" />
            {isFromHistory ? `aggregated (${snapshotCount} snapshots)` : 'cached'}
          </Badge>
        </div>
      )}
      <ResponsiveContainer width="100%" height={isFromCache || isFromHistory ? "95%" : "100%"}>
        <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="volumeGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(168 84% 45%)" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="hsl(168 84% 45%)" stopOpacity={0.3}/>
            </linearGradient>
            <linearGradient id="spikeGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(38 92% 50%)" stopOpacity={0.9}/>
              <stop offset="95%" stopColor="hsl(38 92% 50%)" stopOpacity={0.4}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(217 33% 17%)" vertical={false} />
          <XAxis 
            dataKey="time" 
            stroke="hsl(215 20% 55%)" 
            fontSize={12}
            tickLine={false}
            minTickGap={timeRange === '1D' ? 30 : undefined}
          />
          <YAxis 
            stroke="hsl(215 20% 55%)" 
            fontSize={12}
            tickLine={false}
            tickFormatter={(value) => `${(value / 1000).toFixed(1)}K`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(222 47% 8%)",
              border: "1px solid hsl(217 33% 17%)",
              borderRadius: "8px",
              boxShadow: "0 4px 24px -4px hsl(0 0% 0% / 0.3)"
            }}
            labelStyle={{ color: "hsl(210 40% 98%)" }}
            content={({ active, payload, label }) => {
              if (!active || !payload || payload.length === 0) return null;
              const dataPoint = payload[0]?.payload;
              
              if (dataPoint?.isEmpty) {
                return (
                  <div 
                    style={{
                      backgroundColor: "hsl(222 47% 8%)",
                      border: "1px solid hsl(217 33% 17%)",
                      borderRadius: "8px",
                      padding: "12px",
                      boxShadow: "0 4px 24px -4px hsl(0 0% 0% / 0.3)"
                    }}
                  >
                    <div style={{ color: "hsl(210 40% 98%)", fontWeight: 600, marginBottom: "4px" }}>{label}</div>
                    <p style={{ color: "hsl(215 20% 55%)", fontSize: "14px" }}>No data available yet</p>
                  </div>
                );
              }
              
              return (
                <div 
                  style={{
                    backgroundColor: "hsl(222 47% 8%)",
                    border: "1px solid hsl(217 33% 17%)",
                    borderRadius: "8px",
                    padding: "12px",
                    boxShadow: "0 4px 24px -4px hsl(0 0% 0% / 0.3)"
                  }}
                >
                  <div style={{ color: "hsl(210 40% 98%)", fontWeight: 600, marginBottom: "4px" }}>{label}</div>
                  <p style={{ color: "hsl(168 84% 45%)", fontSize: "14px" }}>
                    {dataPoint?.volume?.toLocaleString() || 0} messages
                  </p>
                </div>
              );
            }}
          />
          <ReferenceLine 
            y={baseline} 
            stroke="hsl(215 20% 55%)" 
            strokeDasharray="5 5"
            label={{ value: "Baseline", position: "right", fill: "hsl(215 20% 55%)", fontSize: 12 }}
          />
          <Bar 
            dataKey="volume" 
            fill="url(#volumeGradient)"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}