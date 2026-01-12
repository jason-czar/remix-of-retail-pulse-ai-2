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
import { Skeleton } from "@/components/ui/skeleton";
import { useMemo } from "react";

interface VolumeChartProps {
  symbol: string;
  start?: string;
  end?: string;
  timeRange?: string;
}

const generateVolumeData = (timeRange: string) => {
  const now = new Date();
  const baselineVolume = 5000;
  
  const ranges: Record<string, { points: number; intervalMs: number }> = {
    '1H': { points: 12, intervalMs: 5 * 60 * 1000 },
    '6H': { points: 24, intervalMs: 15 * 60 * 1000 },
    '24H': { points: 24, intervalMs: 60 * 60 * 1000 },
    '7D': { points: 28, intervalMs: 6 * 60 * 60 * 1000 },
    '30D': { points: 30, intervalMs: 24 * 60 * 60 * 1000 },
  };
  
  const config = ranges[timeRange] || ranges['24H'];
  const data = [];
  
  for (let i = config.points - 1; i >= 0; i--) {
    const time = new Date(now.getTime() - i * config.intervalMs);
    // Create a spike at random points
    const spikeMultiplier = i === Math.floor(config.points / 4) ? 3.5 : 
                           i === Math.floor(config.points / 4) - 1 || i === Math.floor(config.points / 4) + 1 ? 2 : 1;
    const volume = Math.round(baselineVolume * spikeMultiplier * (0.7 + Math.random() * 0.6));
    const isSpike = volume > baselineVolume * 2;
    
    let timeLabel: string;
    if (timeRange === '7D' || timeRange === '30D') {
      timeLabel = time.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    } else {
      timeLabel = time.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
    }
    
    data.push({
      time: timeLabel,
      volume,
      baseline: baselineVolume,
      isSpike
    });
  }
  return data;
};

export function VolumeChart({ symbol, start, end, timeRange = '24H' }: VolumeChartProps) {
  const { data: apiData, isLoading } = useVolumeAnalytics(symbol, start, end);
  
  const chartData = useMemo(() => {
    if (apiData && apiData.length > 0) {
      return apiData;
    }
    return generateVolumeData(timeRange);
  }, [apiData, timeRange]);

  const baseline = useMemo(() => {
    if (chartData.length === 0) return 5000;
    const volumes = chartData.map(d => d.volume);
    return Math.round(volumes.reduce((a, b) => a + b, 0) / volumes.length);
  }, [chartData]);

  if (isLoading) {
    return <Skeleton className="h-[400px] w-full" />;
  }

  return (
    <div className="h-[400px] w-full">
      <ResponsiveContainer width="100%" height="100%">
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
            formatter={(value: number) => [`${value.toLocaleString()} messages`, "Volume"]}
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