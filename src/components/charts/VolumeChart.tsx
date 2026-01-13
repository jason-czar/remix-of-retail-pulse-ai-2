import { 
  ComposedChart,
  Bar,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  ReferenceLine,
  Rectangle
} from "recharts";
import { useVolumeAnalytics } from "@/hooks/use-stocktwits";
import { useCachedVolumeAnalytics } from "@/hooks/use-analytics-cache";
import { usePriceOverlay } from "@/hooks/use-price-overlay";
import { 
  PriceLine, 
  PriceYAxis, 
  PriceToggle, 
  PriceTooltipInline,
  PRICE_LINE_COLOR 
} from "@/components/charts/PriceOverlayElements";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useMemo, useState } from "react";
import { Database } from "lucide-react";
import { TimeRange } from "@/lib/stock-price-api";

interface VolumeChartProps {
  symbol: string;
  start?: string;
  end?: string;
  timeRange?: string;
}

const SLOTS_PER_HOUR = 12; // 5-minute slots per hour

// Custom bar shape that expands width to cover full hour in 5-min view
function WideBarShape(props: any) {
  const { x, y, width, height, fill, radius, payload, is5MinView } = props;
  
  if (is5MinView) {
    if (!payload?.isHourStart || height === 0) {
      return null;
    }
    const expandedWidth = width * SLOTS_PER_HOUR;
    return (
      <Rectangle
        x={x}
        y={y}
        width={expandedWidth}
        height={height}
        fill={fill}
        radius={radius}
      />
    );
  }
  
  return (
    <Rectangle
      x={x}
      y={y}
      width={width}
      height={height}
      fill={fill}
      radius={radius}
    />
  );
}

