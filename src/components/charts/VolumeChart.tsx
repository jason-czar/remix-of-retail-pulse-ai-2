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
import { Database, DollarSign, Calendar } from "lucide-react";
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
  const [showWeekends, setShowWeekends] = useState(false);
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
  
  // Fetch stock price data - enable for all time ranges
  const { data: priceData, isLoading: priceLoading } = useStockPrice(
    symbol, 
    timeRange as TimeRange, 
    showPriceOverlay
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

    // For 7D/30D views, create separate hourly price data - bars stay daily
    if (timeRange === '7D' || timeRange === '30D') {
      // Return chart data without price - price is handled separately
      return chartData;
    }

    return chartData;
  }, [chartData, priceData, showPriceOverlay, timeRange, is5MinView, START_HOUR, END_HOUR]);

  // Helper to check if a date is a weekend
  const isWeekend = (sortKey: string) => {
    const [year, month, day] = sortKey.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    const dayOfWeek = date.getUTCDay();
    return dayOfWeek === 0 || dayOfWeek === 6; // Sunday = 0, Saturday = 6
  };

  // Filter 7D/30D chart data based on showWeekends toggle
  const filteredChartData = useMemo(() => {
    if (timeRange !== '7D' && timeRange !== '30D') {
      return chartDataWithPrice;
    }
    if (showWeekends) {
      return chartDataWithPrice;
    }
    // Parse date labels and filter weekends
    const now = new Date();
    const year = now.getFullYear();
    return chartDataWithPrice.filter((item: any) => {
      const match = item.time?.match(/(\w+)\s+(\d+)/);
      if (match) {
        const monthStr = match[1];
        const day = parseInt(match[2]);
        const monthIndex = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].indexOf(monthStr);
        if (monthIndex >= 0) {
          const sortKey = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          return !isWeekend(sortKey);
        }
      }
      return true;
    });
  }, [chartDataWithPrice, showWeekends, timeRange]);

  // Create hourly price data for 7D/30D views (separate from bar data)
  const priceLineData = useMemo(() => {
    if (!showPriceOverlay || !priceData?.prices || priceData.prices.length === 0) {
      return [];
    }
    
    if (timeRange !== '7D' && timeRange !== '30D') {
      return []; // Not needed for other views
    }

    // Get date range from filtered chart data
    const now = new Date();
    const year = now.getFullYear();
    const chartDates = filteredChartData.map((item: any) => {
      // Parse the time label to get sortable date
      const match = item.time?.match(/(\w+)\s+(\d+)/);
      if (match) {
        const monthStr = match[1];
        const day = parseInt(match[2]);
        const monthIndex = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].indexOf(monthStr);
        if (monthIndex >= 0) {
          return { label: item.time, sortKey: `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}` };
        }
      }
      return null;
    }).filter(Boolean);

    if (chartDates.length === 0) return [];

    // Create mapping of date label to bar index (based on filtered data)
    const dateToIndex = new Map<string, number>();
    filteredChartData.forEach((item: any, idx: number) => {
      dateToIndex.set(item.time, idx);
    });

    // Build sorted date keys for range checking
    const sortedDates = chartDates.map((d: any) => d.sortKey).sort();
    const startDate = sortedDates[0];
    const endDate = sortedDates[sortedDates.length - 1];

    // Process hourly price points - filter weekends if not showing them
    return priceData.prices
      .filter(p => {
        const dateKey = new Date(p.timestamp).toISOString().split('T')[0];
        if (!showWeekends && isWeekend(dateKey)) return false;
        return dateKey >= startDate && dateKey <= endDate;
      })
      .map(point => {
        const date = new Date(point.timestamp);
        const dateKey = date.toISOString().split('T')[0];
        const hour = date.getHours();
        const dateLabel = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        
        // Calculate x position: barIndex + (hour / 24) to interpolate within the day
        const barIndex = dateToIndex.get(dateLabel) ?? 0;
        const xPosition = barIndex + (hour / 24);
        
        return {
          x: xPosition,
          price: point.price,
          timestamp: point.timestamp,
          dateLabel,
          timeLabel: date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
        };
      })
      .sort((a, b) => a.x - b.x);
  }, [filteredChartData, priceData, showPriceOverlay, timeRange, showWeekends]);

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
    let minPrice = Math.min(...prices);
    let maxPrice = Math.max(...prices);
    
    // Include previousClose in the domain so the reference line is always visible
    if (priceData.previousClose != null) {
      minPrice = Math.min(minPrice, priceData.previousClose);
      maxPrice = Math.max(maxPrice, priceData.previousClose);
    }
    
    const range = maxPrice - minPrice;
    // Use 5% padding for 7D/30D (more range), 3% for shorter views
    const isLongRange = timeRange === '7D' || timeRange === '30D';
    const padding = Math.max(range * (isLongRange ? 0.05 : 0.03), isLongRange ? 0.50 : 0.25);
    const roundTo = isLongRange ? 0.50 : 0.25;
    return [
      Math.floor((minPrice - padding) / roundTo) * roundTo,
      Math.ceil((maxPrice + padding) / roundTo) * roundTo
    ];
  }, [priceData, showPriceOverlay, timeRange]);

  const showPriceToggle = true; // Enable price toggle for all time ranges

  if (isLoading) {
    return <Skeleton className="h-[300px] md:h-[400px] w-full" />;
  }

  if (chartData.length === 0) {
    return (
      <div className="h-[300px] md:h-[400px] w-full flex items-center justify-center text-muted-foreground">
        No volume data available for this time range
      </div>
    );
  }

  return (
    <div className="h-[300px] md:h-[400px] w-full">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 mb-2">
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide w-full md:w-auto">
          {(isFromCache || isFromHistory) && (
            <Badge variant="outline" className="text-[10px] md:text-xs bg-purple-500/10 text-purple-400 border-purple-500/30 shrink-0">
              <Database className="w-2.5 h-2.5 md:w-3 md:h-3 mr-1" />
              {isFromHistory ? `${snapshotCount} snapshots` : 'cached'}
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
          <div className="flex items-center gap-2 md:gap-3 shrink-0">
            {/* Weekend Toggle - only for 7D/30D */}
            {(timeRange === '7D' || timeRange === '30D') && (
              <div className="flex items-center gap-1.5 md:gap-2">
                <Calendar 
                  className="h-3.5 w-3.5 md:h-4 md:w-4" 
                  style={{ color: showWeekends ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))' }} 
                />
                <span className="text-[10px] md:text-xs text-muted-foreground hidden sm:inline">Weekends</span>
                <Switch
                  checked={showWeekends}
                  onCheckedChange={setShowWeekends}
                />
              </div>
            )}
            {/* Price Toggle */}
            <div className="flex items-center gap-1.5 md:gap-2">
              <DollarSign 
                className="h-3.5 w-3.5 md:h-4 md:w-4" 
                style={{ color: showPriceOverlay ? priceLineColor : 'hsl(var(--muted-foreground))' }} 
              />
              <span className="text-[10px] md:text-xs text-muted-foreground hidden sm:inline">Price</span>
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
          </div>
        )}
      </div>
      
      <ResponsiveContainer width="100%" height="95%">
        <ComposedChart 
          data={filteredChartData}
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
          {/* CartesianGrid hidden for cleaner look */}
          <XAxis 
            xAxisId="bar"
            dataKey="time" 
            stroke="hsl(215 20% 55%)" 
            fontSize={12}
            tickLine={false}
            interval={is5MinView ? 11 : undefined}
            minTickGap={timeRange === '1D' ? 30 : undefined}
            tick={is5MinView ? ({ x, y, payload }: { x: number; y: number; payload: { index: number; value: string } }) => {
              const item = filteredChartData[payload.index] as any;
              if (!item?.isHourStart) return null;
              return (
                <text x={x} y={y + 12} textAnchor="middle" fill="hsl(215 20% 55%)" fontSize={12}>
                  {payload.value}
                </text>
              );
            } : undefined}
          />
          {/* Hidden numeric X-axis for hourly price line positioning in 7D/30D */}
          {showPriceOverlay && (timeRange === '7D' || timeRange === '30D') && (
            <XAxis 
              xAxisId="price"
              type="number"
              dataKey="x"
              domain={[0, filteredChartData.length - 1]}
              hide={true}
            />
          )}
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
            xAxisId="bar"
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
          {/* Price Line Overlay - standard for non-7D/30D */}
          {showPriceOverlay && showPriceToggle && timeRange !== '7D' && timeRange !== '30D' && (
            <Line
              xAxisId="bar"
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
          {/* Hourly Price Line Overlay for 7D/30D - uses separate data with numeric X positions */}
          {showPriceOverlay && showPriceToggle && (timeRange === '7D' || timeRange === '30D') && priceLineData.length > 0 && (
            <Line
              xAxisId="price"
              yAxisId="right"
              data={priceLineData}
              type="monotone"
              dataKey="price"
              stroke={priceLineColor}
              strokeWidth={2}
              dot={{ r: 1.5, fill: priceLineColor }}
              activeDot={{ r: 4, stroke: priceLineColor, strokeWidth: 2, fill: 'hsl(var(--background))' }}
              connectNulls={true}
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
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
