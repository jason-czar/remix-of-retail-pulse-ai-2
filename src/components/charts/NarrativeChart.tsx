import { 
  ComposedChart,
  BarChart,
  Bar,
  Line,
  Scatter,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
  Rectangle,
  ReferenceLine
} from "recharts";
import { useMemo, useEffect, useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { useNarrativeAnalysis, Narrative } from "@/hooks/use-narrative-analysis";
import { useNarrativeHistory } from "@/hooks/use-narrative-history";
import { useAutoBackfill } from "@/hooks/use-auto-backfill";
import { useStockPrice } from "@/hooks/use-stock-price";
import { alignPricesToHourSlots, alignPricesToFiveMinSlots } from "@/lib/stock-price-api";
import { AlertCircle, RefreshCw, Sparkles, TrendingUp, MessageSquare, AlertTriangle, DollarSign, ChevronDown, Calendar } from "lucide-react";
import { AIAnalysisLoader } from "@/components/AIAnalysisLoader";
import { BackfillIndicator, BackfillBadge } from "@/components/BackfillIndicator";
import { FillGapsDialog } from "@/components/FillGapsDialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { format } from "date-fns";
import { detectMissingDates } from "@/lib/chart-gap-utils";
import { MarketSessionSelector, MarketSession, SESSION_RANGES } from "./MarketSessionSelector";

type TimeRange = '1H' | '6H' | '1D' | '24H' | '7D' | '30D';

// Stock price line colors based on price vs previous close
const PRICE_UP_COLOR = "#00C805";   // Green when above previous close
const PRICE_DOWN_COLOR = "#FF6A26"; // Orange-red when below previous close

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

// Sentiment colors
const SENTIMENT_COLORS = {
  bullish: "hsl(142 71% 45%)",   // Green
  bearish: "hsl(0 72% 51%)",     // Red
  neutral: "hsl(199 89% 48%)",   // Blue
};

// Max segments per day
const MAX_SEGMENTS = 6;
const SLOTS_PER_HOUR = 12; // 5-minute slots per hour

// Custom bar shape that expands width to cover full hour in 5-min view
function WideBarShape(props: any) {
  const { x, y, width, height, fill, radius, payload, is5MinView, activeHour } = props;
  
  // Determine opacity: 50% when this hour is hovered, 25% otherwise
  const isHourActive = activeHour !== null && payload?.hourIndex === activeHour;
  const opacity = isHourActive ? 0.5 : 0.25;
  
  // Smooth transition style for opacity changes
  const transitionStyle = { transition: 'fill-opacity 0.2s ease-out' };
  
  // In 5-min view, expand bar width to cover 12 slots (full hour)
  // Only render for hour-start slots
  if (is5MinView) {
    if (!payload?.isHourStart || height === 0) {
      return null;
    }
    // Expand width to cover 12 slots
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
  
  // Normal rendering for non-5-min views
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

// Custom tooltip for hourly price data on 7D/30D views
function HourlyPriceTooltip({ active, payload, priceColor }: any) {
  if (!active || !payload || !payload.length) return null;

  const dataPoint = payload[0]?.payload;
  
  if (!dataPoint) return null;

  return (
    <div className="bg-card border border-border rounded-lg p-3 shadow-xl min-w-[160px]">
      <div className="flex items-center justify-between mb-2">
        <span className="font-semibold text-card-foreground">{dataPoint.dateLabel}</span>
        <span className="text-xs text-muted-foreground">{dataPoint.timeLabel}</span>
      </div>
      
      {dataPoint.price != null && (
        <div className="flex items-center gap-2">
          <DollarSign className="h-4 w-4" style={{ color: priceColor || '#00C805' }} />
          <span className="font-bold text-lg" style={{ color: priceColor || '#00C805' }}>${dataPoint.price.toFixed(2)}</span>
        </div>
      )}
    </div>
  );
}

// Custom tooltip for independent daily/hourly view with volume indicator
function NarrativeStackedTooltip({ active, payload, label, priceColor }: any) {
  if (!active || !payload || !payload.length) return null;

  const dataPoint = payload[0]?.payload;
  
  // Handle gap placeholders
  if (dataPoint?.isGap) {
    return (
      <div className="bg-card border border-dashed border-amber-500/50 rounded-lg p-3 shadow-xl min-w-[200px]">
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          <span className="font-semibold text-amber-500">{label}</span>
        </div>
        <p className="text-sm text-muted-foreground">
          No data available for this date.
        </p>
        <p className="text-xs text-amber-500/80 mt-2">
          Click "Fill Gaps" to fetch historical data.
        </p>
      </div>
    );
  }
  
  // Handle empty hours (no data yet - e.g., future hours in "Today" view)
  if (dataPoint?.isEmpty) {
    return (
      <div className="bg-card border border-border rounded-lg p-3 shadow-xl min-w-[180px]">
        <span className="font-semibold text-card-foreground">{label}</span>
        <p className="text-sm text-muted-foreground mt-1">
          No data available yet
        </p>
        {dataPoint.price != null && (
          <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border/50">
            <DollarSign className="h-3 w-3" style={{ color: priceColor || '#00C805' }} />
            <span className="font-semibold" style={{ color: priceColor || '#00C805' }}>${dataPoint.price.toFixed(2)}</span>
          </div>
        )}
      </div>
    );
  }

  // Extract all segments from payload - use segment${i}Count for actual values (works on any slot)
  const segments: { name: string; count: number; sentiment: string }[] = [];
  
  if (dataPoint) {
    for (let i = 0; i < MAX_SEGMENTS; i++) {
      const name = dataPoint[`segment${i}Name`];
      // Use segment${i}Count if available (for 5-min view), fallback to segment${i} for other views
      const count = dataPoint[`segment${i}Count`] ?? dataPoint[`segment${i}`];
      const sentiment = dataPoint[`segment${i}Sentiment`];
      if (name && count > 0) {
        segments.push({ name, count, sentiment });
      }
    }
  }

  const totalMessages = dataPoint?.totalMessages || 0;
  const volumePercent = dataPoint?.volumePercent || 0;
  const price = dataPoint?.price;

  return (
    <div className="bg-card border border-border rounded-lg p-3 shadow-xl min-w-[280px]">
      <div className="flex items-center justify-between mb-2">
        <span className="font-semibold text-card-foreground">{label}</span>
        {totalMessages > 0 && (
          <div className="flex items-center gap-1.5 text-xs">
            <MessageSquare className="h-3 w-3 text-amber-400" />
            <span className="text-amber-400 font-medium">{totalMessages.toLocaleString()}</span>
            <span className="text-muted-foreground">msgs</span>
          </div>
        )}
      </div>
      
      {/* Stock Price */}
      {price != null && (
        <div className="flex items-center gap-2 mb-3 pb-2 border-b border-border/50">
          <DollarSign className="h-4 w-4" style={{ color: priceColor || '#00C805' }} />
          <span className="font-bold text-lg" style={{ color: priceColor || '#00C805' }}>${price.toFixed(2)}</span>
        </div>
      )}
      
      {/* Volume indicator bar */}
      {volumePercent > 0 && (
        <div className="mb-3">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-muted-foreground">Relative Activity</span>
            <span className={`font-medium ${volumePercent >= 80 ? 'text-amber-400' : volumePercent >= 50 ? 'text-primary' : 'text-muted-foreground'}`}>
              {volumePercent.toFixed(0)}%
            </span>
          </div>
          <div className="h-1.5 bg-muted/30 rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all ${
                volumePercent >= 80 ? 'bg-amber-400' : volumePercent >= 50 ? 'bg-primary' : 'bg-muted-foreground/50'
              }`}
              style={{ width: `${Math.min(volumePercent, 100)}%` }}
            />
          </div>
        </div>
      )}
      
      {segments.length > 0 && (
        <div className="space-y-1.5 pt-2 border-t border-border/50">
          <div className="text-xs text-muted-foreground mb-1">Top Narratives:</div>
          {segments.map((segment, idx) => (
            <div key={idx} className="flex items-center gap-2 text-sm">
              <div 
                className="w-3 h-3 rounded-sm flex-shrink-0" 
                style={{ backgroundColor: SENTIMENT_COLORS[segment.sentiment as keyof typeof SENTIMENT_COLORS] || SENTIMENT_COLORS.neutral }}
              />
              <span className="text-card-foreground flex-1 truncate max-w-[160px]">{segment.name}</span>
              <span className="text-muted-foreground">{segment.count}</span>
              <span className={`text-xs px-1.5 py-0.5 rounded border ${getSentimentBadge(segment.sentiment)}`}>
                {segment.sentiment}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Types for side panel data
interface SidePanelData {
  label: string;
  totalMessages: number;
  price?: number | null;
  volumePercent: number;
  segments: { name: string; count: number; sentiment: string }[];
  isGap?: boolean;
  isEmpty?: boolean;
}

// Persistent side panel component with liquid glass styling
function NarrativeSidePanel({ 
  data, 
  priceColor,
  isHovering,
  isMobile = false
}: { 
  data: SidePanelData | null;
  priceColor: string;
  isHovering: boolean;
  isMobile?: boolean;
}) {
  // Base classes differ between mobile (full width, shown) and desktop (fixed width, hidden on mobile)
  const containerClasses = isMobile 
    ? "w-full p-4 md:hidden glass-card"
    : "w-[312px] flex-shrink-0 p-5 hidden md:block glass-card";
  
  if (!data) {
    return (
      <div className={cn(
        isMobile ? "w-full p-4 md:hidden" : "w-[312px] flex-shrink-0 p-5 hidden md:flex",
        "glass-card items-center justify-center"
      )}>
        <p className="text-base text-muted-foreground text-center">
          No data available
        </p>
      </div>
    );
  }

  // Handle gap placeholders
  if (data.isGap) {
    return (
      <div className={cn(containerClasses, "!border-dashed !border-amber-500/50")}>
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
          <span className="font-semibold text-lg text-amber-500">{data.label}</span>
        </div>
        <p className="text-base text-muted-foreground">
          No data available for this date.
        </p>
        <p className="text-sm text-amber-500/80 mt-3">
          Click "Fill Gaps" to fetch historical data.
        </p>
      </div>
    );
  }

  // Handle empty hours
  if (data.isEmpty) {
    return (
      <div className={containerClasses}>
        <span className="font-semibold text-lg text-card-foreground">{data.label}</span>
        <p className="text-base text-muted-foreground mt-2">
          No data available yet
        </p>
        {data.price != null && (
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/50 dark:border-white/10">
            <DollarSign className="h-5 w-5" style={{ color: priceColor }} />
            <span className="font-bold text-xl" style={{ color: priceColor }}>${data.price.toFixed(2)}</span>
          </div>
        )}
        {!isHovering && !isMobile && (
          <div className="mt-4 pt-3 border-t border-border/50 dark:border-white/10">
            <span className="text-sm text-muted-foreground italic">
              Showing latest • Hover chart to explore
            </span>
          </div>
        )}
      </div>
    );
  }
  
  return (
    <div className={cn(
      containerClasses,
      !isHovering && !isMobile && "ring-1 ring-primary/20"
    )}>
      {/* Time/Date Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="font-semibold text-lg text-card-foreground">{data.label}</span>
        {data.totalMessages > 0 && (
          <div className="flex items-center gap-1.5 text-sm">
            <MessageSquare className="h-4 w-4 text-amber-400" />
            <span className="text-amber-400 font-medium">{data.totalMessages.toLocaleString()}</span>
            <span className="text-muted-foreground text-xs">msgs</span>
          </div>
        )}
      </div>
      
      {/* Stock Price */}
      {data.price != null && (
        <div className="flex items-center gap-2 mb-3 pb-3 border-b border-border/50 dark:border-white/10">
          <DollarSign className="h-5 w-5" style={{ color: priceColor }} />
          <span className="font-bold text-xl" style={{ color: priceColor }}>
            ${data.price.toFixed(2)}
          </span>
        </div>
      )}
      
      {/* Relative Activity Bar */}
      {data.volumePercent > 0 && (
        <div className="mb-3">
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-muted-foreground">Relative Activity</span>
            <span className={cn(
              "font-medium",
              data.volumePercent >= 80 ? "text-amber-400" : 
              data.volumePercent >= 50 ? "text-primary" : "text-muted-foreground"
            )}>
              {data.volumePercent.toFixed(0)}%
            </span>
          </div>
          <div className="h-2 bg-muted/30 dark:bg-white/10 rounded-full overflow-hidden">
            <div 
              className={cn(
                "h-full rounded-full transition-all",
                data.volumePercent >= 80 ? "bg-amber-400" : 
                data.volumePercent >= 50 ? "bg-primary" : "bg-muted-foreground/50"
              )}
              style={{ width: `${Math.min(data.volumePercent, 100)}%` }}
            />
          </div>
        </div>
      )}
      
      {/* Top Narratives */}
      {data.segments.length > 0 && (
        <div className="space-y-2.5 pt-3 border-t border-border/50 dark:border-white/10">
          <div className="text-sm text-muted-foreground mb-2">Top Narratives:</div>
          {data.segments.map((segment, idx) => (
            <div key={idx} className="flex items-center gap-2.5 text-base">
              <div 
                className="w-3.5 h-3.5 rounded-sm flex-shrink-0" 
                style={{ backgroundColor: SENTIMENT_COLORS[segment.sentiment as keyof typeof SENTIMENT_COLORS] || SENTIMENT_COLORS.neutral }}
              />
              <span className="text-card-foreground flex-1 truncate text-sm">{segment.name}</span>
              <span className="text-muted-foreground text-sm font-medium">{segment.count}</span>
              <span className={cn(
                "text-[10px] px-1.5 py-0.5 rounded border",
                getSentimentBadge(segment.sentiment)
              )}>
                {segment.sentiment}
              </span>
            </div>
          ))}
        </div>
      )}
      
      {/* Default indicator - only on desktop */}
      {!isHovering && !isMobile && (
        <div className="mt-4 pt-3 border-t border-border/50 dark:border-white/10">
          <span className="text-sm text-muted-foreground italic">
            Showing latest • Hover chart to explore
          </span>
        </div>
      )}
    </div>
  );
}

// Helper to extract segments from a data point
function extractSegmentsFromDataPoint(dataPoint: Record<string, any>): { name: string; count: number; sentiment: string }[] {
  const segments: { name: string; count: number; sentiment: string }[] = [];
  for (let i = 0; i < MAX_SEGMENTS; i++) {
    const name = dataPoint[`segment${i}Name`];
    const count = dataPoint[`segment${i}Count`] ?? dataPoint[`segment${i}`];
    const sentiment = dataPoint[`segment${i}Sentiment`];
    if (name && count > 0) {
      segments.push({ name, count, sentiment });
    }
  }
  return segments;
}

// Time series stacked bar chart for 7D/30D - Independent daily view with price overlay
function TimeSeriesNarrativeChart({ 
  symbol, 
  timeRange 
}: { 
  symbol: string; 
  timeRange: '7D' | '30D';
}) {
  const [showPriceOverlay, setShowPriceOverlay] = useState(true);
  const [showWeekends, setShowWeekends] = useState(false);
  const [hoveredData, setHoveredData] = useState<SidePanelData | null>(null);
  const days = timeRange === '7D' ? 7 : 30;
  const { data: historyData, isLoading, error, refetch, isFetching } = useNarrativeHistory(
    symbol, 
    days, 
    "daily"
  );
  
  // Fetch stock price data with 1-hour intervals
  const { data: priceData, isLoading: priceLoading } = useStockPrice(symbol, timeRange, showPriceOverlay);
  
  // Auto-backfill hook
  const { 
    isBackfilling, 
    status: backfillStatus, 
    progress: backfillProgress,
    checkAndFillGaps 
  } = useAutoBackfill(symbol, days);
  
  // Determine price line color based on current price vs previous close
  const priceLineColor = useMemo(() => {
    if (!priceData?.currentPrice || !priceData?.previousClose) {
      return PRICE_UP_COLOR; // Default to green
    }
    return priceData.currentPrice >= priceData.previousClose ? PRICE_UP_COLOR : PRICE_DOWN_COLOR;
  }, [priceData?.currentPrice, priceData?.previousClose]);
  
  // Check for gaps when data loads
  useEffect(() => {
    if (historyData?.data && !isLoading && !isFetching) {
      checkAndFillGaps(historyData.data, () => {
        refetch();
      });
    }
  }, [historyData?.data, isLoading, isFetching, checkAndFillGaps, refetch]);

  const { stackedChartData, totalMessages, gapCount, barDomain } = useMemo(() => {
    if (!historyData?.data || historyData.data.length === 0) {
      return { stackedChartData: [], totalMessages: 0, gapCount: 0, barDomain: [0, 100] as [number, number] };
    }

    // Group data by date
    const byDate = new Map<string, { 
      date: string; 
      sortKey: string;
      narratives: { name: string; count: number; sentiment: string }[];
      totalMessages: number;
      isGap?: boolean;
    }>();
    
    historyData.data.forEach(point => {
      // Use UTC date to avoid timezone issues causing duplicate labels
      const sortKey = new Date(point.recorded_at).toISOString().split('T')[0];
      const [year, month, day] = sortKey.split('-').map(Number);
      const utcDate = new Date(Date.UTC(year, month - 1, day));
      const dateKey = format(utcDate, 'MMM d');
      
      if (!byDate.has(sortKey)) {
        byDate.set(sortKey, { 
          date: dateKey, 
          sortKey, 
          narratives: [],
          totalMessages: 0
        });
      }
      
      const entry = byDate.get(sortKey)!;
      entry.totalMessages += point.message_count;
      
      // Accumulate narratives for this date
      if (point.narratives && Array.isArray(point.narratives)) {
        point.narratives.forEach((n: any) => {
          const existing = entry.narratives.find(x => x.name === n.name);
          if (existing) {
            existing.count += n.count || 0;
          } else {
            entry.narratives.push({
              name: n.name,
              count: n.count || 0,
              sentiment: n.sentiment || 'neutral'
            });
          }
        });
      }
    });

    // Detect missing dates and create gap placeholders
    const existingDates = Array.from(byDate.keys());
    const missingDates = detectMissingDates(existingDates, days);
    
    // Add gap placeholders to the map
    missingDates.forEach(sortKey => {
      const [year, month, day] = sortKey.split('-').map(Number);
      const utcDate = new Date(Date.UTC(year, month - 1, day));
      byDate.set(sortKey, {
        date: format(utcDate, 'MMM d'),
        sortKey,
        narratives: [],
        totalMessages: 0,
        isGap: true
      });
    });

    // Find max message count for relative volume calculation (excluding gaps)
    const dateEntries = Array.from(byDate.values());
    const maxMessages = Math.max(...dateEntries.filter(d => !d.isGap).map(d => d.totalMessages), 1);

    // Process each date: sort by count and take top segments
    const stackedChartData = dateEntries
      .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
      .map(dayData => {
        // Sort narratives by count descending and take top MAX_SEGMENTS
        const topNarratives = dayData.narratives
          .sort((a, b) => b.count - a.count)
          .slice(0, MAX_SEGMENTS);
        
        // Build flattened data structure for Recharts
        const flatData: Record<string, any> = {
          date: dayData.date,
          sortKey: dayData.sortKey,
          totalMessages: dayData.totalMessages,
          volumePercent: (dayData.totalMessages / maxMessages) * 100,
          isGap: dayData.isGap || false,
        };
        
        // For gaps, add a placeholder segment
        if (dayData.isGap) {
          flatData['gapPlaceholder'] = 1; // Small value for visual indicator
          for (let i = 0; i < MAX_SEGMENTS; i++) {
            flatData[`segment${i}`] = 0;
            flatData[`segment${i}Name`] = '';
            flatData[`segment${i}Sentiment`] = 'neutral';
          }
        } else {
          flatData['gapPlaceholder'] = 0;
          topNarratives.forEach((n, idx) => {
            flatData[`segment${idx}`] = n.count;
            flatData[`segment${idx}Name`] = n.name;
            flatData[`segment${idx}Sentiment`] = n.sentiment;
          });
          
          // Fill remaining segments with zeros
          for (let i = topNarratives.length; i < MAX_SEGMENTS; i++) {
            flatData[`segment${i}`] = 0;
            flatData[`segment${i}Name`] = '';
            flatData[`segment${i}Sentiment`] = 'neutral';
          }
        }
        
        return flatData;
      });

    const totalMessages = historyData.data.reduce((sum, point) => sum + point.message_count, 0);
    
    // Calculate max stacked value for bar domain (double to make bars half height)
    const maxStackedValue = Math.max(...stackedChartData.filter(d => !d.isGap).map(item => {
      let sum = 0;
      for (let i = 0; i < MAX_SEGMENTS; i++) {
        sum += (item[`segment${i}`] as number) || 0;
      }
      return sum;
    }), 1);
    const barDomain: [number, number] = [0, maxStackedValue * 2];

    return { stackedChartData, totalMessages, gapCount: missingDates.length, barDomain };
  }, [historyData]);

  // Helper to check if a date is a weekend
  const isWeekend = (sortKey: string) => {
    const [year, month, day] = sortKey.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    const dayOfWeek = date.getUTCDay();
    return dayOfWeek === 0 || dayOfWeek === 6; // Sunday = 0, Saturday = 6
  };

  // Filter data based on showWeekends toggle
  const filteredChartData = useMemo(() => {
    if (showWeekends) {
      return stackedChartData;
    }
    return stackedChartData.filter(d => !isWeekend(d.sortKey));
  }, [stackedChartData, showWeekends]);

  // Recalculate bar domain for filtered data
  const filteredBarDomain = useMemo(() => {
    const maxStackedValue = Math.max(...filteredChartData.filter(d => !d.isGap).map(item => {
      let sum = 0;
      for (let i = 0; i < MAX_SEGMENTS; i++) {
        sum += (item[`segment${i}`] as number) || 0;
      }
      return sum;
    }), 1);
    return [0, maxStackedValue * 2] as [number, number];
  }, [filteredChartData]);

  // Create hourly price data points for continuous line overlay
  const priceLineData = useMemo(() => {
    if (!showPriceOverlay || !priceData?.prices || priceData.prices.length === 0) {
      return [];
    }

    // Build hourly data points with positions that span across the daily bars
    const sortedBarDates = filteredChartData.map(d => d.sortKey).sort();
    const startDate = sortedBarDates[0];
    const endDate = sortedBarDates[sortedBarDates.length - 1];
    
    if (!startDate || !endDate) return [];

    // Create a mapping of date to bar index for positioning (based on filtered data)
    const dateToIndex = new Map<string, number>();
    sortedBarDates.forEach((date, idx) => {
      dateToIndex.set(date, idx);
    });

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
        
        // Calculate x position: barIndex + (hour / 24) to interpolate within the day
        const barIndex = dateToIndex.get(dateKey) ?? 0;
        const xPosition = barIndex + (hour / 24);
        
        return {
          x: xPosition,
          price: point.price,
          timestamp: point.timestamp,
          dateLabel: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          timeLabel: date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
        };
      })
      .sort((a, b) => a.x - b.x);
  }, [filteredChartData, priceData, showPriceOverlay, showWeekends]);

  // Chart data for bars (using filtered data)
  const chartDataWithPrice = useMemo(() => {
    return filteredChartData;
  }, [filteredChartData]);

  // Calculate price domain for right Y-axis - tight padding to fill vertical space
  const priceDomain = useMemo(() => {
    if (!showPriceOverlay || !priceData?.prices || priceData.prices.length === 0) {
      return ['auto', 'auto'];
    }
    const prices = priceData.prices.map(p => p.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const range = maxPrice - minPrice;
    // Use 5% padding for 7D/30D views (slightly more than intraday)
    const padding = Math.max(range * 0.05, 0.50);
    // Round to nearest $0.50 for cleaner axis labels
    const roundTo = 0.50;
    return [
      Math.floor((minPrice - padding) / roundTo) * roundTo,
      Math.ceil((maxPrice + padding) / roundTo) * roundTo
    ];
  }, [priceData, showPriceOverlay]);

  // Derive panel data (hovered or most recent with data)
  const panelData = useMemo((): SidePanelData | null => {
    if (hoveredData) {
      return hoveredData;
    }
    
    // Find most recent data point with messages (non-gap, has data)
    const mostRecent = chartDataWithPrice
      .slice()
      .reverse()
      .find(item => !item.isGap && item.totalMessages > 0);
      
    if (!mostRecent) return null;
    
    return {
      label: mostRecent.date,
      totalMessages: mostRecent.totalMessages,
      price: mostRecent.price ?? null,
      volumePercent: mostRecent.volumePercent || 0,
      segments: extractSegmentsFromDataPoint(mostRecent),
      isGap: mostRecent.isGap,
    };
  }, [hoveredData, chartDataWithPrice]);

  // Handle chart mouse events for side panel
  const handleChartMouseMove = useCallback((state: any) => {
    if (state?.activePayload?.[0]?.payload) {
      const payload = state.activePayload[0].payload;
      
      // For price line data, find corresponding bar data
      if (payload.dateLabel !== undefined) {
        // This is hourly price data - find matching date bar
        const dateKey = new Date(payload.timestamp).toISOString().split('T')[0];
        const matchingBar = chartDataWithPrice.find(d => d.sortKey === dateKey);
        if (matchingBar) {
          setHoveredData({
            label: `${payload.dateLabel} ${payload.timeLabel}`,
            totalMessages: matchingBar.totalMessages,
            price: payload.price,
            volumePercent: matchingBar.volumePercent || 0,
            segments: extractSegmentsFromDataPoint(matchingBar),
            isGap: matchingBar.isGap,
          });
        }
        return;
      }
      
      // Regular bar data
      setHoveredData({
        label: payload.date,
        totalMessages: payload.totalMessages,
        price: payload.price ?? null,
        volumePercent: payload.volumePercent || 0,
        segments: extractSegmentsFromDataPoint(payload),
        isGap: payload.isGap,
      });
    }
  }, [chartDataWithPrice]);

  const handleChartMouseLeave = useCallback(() => {
    setHoveredData(null);
  }, []);

  if (isLoading) {
    return <AIAnalysisLoader symbol={symbol} analysisType="narratives" />;
  }

  if (error) {
    return (
      <div className="h-[480px] w-full flex flex-col items-center justify-center gap-4 text-muted-foreground">
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
      <div className="h-[480px] w-full flex flex-col items-center justify-center gap-4 text-muted-foreground">
        <Sparkles className="h-8 w-8" />
        <p className="text-sm">No narrative history found for {symbol}. Data will accumulate over time.</p>
      </div>
    );
  }

  return (
    <div className="h-[480px] md:h-[520px] w-full">
      {/* Backfill indicator */}
      {isBackfilling && (
        <div className="mb-3">
          <BackfillIndicator status={backfillStatus} progress={backfillProgress} />
        </div>
      )}
      
      {/* Header - Collapsible (collapsed by default, showing only arrow) */}
      <Collapsible defaultOpen={false} className="mb-1">
        <CollapsibleTrigger asChild>
          <div className="flex items-center justify-end p-1 cursor-pointer hover:bg-card/30 rounded transition-colors">
            <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform [[data-state=open]>&]:rotate-180" />
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-2">
          <div className="flex items-center justify-between p-3 rounded-lg bg-card/50 border border-border">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-5 w-5 text-primary" />
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Daily Narrative Breakdown</span>
                  <span className="px-2 py-0.5 rounded bg-primary/20 text-primary text-xs">
                    independent
                  </span>
                  <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-400 text-xs">
                    {historyData?.data.length || 0} snapshots
                  </span>
                  {gapCount > 0 && !isBackfilling && (
                    <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 text-xs flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      {gapCount} gap{gapCount > 1 ? 's' : ''}
                    </span>
                  )}
                  <BackfillBadge isBackfilling={isBackfilling} />
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                  {totalMessages > 0 && (
                    <span className="flex items-center gap-1">
                      <span className="font-semibold text-primary">{totalMessages.toLocaleString()}</span> total messages
                    </span>
                  )}
                  <span>{days} days • each bar shows that day's top narratives</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* Weekend Toggle */}
              <div className="flex items-center gap-2">
                <Calendar 
                  className="h-4 w-4" 
                  style={{ color: showWeekends ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))' }} 
                />
                <span className="text-xs text-muted-foreground">Weekends</span>
                <Switch
                  checked={showWeekends}
                  onCheckedChange={setShowWeekends}
                />
              </div>
              {/* Price Toggle */}
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
              </div>
              <FillGapsDialog symbol={symbol} onComplete={() => refetch()} />
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => refetch()}
                disabled={isFetching || isBackfilling}
                className="h-8 px-3 text-xs"
              >
                <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isFetching ? 'animate-spin' : ''}`} />
                {isFetching ? 'Refreshing...' : 'Refresh'}
              </Button>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Main content: Side Panel + Chart */}
      <div className="flex md:gap-4 h-[calc(100%-60px)]">
        {/* Left Side Panel - Always visible on desktop */}
        <NarrativeSidePanel 
          data={panelData} 
          priceColor={priceLineColor}
          isHovering={hoveredData !== null}
        />
        
        {/* Chart - Takes remaining space */}
        <div className="flex-1 min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart 
              data={showPriceOverlay && priceLineData.length > 0 ? priceLineData : chartDataWithPrice}
              margin={{ top: 10, right: showPriceOverlay ? 50 : 15, left: 5, bottom: 10 }}
              onMouseMove={handleChartMouseMove}
              onMouseLeave={handleChartMouseLeave}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(217 33% 17%)" vertical={false} />
              {/* X-axis for bar labels */}
              <XAxis 
                xAxisId="bar"
                dataKey="date"
                stroke="hsl(215 20% 55%)" 
                fontSize={11}
                tickLine={false}
                axisLine={false}
                ticks={chartDataWithPrice.map(d => d.date)}
                allowDuplicatedCategory={false}
              />
              {/* Numeric X-axis for price line and hourly tooltip positioning */}
              <XAxis 
                xAxisId="price"
                type="number"
                dataKey="x"
                domain={[0, chartDataWithPrice.length - 1]}
                hide={true}
                allowDataOverflow={true}
              />
              <YAxis 
                yAxisId="left"
                stroke="hsl(215 20% 55%)" 
                fontSize={11}
                tickLine={false}
                axisLine={false}
                width={10}
                tick={false}
                domain={filteredBarDomain}
              />
              {showPriceOverlay && (
                <YAxis 
                  yAxisId="right"
                  orientation="right"
                  stroke={priceLineColor}
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  width={50}
                  tickFormatter={(value) => `$${value.toFixed(0)}`}
                  domain={priceDomain as [number, number]}
                />
              )}
              {/* Tooltip hidden on desktop (side panel shows info), visible on mobile */}
              <Tooltip 
                content={({ active, payload, label }) => {
                  // On desktop, hide tooltip (side panel handles it)
                  // Check if we're on mobile by checking window width
                  if (typeof window !== 'undefined' && window.innerWidth >= 768) {
                    return null;
                  }
                  return showPriceOverlay && priceLineData.length > 0 
                    ? <HourlyPriceTooltip active={active} payload={payload} priceColor={priceLineColor} /> 
                    : <NarrativeStackedTooltip active={active} payload={payload} label={label} priceColor={priceLineColor} />;
                }} 
              />
              {/* Gap placeholder bars - shown with dashed pattern */}
              <Bar 
                xAxisId="bar"
                yAxisId="left"
                dataKey="gapPlaceholder"
                data={chartDataWithPrice}
                stackId="narratives"
                radius={[4, 4, 0, 0]}
                isAnimationActive={false}
              >
                {chartDataWithPrice.map((entry, entryIdx) => (
                  <Cell 
                    key={`gap-${entryIdx}`} 
                    fill={entry.isGap ? "hsl(38 92% 50% / 0.3)" : "transparent"}
                    stroke={entry.isGap ? "hsl(38 92% 50%)" : "transparent"}
                    strokeWidth={entry.isGap ? 1 : 0}
                    strokeDasharray={entry.isGap ? "4 2" : "0"}
                  />
                ))}
              </Bar>
              {/* Render segment bars - each segment uses its own sentiment color */}
              {Array.from({ length: MAX_SEGMENTS }).map((_, idx) => (
                <Bar 
                  key={`segment${idx}`}
                  xAxisId="bar"
                  yAxisId="left"
                  dataKey={`segment${idx}`}
                  data={chartDataWithPrice}
                  stackId="narratives"
                  radius={idx === MAX_SEGMENTS - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                  isAnimationActive={false}
                >
                  {chartDataWithPrice.map((entry, entryIdx) => (
                    <Cell 
                      key={`cell-${entryIdx}`} 
                      fill={entry.isGap ? "transparent" : (SENTIMENT_COLORS[entry[`segment${idx}Sentiment`] as keyof typeof SENTIMENT_COLORS] || SENTIMENT_COLORS.neutral)}
                      fillOpacity={0.25}
                    />
                  ))}
                </Bar>
              ))}
              {/* Hourly Price Line Overlay */}
              {showPriceOverlay && priceLineData.length > 0 && (
                <Line
                  xAxisId="price"
                  yAxisId="right"
                  type="monotone"
                  dataKey="price"
                  stroke={priceLineColor}
                  strokeWidth={2}
                  dot={{ r: 2, fill: priceLineColor }}
                  activeDot={{ r: 5, stroke: priceLineColor, strokeWidth: 2, fill: 'hsl(var(--background))' }}
                  connectNulls={true}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

// Hourly stacked bar chart for 1D/24H - Independent hourly view with live AI fallback
function HourlyStackedNarrativeChart({ 
  symbol, 
  timeRange 
}: { 
  symbol: string; 
  timeRange: '1D' | '24H';
}) {
  const [showPriceOverlay, setShowPriceOverlay] = useState(true);
  const [activeHour, setActiveHour] = useState<number | null>(null);
  const [marketSession, setMarketSession] = useState<MarketSession>('regular');
  const [hoveredData, setHoveredData] = useState<SidePanelData | null>(null);
  
  // Get session-specific hour range
  const { startHour: START_HOUR, endHour: END_HOUR } = SESSION_RANGES[marketSession];
  const VISIBLE_HOURS = END_HOUR - START_HOUR + 1;
  const SLOTS_PER_HOUR = 12;
  
  // Calculate proper day boundaries in user's local timezone
  const { todayStart, todayEnd, twentyFourHoursAgo, now } = useMemo(() => {
    const now = new Date();
    // Today: midnight to 11:59:59 PM in user's local timezone
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    // 24H: rolling 24 hours
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    return { todayStart, todayEnd, twentyFourHoursAgo, now };
  }, []);

  // Fetch 3 days of data to ensure we capture the full local day regardless of timezone
  // (e.g., UTC-12 to UTC+14 covers ~26 hour spread from UTC midnight)
  const { data: historyData, isLoading: historyLoading, error, refetch, isFetching } = useNarrativeHistory(
    symbol, 
    3, 
    "hourly"
  );
  
  // Fetch stock price data
  const { data: priceData, isLoading: priceLoading } = useStockPrice(symbol, timeRange, showPriceOverlay);

  // Determine price line color based on current price vs previous close
  const priceLineColor = useMemo(() => {
    if (!priceData?.currentPrice || !priceData?.previousClose) {
      return PRICE_UP_COLOR; // Default to green
    }
    return priceData.currentPrice >= priceData.previousClose ? PRICE_UP_COLOR : PRICE_DOWN_COLOR;
  }, [priceData?.currentPrice, priceData?.previousClose]);

  const { stackedChartData, totalMessages, hasAnyData, is5MinView } = useMemo(() => {
    // For "Today" view (1D), use 5-minute slots for granular price line
    // but only put bar data at hour boundaries
    if (timeRange === '1D') {
      const TOTAL_SLOTS = VISIBLE_HOURS * SLOTS_PER_HOUR;
      
      // First, collect hourly narrative data
      const hourlyNarratives: Map<number, { 
        narratives: { name: string; count: number; sentiment: string }[];
        totalMessages: number;
      }> = new Map();
      
      // Initialize hours based on selected session
      for (let h = START_HOUR; h <= END_HOUR; h++) {
        hourlyNarratives.set(h, { narratives: [], totalMessages: 0 });
      }
      
      // Fill in actual narrative data if available
      if (historyData?.data && historyData.data.length > 0) {
        const filteredData = historyData.data.filter(point => {
          const pointDate = new Date(point.recorded_at);
          return pointDate.getTime() >= todayStart.getTime() && pointDate.getTime() <= todayEnd.getTime();
        });
        
        filteredData.forEach(point => {
          const date = new Date(point.recorded_at);
          const hourIndex = date.getHours();
          
          const slot = hourlyNarratives.get(hourIndex);
          if (slot) {
            slot.totalMessages += point.message_count;
            
            if (point.narratives && Array.isArray(point.narratives)) {
              point.narratives.forEach((n: any) => {
                const existing = slot.narratives.find(x => x.name === n.name);
                if (existing) {
                  existing.count += n.count || 0;
                } else {
                  slot.narratives.push({
                    name: n.name,
                    count: n.count || 0,
                    sentiment: n.sentiment || 'neutral'
                  });
                }
              });
            }
          }
        });
      }
      
      // Find max messages for relative volume
      const hourData = Array.from(hourlyNarratives.values());
      const maxMessages = Math.max(...hourData.map(h => h.totalMessages), 1);
      
      // Build chart data slots
      const stackedChartData: Record<string, any>[] = [];
      
      for (let slotIdx = 0; slotIdx < TOTAL_SLOTS; slotIdx++) {
        const hour = START_HOUR + Math.floor(slotIdx / SLOTS_PER_HOUR);
        const isHourStart = slotIdx % SLOTS_PER_HOUR === 0;
        
        // Time label: show hour label at hour boundaries
        const hourLabel = hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`;
        
        // Get the hour's narrative data (for tooltip on any slot within the hour)
        const hourNarr = hourlyNarratives.get(hour)!;
        const topNarratives = hourNarr.narratives
          .sort((a, b) => b.count - a.count)
          .slice(0, MAX_SEGMENTS);
        
        const flatData: Record<string, any> = {
          time: hourLabel,
          slotIndex: slotIdx,
          hourIndex: hour,
          isHourStart,
          // Include hour data on ALL slots for tooltip display
          totalMessages: hourNarr.totalMessages,
          volumePercent: (hourNarr.totalMessages / maxMessages) * 100,
          isEmpty: hourNarr.totalMessages === 0,
        };
        
        // Add narrative segment data to ALL slots (for tooltip)
        topNarratives.forEach((n, idx) => {
          flatData[`segment${idx}Name`] = n.name;
          flatData[`segment${idx}Sentiment`] = n.sentiment;
          // Only set segment VALUE at hour start for bar rendering
          flatData[`segment${idx}`] = isHourStart ? n.count : 0;
          flatData[`segment${idx}Count`] = n.count; // Store actual count for tooltip
        });
        
        for (let i = topNarratives.length; i < MAX_SEGMENTS; i++) {
          flatData[`segment${i}`] = 0;
          flatData[`segment${i}Name`] = '';
          flatData[`segment${i}Sentiment`] = 'neutral';
          flatData[`segment${i}Count`] = 0;
        }
        
        stackedChartData.push(flatData);
      }
      
      const totalMessages = hourData.reduce((sum, h) => sum + h.totalMessages, 0);
      const hasAnyData = hourData.some(h => h.totalMessages > 0);
      
      return { stackedChartData, totalMessages, hasAnyData, is5MinView: true };
    }
    
    // Original logic for 24H view
    if (!historyData?.data || historyData.data.length === 0) {
      return { stackedChartData: [], totalMessages: 0, hasAnyData: false, is5MinView: false };
    }

    const filteredData = historyData.data.filter(point => {
      const pointDate = new Date(point.recorded_at);
      return pointDate.getTime() >= twentyFourHoursAgo.getTime() && pointDate.getTime() <= now.getTime();
    });

    // Group data by hour
    const byHour = new Map<string, { 
      hour: string; 
      sortKey: string;
      hourIndex: number;
      narratives: { name: string; count: number; sentiment: string }[];
      totalMessages: number;
    }>();
    
    filteredData.forEach(point => {
      const date = new Date(point.recorded_at);
      const hourKey = date.toLocaleTimeString(undefined, { hour: 'numeric', hour12: true });
      const sortKey = date.toISOString();
      const hourIndex = date.getHours();
      
      if (!byHour.has(sortKey)) {
        byHour.set(sortKey, { 
          hour: hourKey, 
          sortKey, 
          hourIndex,
          narratives: [],
          totalMessages: 0
        });
      }
      
      const entry = byHour.get(sortKey)!;
      entry.totalMessages += point.message_count;
      
      // Accumulate narratives for this hour
      if (point.narratives && Array.isArray(point.narratives)) {
        point.narratives.forEach((n: any) => {
          const existing = entry.narratives.find(x => x.name === n.name);
          if (existing) {
            existing.count += n.count || 0;
          } else {
            entry.narratives.push({
              name: n.name,
              count: n.count || 0,
              sentiment: n.sentiment || 'neutral'
            });
          }
        });
      }
    });

    // Find max message count for relative volume calculation
    const hourEntries = Array.from(byHour.values());
    const maxMessages = Math.max(...hourEntries.map(h => h.totalMessages), 1);

    // Process each hour: sort by count and take top segments
    const stackedChartData = hourEntries
      .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
      .map(hourData => {
        // Sort narratives by count descending and take top MAX_SEGMENTS
        const topNarratives = hourData.narratives
          .sort((a, b) => b.count - a.count)
          .slice(0, MAX_SEGMENTS);
        
        // Build flattened data structure for Recharts
        const flatData: Record<string, any> = {
          hour: hourData.hour,
          sortKey: hourData.sortKey,
          hourIndex: hourData.hourIndex,
          totalMessages: hourData.totalMessages,
          volumePercent: (hourData.totalMessages / maxMessages) * 100,
        };
        
        topNarratives.forEach((n, idx) => {
          flatData[`segment${idx}`] = n.count;
          flatData[`segment${idx}Name`] = n.name;
          flatData[`segment${idx}Sentiment`] = n.sentiment;
        });
        
        // Fill remaining segments with zeros
        for (let i = topNarratives.length; i < MAX_SEGMENTS; i++) {
          flatData[`segment${i}`] = 0;
          flatData[`segment${i}Name`] = '';
          flatData[`segment${i}Sentiment`] = 'neutral';
        }
        
        return flatData;
      });

    const totalMessages = filteredData.reduce((sum, point) => sum + point.message_count, 0);

    return { stackedChartData, totalMessages, hasAnyData: stackedChartData.length > 0, is5MinView: false };
  }, [historyData, timeRange, todayStart, todayEnd, twentyFourHoursAgo, now, START_HOUR, END_HOUR, VISIBLE_HOURS, SLOTS_PER_HOUR]);

  // Merge price data into chart data
  const chartDataWithPrice = useMemo(() => {
    if (!showPriceOverlay || !priceData?.prices || priceData.prices.length === 0) {
      return stackedChartData;
    }

    // For 5-minute view (Today), use 5-minute slot alignment for granular price line
    if (is5MinView) {
      const priceBySlot = alignPricesToFiveMinSlots(priceData.prices, START_HOUR, END_HOUR);
      
      return stackedChartData.map(item => {
        const slotIndex = item.slotIndex;
        const pricePoint = priceBySlot.get(slotIndex);
        return {
          ...item,
          price: pricePoint?.price ?? null,
        };
      });
    }

    // Build hour-to-price map for other views
    const priceByHour = alignPricesToHourSlots(priceData.prices, timeRange);

    return stackedChartData.map(item => {
      const hourIndex = item.hourIndex;
      const pricePoint = priceByHour.get(hourIndex);
      return {
        ...item,
        price: pricePoint?.price ?? null,
      };
    });
  }, [stackedChartData, priceData, showPriceOverlay, timeRange, is5MinView]);

  // Calculate bar domain for left Y-axis (double max to make bars half height)
  const barDomain = useMemo(() => {
    if (!chartDataWithPrice || chartDataWithPrice.length === 0) {
      return [0, 'auto'];
    }
    // Calculate max stacked value for each data point
    const maxStackedValue = Math.max(...chartDataWithPrice.map(item => {
      let sum = 0;
      for (let i = 0; i < MAX_SEGMENTS; i++) {
        sum += (item[`segment${i}`] as number) || 0;
      }
      return sum;
    }), 1);
    // Double the max to make bars appear at half height
    return [0, maxStackedValue * 2];
  }, [chartDataWithPrice]);

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
    // Use 3% padding for tight fit, minimum $0.25 to handle flat prices
    const padding = Math.max(range * 0.03, 0.25);
    // Round to nearest $0.25 for cleaner axis labels
    const roundTo = 0.25;
    return [
      Math.floor((minPrice - padding) / roundTo) * roundTo,
      Math.ceil((maxPrice + padding) / roundTo) * roundTo
    ];
  }, [priceData, showPriceOverlay]);

  // Derive panel data (hovered or most recent with data)
  const panelData = useMemo((): SidePanelData | null => {
    if (hoveredData) {
      return hoveredData;
    }
    
    // Find most recent data point with messages
    const mostRecent = chartDataWithPrice
      .slice()
      .reverse()
      .find(item => (item as any).totalMessages > 0 && !(item as any).isEmpty);
      
    if (!mostRecent) return null;
    
    const mr = mostRecent as Record<string, any>;
    return {
      label: mr.time || mr.hour || '',
      totalMessages: mr.totalMessages || 0,
      price: mr.price ?? null,
      volumePercent: mr.volumePercent || 0,
      segments: extractSegmentsFromDataPoint(mr),
      isEmpty: mr.isEmpty,
    };
  }, [hoveredData, chartDataWithPrice]);

  // Handle chart mouse events for side panel
  const handleChartMouseMove = useCallback((state: any) => {
    if (state?.activePayload?.[0]?.payload) {
      const payload = state.activePayload[0].payload;
      
      // Update active hour for bar highlighting
      if (payload.hourIndex !== undefined) {
        setActiveHour(payload.hourIndex);
      }
      
      // Update side panel data
      setHoveredData({
        label: payload.time || payload.hour,
        totalMessages: payload.totalMessages || 0,
        price: payload.price ?? null,
        volumePercent: payload.volumePercent || 0,
        segments: extractSegmentsFromDataPoint(payload),
        isEmpty: payload.isEmpty,
      });
    }
  }, []);

  const handleChartMouseLeave = useCallback(() => {
    setActiveHour(null);
    setHoveredData(null);
  }, []);

  // Determine if we should fall back to live AI analysis
  // For "Today" view, always show the 24-hour skeleton even with no data
  // For "24H" view, fall back to live AI if no data
  const shouldFallbackToLive = !historyLoading && timeRange === '24H' && !hasAnyData;

  // If no hourly data exists for 24H view, fall back to live AI analysis (same as 1H/6H views)
  if (shouldFallbackToLive) {
    return <HorizontalNarrativeChart symbol={symbol} timeRange={timeRange} />;
  }

  if (historyLoading) {
    return <AIAnalysisLoader symbol={symbol} analysisType="narratives" />;
  }

  if (error) {
    return (
      <div className="h-[480px] w-full flex flex-col items-center justify-center gap-4 text-muted-foreground">
        <AlertCircle className="h-8 w-8 text-destructive" />
        <p className="text-sm">Failed to load narrative history. Please try again.</p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Main chart area with fixed height */}
      <div className="h-[380px] md:h-[520px]">
        {/* Header - Collapsible */}
        <Collapsible defaultOpen={false} className="mb-2">
          <CollapsibleTrigger asChild>
            <div className="flex items-center justify-end p-1 cursor-pointer hover:bg-card/30 rounded transition-colors">
              <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform [[data-state=open]>&]:rotate-180" />
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2">
            <div className="flex items-center justify-between p-3 rounded-lg bg-card/50 border border-border">
              <div className="flex items-center gap-3">
                <TrendingUp className="h-5 w-5 text-primary" />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Hourly Narrative Breakdown</span>
                    <span className="px-2 py-0.5 rounded bg-primary/20 text-primary text-xs">
                      independent
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
                    <span>{timeRange === '1D' ? 'Today' : 'Last 24h'} • each bar shows that hour's top narratives</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {timeRange === '1D' && (
                  <MarketSessionSelector 
                    session={marketSession} 
                    onSessionChange={setMarketSession}
                  />
                )}
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
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Main content: Side Panel + Chart */}
        <div className="flex md:gap-4 h-[calc(100%-60px)]">
          {/* Left Side Panel - Always visible on desktop */}
          <NarrativeSidePanel 
            data={panelData} 
            priceColor={priceLineColor}
            isHovering={hoveredData !== null}
          />
          
          {/* Chart - Takes remaining space */}
          <div className="flex-1 min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart 
                data={chartDataWithPrice}
                margin={{ top: 10, right: showPriceOverlay ? 50 : 15, left: 5, bottom: 10 }}
                barCategoryGap={0}
                barGap={0}
                onMouseMove={handleChartMouseMove}
                onMouseLeave={handleChartMouseLeave}
              >
                <XAxis 
                  dataKey="time"
                  stroke="hsl(215 20% 55%)" 
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  interval={is5MinView ? 11 : 0}
                  tick={({ x, y, payload }: { x: number; y: number; payload: { index: number; value: string } }) => {
                    if (is5MinView) {
                      const item = chartDataWithPrice[payload.index] as Record<string, any> | undefined;
                      if (!item?.isHourStart) return null;
                    }
                    return (
                      <text x={x} y={y + 12} textAnchor="middle" fill="hsl(215 20% 55%)" fontSize={11}>
                        {payload.value}
                      </text>
                    );
                  }}
                />
                <YAxis 
                  yAxisId="left"
                  stroke="hsl(215 20% 55%)" 
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  width={10}
                  tick={false}
                  domain={barDomain as [number, number | string]}
                />
                {showPriceOverlay && (
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
                {/* Tooltip hidden on desktop, visible on mobile */}
                <Tooltip 
                  content={({ active, payload, label }) => {
                    if (typeof window !== 'undefined' && window.innerWidth >= 768) {
                      return null;
                    }
                    return <NarrativeStackedTooltip active={active} payload={payload} label={label} priceColor={priceLineColor} />;
                  }} 
                />
                {Array.from({ length: MAX_SEGMENTS }).map((_, idx) => (
                  <Bar 
                    key={`segment${idx}`}
                    yAxisId="left"
                    dataKey={`segment${idx}`}
                    stackId="narratives"
                    shape={(props: any) => (
                      <WideBarShape 
                        {...props} 
                        is5MinView={is5MinView}
                        activeHour={activeHour}
                        radius={idx === MAX_SEGMENTS - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                      />
                    )}
                    activeBar={false}
                  >
                    {chartDataWithPrice.map((entry, entryIdx) => (
                      <Cell 
                        key={`cell-${entryIdx}`} 
                        fill={SENTIMENT_COLORS[entry[`segment${idx}Sentiment`] as keyof typeof SENTIMENT_COLORS] || SENTIMENT_COLORS.neutral}
                      />
                    ))}
                  </Bar>
                ))}
                {showPriceOverlay && (
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
                {showPriceOverlay && is5MinView && priceData?.previousClose && (
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
        </div>
      </div>
      
      {/* Mobile Side Panel - Always visible below chart on mobile for Today view */}
      {is5MinView && (
        <NarrativeSidePanel 
          data={panelData} 
          priceColor={priceLineColor}
          isHovering={hoveredData !== null}
          isMobile={true}
        />
      )}
    </div>
  );
}

// Horizontal bar chart for 1H/6H
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
      <div className="h-[480px] w-full flex flex-col items-center justify-center gap-4 text-muted-foreground">
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
      <div className="h-[480px] w-full flex flex-col items-center justify-center gap-4 text-muted-foreground">
        <Sparkles className="h-8 w-8" />
        <p className="text-sm">No narratives found for {symbol}. Try a different time range.</p>
      </div>
    );
  }

  return (
    <div className="h-[480px] w-full">
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

  // Use hourly stacked bar chart for 1D and 24H
  if (timeRange === '1D' || timeRange === '24H') {
    return <HourlyStackedNarrativeChart symbol={symbol} timeRange={timeRange} />;
  }

  // Use horizontal bar chart for 1H/6H
  return <HorizontalNarrativeChart symbol={symbol} timeRange={timeRange} />;
}