const generateVolumeData = (timeRange: string) => {
  const now = new Date();
  const baselineVolume = 5000;
  
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
  const [showPriceOverlay, setShowPriceOverlay] = useState(true);
  
  const { data: cacheResult, isLoading: cacheLoading } = useCachedVolumeAnalytics(symbol, timeRange);
  const { data: apiData, isLoading: apiLoading } = useVolumeAnalytics(symbol, timeRange, start, end);

  const isLoading = cacheLoading || (cacheResult?.source === 'api' && apiLoading);
  const isFromCache = cacheResult?.source === 'cache';
  const isFromHistory = cacheResult?.source === 'history';
  const snapshotCount = cacheResult?.snapshotCount;
  
  const is5MinView = timeRange === '1D';
  const showPriceToggle = timeRange === '1D' || timeRange === '24H';
  
  const chartData = useMemo(() => {
    const now = new Date();
    const currentHour = now.getHours();
    
    if (timeRange === '1D') {
      const TOTAL_SLOTS = 24 * SLOTS_PER_HOUR;
      const hourlyVolumes: Map<number, { volume: number; isEmpty: boolean }> = new Map();
      
      for (let h = 0; h < 24; h++) {
        hourlyVolumes.set(h, { volume: 0, isEmpty: h > currentHour });
      }
      
      const sourceData = cacheResult?.data || apiData || [];
      const volumes = sourceData.map((d: any) => d.volume || d.message_count || 0);
      const baseline = volumes.length > 0 
        ? Math.round(volumes.reduce((a: number, b: number) => a + b, 0) / Math.max(volumes.length, 1))
        : 5000;
      
      if (sourceData.length > 0) {
        sourceData.forEach((item: any) => {
          let itemHour: number | null = null;
          
          if (item.recorded_at) {
            const recordedDate = new Date(item.recorded_at);
            const today = new Date();
            if (recordedDate.toDateString() === today.toDateString()) {
              itemHour = recordedDate.getHours();
            }
          } else if (item.time && typeof item.time === 'string') {
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
            hourlyVolumes.set(itemHour, { volume, isEmpty: false });
          }
        });
      } else {
        for (let h = 0; h <= currentHour; h++) {
          hourlyVolumes.set(h, { 
            volume: Math.round(baseline * (0.7 + Math.random() * 0.6)), 
            isEmpty: false 
          });
        }
      }
      
      const slots: any[] = [];
      
      for (let slotIdx = 0; slotIdx < TOTAL_SLOTS; slotIdx++) {
        const hour = Math.floor(slotIdx / SLOTS_PER_HOUR);
        const isHourStart = slotIdx % SLOTS_PER_HOUR === 0;
        const hourLabel = hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`;
        
        const hourData = hourlyVolumes.get(hour)!;
        
        slots.push({
          time: hourLabel,
          slotIndex: slotIdx,
          hour,
          hourIndex: hour,
          isHourStart,
          volume: isHourStart ? hourData.volume : 0,
          baseline,
          isSpike: hourData.volume > baseline * 2,
          isEmpty: hourData.isEmpty,
        });
      }
      
      return slots;
    }
    
    if (timeRange === '24H') {
      const hourSlots: any[] = [];
      const sourceData = cacheResult?.data || apiData || [];
      const volumes = sourceData.map((d: any) => d.volume || d.message_count || 0);
      const baseline = volumes.length > 0 
        ? Math.round(volumes.reduce((a: number, b: number) => a + b, 0) / Math.max(volumes.length, 1))
        : 5000;
      
      for (let h = 0; h < 24; h++) {
        const timeLabel = h === 0 ? '12 AM' : h < 12 ? `${h} AM` : h === 12 ? '12 PM' : `${h - 12} PM`;
        
        hourSlots.push({
          time: timeLabel,
          hour: h,
          hourIndex: h,
          volume: 0,
          baseline,
          isSpike: false,
          isEmpty: true,
        });
      }
      
      if (sourceData.length > 0) {
        sourceData.forEach((item: any) => {
          let itemHour: number | null = null;
          
          if (item.recorded_at) {
            itemHour = new Date(item.recorded_at).getHours();
          } else if (item.time && typeof item.time === 'string') {
            const match = item.time.match(/^(\d{1,2})\s*(AM|PM)$/i);
            if (match) {
              let h = parseInt(match[1]);
              const period = match[2].toUpperCase();
              if (period === 'AM' && h === 12) h = 0;
              else if (period === 'PM' && h !== 12) h += 12;
              itemHour = h;
            }
          }
          
          if (itemHour !== null && itemHour >= 0 && itemHour < 24) {
            const volume = item.volume || item.message_count || item.daily_volume || 0;
            hourSlots[itemHour] = {
              ...hourSlots[itemHour],
              volume,
              isSpike: volume > baseline * 2,
              isEmpty: false,
            };
          }
        });
      } else {
        for (let h = 0; h < 24; h++) {
          hourSlots[h].volume = Math.round(baseline * (0.7 + Math.random() * 0.6));
          hourSlots[h].isEmpty = false;
        }
      }
      
      return hourSlots;
    }
    
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
    
    if (apiData && apiData.length > 0) {
      return apiData;
    }
    
    return generateVolumeData(timeRange);
  }, [cacheResult?.data, apiData, timeRange]);

  // Use reusable price overlay hook
  const { 
    dataWithPrice: chartDataWithPrice, 
    priceDomain, 
    currentPrice,
    changePercent,
    isSupported: priceSupported 
  } = usePriceOverlay(
    {
      symbol,
      timeRange: timeRange as TimeRange,
      enabled: showPriceOverlay && showPriceToggle,
      use5MinSlots: is5MinView,
    },
    chartData,
    {
      getSlotIndex: (item) => item.slotIndex,
      getHourIndex: (item) => item.hourIndex ?? item.hour,
    }
  );

  const baseline = useMemo(() => {
    if (chartData.length === 0) return 5000;
    const volumes = chartData.map((d: any) => d.volume || 0);
    return Math.round(volumes.reduce((a: number, b: number) => a + b, 0) / Math.max(volumes.length, 1));
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

  const showPrice = showPriceOverlay && showPriceToggle && priceSupported;

  return (
    <div className="h-[400px] w-full">
      <div className="flex justify-between items-center mb-2">
        {(isFromCache || isFromHistory) ? (
          <Badge variant="outline" className="text-xs bg-purple-500/10 text-purple-400 border-purple-500/30">
            <Database className="w-3 h-3 mr-1" />
            {isFromHistory ? `aggregated (${snapshotCount} snapshots)` : 'cached'}
          </Badge>
        ) : <div />}
        
        {showPriceToggle && (
          <PriceToggle
            enabled={showPriceOverlay}
            onToggle={setShowPriceOverlay}
            currentPrice={currentPrice}
            changePercent={changePercent}
          />
        )}
      </div>
      
      <ResponsiveContainer width="100%" height="95%">
        <ComposedChart 
          data={chartDataWithPrice} 
          margin={{ top: 20, right: showPrice ? 60 : 30, left: 0, bottom: 0 }}
          barCategoryGap={is5MinView ? 0 : undefined}
          barGap={is5MinView ? 0 : undefined}
        >
          <defs>
            <linearGradient id="volumeGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(168 84% 45%)" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="hsl(168 84% 45%)" stopOpacity={0.3}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(217 33% 17%)" vertical={false} />
          <XAxis 
            dataKey={is5MinView ? "slotIndex" : "time"}
            stroke="hsl(215 20% 55%)" 
            fontSize={12}
            tickLine={false}
            interval={is5MinView ? 11 : undefined}
            minTickGap={timeRange === '1D' ? 30 : undefined}
            tick={is5MinView ? ({ x, y, payload }: { x: number; y: number; payload: { index: number; value: any } }) => {
              // In 5-min view, use slotIndex for unique categories; render labels only at hour boundaries.
              const item = chartDataWithPrice[payload.index] as any;
              if (!item?.isHourStart) return null;
              return (
                <text x={x} y={y + 12} textAnchor="middle" fill="hsl(215 20% 55%)" fontSize={12}>
                  {item.time}
                </text>
              );
            } : undefined}
          />
          <YAxis 
            yAxisId="left"
            stroke="hsl(215 20% 55%)" 
            fontSize={12}
            tickLine={false}
            tickFormatter={(value) => `${(value / 1000).toFixed(1)}K`}
          />
          {showPrice && <PriceYAxis domain={priceDomain} yAxisId="price" />}
          <Tooltip
            content={({ active, payload, label }) => {
              if (!active || !payload || payload.length === 0) return null;
              const dataPoint = payload[0]?.payload;
              
              if (dataPoint?.isEmpty) {
                return (
                  <div className="bg-[hsl(222_47%_8%)] border border-[hsl(217_33%_17%)] rounded-lg p-3 shadow-xl">
                    <div className="font-semibold text-foreground mb-1">{label}</div>
                    <p className="text-sm text-muted-foreground">No data available yet</p>
                    {dataPoint.price != null && (
                      <div className="mt-2 pt-2 border-t border-border/50">
                        <PriceTooltipInline price={dataPoint.price} />
                      </div>
                    )}
                  </div>
                );
              }
              
              return (
                <div className="bg-[hsl(222_47%_8%)] border border-[hsl(217_33%_17%)] rounded-lg p-3 shadow-xl">
                  <div className="font-semibold text-foreground mb-1">{label}</div>
                  {dataPoint.price != null && (
                    <div className="mb-2 pb-2 border-b border-border/50">
                      <PriceTooltipInline price={dataPoint.price} />
                    </div>
                  )}
                  <p className="text-sm text-primary">
                    {dataPoint?.volume?.toLocaleString() || 0} messages
                  </p>
                </div>
              );
            }}
          />
          <ReferenceLine 
            yAxisId="left"
            y={baseline} 
            stroke="hsl(215 20% 55%)" 
            strokeDasharray="5 5"
            label={{ value: "Baseline", position: "right", fill: "hsl(215 20% 55%)", fontSize: 12 }}
          />
          <Bar 
            yAxisId="left"
            dataKey="volume" 
            fill="url(#volumeGradient)"
            shape={is5MinView ? (props: any) => (
              <WideBarShape 
                {...props} 
                is5MinView={is5MinView}
                radius={[4, 4, 0, 0]}
              />
            ) : undefined}
            radius={!is5MinView ? [4, 4, 0, 0] : undefined}
          />
          {showPrice && <PriceLine yAxisId="price" />}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
