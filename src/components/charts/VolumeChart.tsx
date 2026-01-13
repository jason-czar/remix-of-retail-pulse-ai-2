import { 
  ComposedChart,
  Bar,
  Line,
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
import { useStockPrice } from "@/hooks/use-stock-price";
import { alignPricesToFiveMinSlots, alignPricesToHourSlots } from "@/lib/stock-price-api";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useMemo, useState } from "react";
import { Database, DollarSign } from "lucide-react";
import { MarketSessionSelector, MarketSession, SESSION_RANGES } from "./MarketSessionSelector";

type TimeRange = '1H' | '6H' | '1D' | '24H' | '7D' | '30D';

interface VolumeChartProps {
  symbol: string;
  start?: string;
  end?: string;
  timeRange?: string;
}

// Stock price line colors based on price vs previous close
const PRICE_UP_COLOR = "#00C805";   // Green when above previous close
const PRICE_DOWN_COLOR = "#FF6A26"; // Orange-red when below previous close
const SLOTS_PER_HOUR = 12; // 5-minute slots per hour

// Custom bar shape that expands width to cover full hour in 5-min view
function WideBarShape(props: any) {
  const { x, y, width, height, fill, radius, payload, is5MinView, activeHour } = props;
  
  // Determine opacity: 50% when this hour is hovered, 25% otherwise
  const isHourActive = activeHour !== null && payload?.hourIndex === activeHour;
  const opacity = isHourActive ? 0.5 : 0.25;
  
  // Smooth transition style for opacity changes
  const transitionStyle = { transition: 'fill-opacity 0.2s ease-out' };
  
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
        fillOpacity={opacity}
        radius={radius}
        style={transitionStyle}
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
      fillOpacity={opacity}
      radius={radius}
      style={transitionStyle}
    />
  );
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
  const [showPriceOverlay, setShowPriceOverlay] = useState(true);
  const [activeHour, setActiveHour] = useState<number | null>(null);
  const [marketSession, setMarketSession] = useState<MarketSession>('regular');
  
  // Get session-specific hour range
  const { startHour: START_HOUR, endHour: END_HOUR } = SESSION_RANGES[marketSession];
  const VISIBLE_HOURS = END_HOUR - START_HOUR + 1;
  
  // Try cache first
  const { data: cacheResult, isLoading: cacheLoading } = useCachedVolumeAnalytics(symbol, timeRange);
  
  // Fall back to API if cache empty
  const { data: apiData, isLoading: apiLoading } = useVolumeAnalytics(
    symbol, 
    timeRange, 
    start, 
    end
  );
  
  // Fetch stock price data
  const { data: priceData, isLoading: priceLoading } = useStockPrice(
    symbol, 
    timeRange as TimeRange, 
    showPriceOverlay && (timeRange === '1D' || timeRange === '24H')
  );

  // Determine price line color based on current price vs previous close
  const priceLineColor = useMemo(() => {
    if (!priceData?.currentPrice || !priceData?.previousClose) {
      return PRICE_UP_COLOR; // Default to green
    }
    return priceData.currentPrice >= priceData.previousClose ? PRICE_UP_COLOR : PRICE_DOWN_COLOR;
  }, [priceData?.currentPrice, priceData?.previousClose]);

  const isLoading = cacheLoading || (cacheResult?.source === 'api' && apiLoading);
  const isFromCache = cacheResult?.source === 'cache';
  const isFromHistory = cacheResult?.source === 'history';
  const snapshotCount = cacheResult?.snapshotCount;
  
  const is5MinView = timeRange === '1D';
  
  const chartData = useMemo(() => {
    const now = new Date();
    const currentHour = now.getHours();
    const isTodayView = timeRange === '1D';
    
    // For '1D' (Today), use 5-minute slots for granular price line
    if (isTodayView) {
      const TOTAL_SLOTS = VISIBLE_HOURS * SLOTS_PER_HOUR;
      
      // First, collect hourly volume data
      const hourlyVolumes: Map<number, { volume: number; isEmpty: boolean }> = new Map();
      
      // Initialize hours based on selected session
      for (let h = START_HOUR; h <= END_HOUR; h++) {
        hourlyVolumes.set(h, { volume: 0, isEmpty: h > currentHour });
      }
      
      // Fill in actual volume data if available
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
            // Handle "HH:MM" format (e.g., "7:00", "14:00")
            if (item.time.includes(':')) {
              const hour = parseInt(item.time.split(':')[0], 10);
              if (!isNaN(hour)) {
                itemHour = hour;
              }
            } else {
              // Handle "X AM/PM" format
              const match = item.time.match(/^(\d{1,2})\s*(AM|PM)?$/i);
              if (match) {
                let h = parseInt(match[1]);
                const period = match[2]?.toUpperCase();
                if (period === 'AM' && h === 12) h = 0;
                else if (period === 'PM' && h !== 12) h += 12;
                itemHour = h;
              }
            }
          }
          
          if (itemHour !== null && itemHour >= 0 && itemHour < 24 && itemHour <= currentHour) {
            const volume = item.volume || item.message_count || item.daily_volume || 0;
            hourlyVolumes.set(itemHour, { volume, isEmpty: false });
          }
        });
      } else {
        // Generate mock data for past hours (deterministic based on hour)
        for (let h = 0; h <= currentHour; h++) {
          const noise = ((h * 7) % 10 - 5) / 10; // Deterministic "noise" based on hour
          hourlyVolumes.set(h, { 
            volume: Math.round(baseline * (0.7 + 0.3 + noise)), 
            isEmpty: false 
          });
        }
      }
      
      // Build chart data slots
      const slots: any[] = [];
      
      for (let slotIdx = 0; slotIdx < TOTAL_SLOTS; slotIdx++) {
        const hour = START_HOUR + Math.floor(slotIdx / SLOTS_PER_HOUR);
        const isHourStart = slotIdx % SLOTS_PER_HOUR === 0;
        const hourLabel = hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`;
        
        const hourData = hourlyVolumes.get(hour)!;
        
        slots.push({
          time: hourLabel,
          slotIndex: slotIdx,
          hour,
          isHourStart,
          volume: isHourStart ? hourData.volume : 0, // Only put volume at hour start
          baseline,
          isSpike: hourData.volume > baseline * 2,
          isEmpty: hourData.isEmpty,
        });
      }
      
      return slots;
    }
    
    // For '24H', generate 24 hourly slots
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
      
      // Merge data
      if (sourceData.length > 0) {
        sourceData.forEach((item: any) => {
          let itemHour: number | null = null;
          
          if (item.recorded_at) {
            itemHour = new Date(item.recorded_at).getHours();
          } else if (item.time && typeof item.time === 'string') {
            // Handle "HH:MM" format (e.g., "7:00", "14:00")
            if (item.time.includes(':')) {
              const hour = parseInt(item.time.split(':')[0], 10);
              if (!isNaN(hour)) {
                itemHour = hour;
              }
            } else {
              // Handle "X AM/PM" format
              const match = item.time.match(/^(\d{1,2})\s*(AM|PM)?$/i);
              if (match) {
                let h = parseInt(match[1]);
                const period = match[2]?.toUpperCase();
                if (period === 'AM' && h === 12) h = 0;
                else if (period === 'PM' && h !== 12) h += 12;
                itemHour = h;
              }
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
        // Generate mock data (deterministic based on hour)
        for (let h = 0; h < 24; h++) {
          const noise = ((h * 7) % 10 - 5) / 10; // Deterministic "noise"
          hourSlots[h].volume = Math.round(baseline * (0.7 + 0.3 + noise));
          hourSlots[h].isEmpty = false;
        }
      }
      
      return hourSlots;
    }
    
    // Use cache data if available (for other views)
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
  }, [cacheResult?.data, apiData, timeRange, START_HOUR, END_HOUR, VISIBLE_HOURS]);

  // Merge price data into chart data
  const chartDataWithPrice = useMemo(() => {
    if (!showPriceOverlay || !priceData?.prices || priceData.prices.length === 0) {
      return chartData;
    }

    // For 5-minute view (Today), use 5-minute slot alignment for granular price line
    if (is5MinView) {
      const priceBySlot = alignPricesToFiveMinSlots(priceData.prices, START_HOUR, END_HOUR);
      
      return chartData.map((item: any) => {
        const slotIndex = item.slotIndex;
        const pricePoint = priceBySlot.get(slotIndex);
        return {
          ...item,
          price: pricePoint?.price ?? null,
        };
      });
    }

    // Build hour-to-price map for 24H view
    if (timeRange === '24H') {
      const priceByHour = alignPricesToHourSlots(priceData.prices, timeRange as TimeRange);
      
      return chartData.map((item: any) => {
        const hourIndex = item.hourIndex ?? item.hour;
        const pricePoint = priceByHour.get(hourIndex);
        return {
          ...item,
          price: pricePoint?.price ?? null,
        };
      });
    }

    return chartData;
  }, [chartData, priceData, showPriceOverlay, timeRange, is5MinView, START_HOUR, END_HOUR]);

  // Calculate baseline
  const baseline = useMemo(() => {
    if (chartData.length === 0) return 5000;
    const volumes = chartData.map((d: any) => d.volume || 0);
    return Math.round(volumes.reduce((a: number, b: number) => a + b, 0) / Math.max(volumes.length, 1));
  }, [chartData]);

  // Calculate price domain for right Y-axis - tight padding to fill vertical space
  const priceDomain = useMemo(() => {
    if (!showPriceOverlay || !priceData?.prices || priceData.prices.length === 0) {
      return ['auto', 'auto'];
    }
    const prices = priceData.prices.map(p => p.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const range = maxPrice - minPrice;
    // Use 3% padding for tight fit, minimum $0.25 to handle flat prices
    const padding = Math.max(range * 0.03, 0.25);
    // Round to nearest $0.25 for cleaner axis labels
    const roundTo = 0.25;
    return [
      Math.floor((minPrice - padding) / roundTo) * roundTo,
      Math.ceil((maxPrice + padding) / roundTo) * roundTo
    ];
  }, [priceData, showPriceOverlay]);

  const showPriceToggle = timeRange === '1D' || timeRange === '24H';

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
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center gap-2">
          {(isFromCache || isFromHistory) && (
            <Badge variant="outline" className="text-xs bg-purple-500/10 text-purple-400 border-purple-500/30">
              <Database className="w-3 h-3 mr-1" />
              {isFromHistory ? `aggregated (${snapshotCount} snapshots)` : 'cached'}
            </Badge>
          )}
          {/* Market Session Selector - only for Today view */}
          {timeRange === '1D' && (
            <MarketSessionSelector 
              session={marketSession} 
              onSessionChange={setMarketSession}
            />
          )}
        </div>
        
        {showPriceToggle && (
          <div className="flex items-center gap-2">
            <DollarSign 
              className="h-4 w-4" 
              style={{ color: showPriceOverlay ? priceLineColor : 'hsl(var(--muted-foreground))' }} 
            />
            <span className="text-xs text-muted-foreground">Price</span>
            <Switch
              checked={showPriceOverlay}
              onCheckedChange={setShowPriceOverlay}
              style={{ backgroundColor: showPriceOverlay ? priceLineColor : undefined }}
            />
            {showPriceOverlay && priceData?.currentPrice && (
              <span className="text-xs font-semibold ml-1" style={{ color: priceLineColor }}>
                ${priceData.currentPrice.toFixed(2)}
              </span>
            )}
          </div>
        )}
      </div>
      
      <ResponsiveContainer width="100%" height="95%">
        <ComposedChart 
          data={chartDataWithPrice} 
          margin={{ top: 20, right: showPriceOverlay && showPriceToggle ? 60 : 30, left: 0, bottom: 0 }}
          barCategoryGap={is5MinView ? 0 : undefined}
          barGap={is5MinView ? 0 : undefined}
          onMouseMove={(state: any) => {
            if (state?.activePayload?.[0]?.payload?.hourIndex !== undefined) {
              setActiveHour(state.activePayload[0].payload.hourIndex);
            }
          }}
          onMouseLeave={() => setActiveHour(null)}
        >
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
            interval={is5MinView ? 11 : undefined}
            minTickGap={timeRange === '1D' ? 30 : undefined}
            tick={is5MinView ? ({ x, y, payload }: { x: number; y: number; payload: { index: number; value: string } }) => {
              const item = chartDataWithPrice[payload.index] as any;
              if (!item?.isHourStart) return null;
              return (
                <text x={x} y={y + 12} textAnchor="middle" fill="hsl(215 20% 55%)" fontSize={12}>
                  {payload.value}
                </text>
              );
            } : undefined}
          />
          <YAxis 
            yAxisId="left"
            stroke="hsl(215 20% 55%)" 
            fontSize={12}
            tickLine={false}
            axisLine={false}
            width={10}
            tick={false}
          />
          {showPriceOverlay && showPriceToggle && (
            <YAxis 
              yAxisId="right"
              orientation="right"
              stroke={priceLineColor}
              fontSize={11}
              tickLine={false}
              axisLine={false}
              width={10}
              tick={false}
              domain={priceDomain as [number, number]}
            />
          )}
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "8px",
              boxShadow: "0 4px 24px -4px hsl(0 0% 0% / 0.3)"
            }}
            labelStyle={{ color: "hsl(var(--card-foreground))" }}
            content={({ active, payload, label }) => {
              if (!active || !payload || payload.length === 0) return null;
              const dataPoint = payload[0]?.payload;
              
              if (dataPoint?.isEmpty) {
                return (
                  <div className="bg-card border border-border rounded-lg p-3 shadow-xl">
                    <div className="font-semibold mb-1 text-card-foreground">{label}</div>
                    <p className="text-sm text-muted-foreground">No data available yet</p>
                    {dataPoint.price != null && (
                      <div className="mt-2 pt-2 border-t border-border">
                        <div className="flex items-center gap-1.5">
                          <span style={{ color: priceLineColor }} className="font-semibold">${dataPoint.price.toFixed(2)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              }
              
              return (
                <div className="bg-card border border-border rounded-lg p-3 shadow-xl">
                  <div className="font-semibold mb-1 text-card-foreground">{label}</div>
                  {dataPoint.price != null && (
                    <div className="mb-2 pb-2 border-b border-border">
                      <div className="flex items-center gap-1.5">
                        <DollarSign style={{ width: 14, height: 14, color: priceLineColor }} />
                        <span style={{ color: priceLineColor }} className="font-bold text-base">${dataPoint.price.toFixed(2)}</span>
                      </div>
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
                activeHour={activeHour}
                radius={[4, 4, 0, 0]}
              />
            ) : undefined}
            activeBar={!is5MinView ? { fillOpacity: 0.7 } : false}
            radius={!is5MinView ? [4, 4, 0, 0] : undefined}
          />
          {/* Price Line Overlay */}
          {showPriceOverlay && showPriceToggle && (
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="price"
              stroke={priceLineColor}
              strokeWidth={2}
              dot={false}
              activeDot={{ fill: priceLineColor, strokeWidth: 2, stroke: "#fff", r: 5 }}
              connectNulls
            />
          )}
          {/* Previous Close Reference Line - only on Today view */}
          {showPriceOverlay && showPriceToggle && is5MinView && priceData?.previousClose && (
            <ReferenceLine
              yAxisId="right"
              y={priceData.previousClose}
              stroke="hsl(215 20% 65% / 0.5)"
              strokeDasharray="2 3"
              strokeWidth={1}
              label={{
                value: `Prev Close $${priceData.previousClose.toFixed(2)}`,
                position: "right",
                fill: "hsl(215 20% 65% / 0.5)",
                fontSize: 10,
              }}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
