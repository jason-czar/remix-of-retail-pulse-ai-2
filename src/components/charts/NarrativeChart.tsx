import { ComposedChart, BarChart, Bar, Line, Area, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Rectangle, ReferenceLine, ReferenceArea, Customized } from "recharts";
import { motion } from "framer-motion";
import { useMemo, useEffect, useState, useCallback, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { triggerHaptic } from "@/lib/haptics";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { useNarrativeAnalysis, Narrative } from "@/hooks/use-narrative-analysis";
import { useNarrativeHistory } from "@/hooks/use-narrative-history";
import { useVolumeAnalytics } from "@/hooks/use-stocktwits";
import { useAutoBackfill } from "@/hooks/use-auto-backfill";
import { useStockPrice } from "@/hooks/use-stock-price";
import { alignPricesToHourSlots, alignPricesToFiveMinSlots } from "@/lib/stock-price-api";
import { AlertCircle, RefreshCw, Sparkles, TrendingUp, MessageSquare, AlertTriangle, DollarSign, ChevronDown, Calendar } from "lucide-react";
import { AIAnalysisLoader } from "@/components/AIAnalysisLoader";
import { ChartSkeleton } from "./ChartSkeleton";
import { BackfillIndicator, BackfillBadge } from "@/components/BackfillIndicator";
import { FillGapsDialog } from "@/components/FillGapsDialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { format } from "date-fns";
import { detectMissingDates } from "@/lib/chart-gap-utils";
import { MarketSessionSelector, MarketSession, SESSION_RANGES } from "./MarketSessionSelector";
import { CHART_SIDE_PANEL, CHART_SIDE_PANEL_MOBILE } from "@/lib/chart-constants";
type TimeRange = "1H" | "6H" | "1D" | "24H" | "7D" | "30D";

// Stock price line colors based on price vs previous close
const PRICE_UP_COLOR = "#00C805"; // Green when above previous close
const PRICE_DOWN_COLOR = "#FF5000"; // Red-orange when below previous close

interface NarrativeChartProps {
  symbol: string;
  timeRange?: TimeRange;
  start?: string;
  end?: string;
  enabled?: boolean;
}

// Color palette for stacked bar chart themes
const THEME_COLORS = ["hsl(199 89% 48%)",
// Blue
"hsl(142 71% 45%)",
// Green
"hsl(262 83% 58%)",
// Purple
"hsl(24 95% 53%)",
// Orange
"hsl(340 75% 55%)",
// Pink
"hsl(47 96% 53%)",
// Yellow
"hsl(172 66% 50%)",
// Teal
"hsl(291 64% 42%)" // Violet
];

// Color palette for narratives based on sentiment
const getSentimentColor = (sentiment: string, index: number) => {
  const bullishColors = ["#00C805",
  // Primary green
  "hsl(122 100% 35%)", "hsl(122 100% 30%)"];
  const bearishColors = ["#FF5000",
  // Primary orange/red
  "hsl(19 100% 45%)", "hsl(19 100% 40%)"];
  const neutralColors = ["#0DA2E7",
  // Primary blue
  "hsl(199 85% 45%)", "hsl(199 80% 40%)"];
  const palette = sentiment === "bullish" ? bullishColors : sentiment === "bearish" ? bearishColors : neutralColors;
  return palette[index % palette.length];
};
const getSentimentBadge = (sentiment: string) => {
  const styles = {
    bullish: "bg-[#00C805]/20 text-[#00C805] border-[#00C805]/30",
    bearish: "bg-[#FF5000]/20 text-[#FF5000] border-[#FF5000]/30",
    neutral: "bg-[#0DA2E7]/20 text-[#0DA2E7] border-[#0DA2E7]/30"
  };
  return styles[sentiment as keyof typeof styles] || styles.neutral;
};

// Sentiment colors
const SENTIMENT_COLORS = {
  bullish: "#00C805",
  // Green
  bearish: "#FF5000",
  // Orange/Red
  neutral: "#0DA2E7" // Blue
};

// Max segments per day
const MAX_SEGMENTS = 6;
const SLOTS_PER_HOUR = 12; // 5-minute slots per hour

// Custom bar shape that expands width to cover full hour in 5-min view
// Uses liquid glass effect with stroke border and inner highlight
function WideBarShape(props: any) {
  const {
    x,
    y,
    width,
    height,
    fill,
    radius,
    payload,
    is5MinView,
    activeHour
  } = props;

  // Determine opacity: 55% when this hour is hovered, 35% otherwise (liquid glass style)
  const isHourActive = activeHour !== null && payload?.hourIndex === activeHour;
  const baseOpacity = 0.35;
  const hoverOpacity = 0.55;
  const opacity = isHourActive ? hoverOpacity : baseOpacity;

  // Glass effect styles with smooth transitions
  const glassStyle = {
    transition: "fill-opacity 0.2s ease-out, stroke-opacity 0.2s ease-out",
    filter: "saturate(1.05)"
  };

  // In 5-min view, expand bar width to cover 12 slots (full hour)
  // Only render for hour-start slots
  if (is5MinView) {
    if (!payload?.isHourStart || height === 0) {
      return null;
    }
    // Expand width to cover 12 slots
    const expandedWidth = width * SLOTS_PER_HOUR;
    return <g>
        <Rectangle x={x} y={y} width={expandedWidth} height={height} fill={fill} fillOpacity={opacity} stroke={fill} strokeOpacity={isHourActive ? 0.7 : 0.45} strokeWidth={1} radius={radius} style={glassStyle} />
        {/* Inner glass highlight */}
        <Rectangle x={x + 1} y={y + 1} width={Math.max(0, expandedWidth - 2)} height={Math.max(0, Math.min(height * 0.12, 5))} fill="white" fillOpacity={0.1} radius={radius ? [Math.max(0, radius[0] - 1), Math.max(0, radius[1] - 1), 0, 0] : undefined} style={{
        pointerEvents: "none"
      }} />
      </g>;
  }
  if (height <= 0) return null;

  // Normal rendering for non-5-min views with glass effect
  return <g>
      <Rectangle x={x} y={y} width={width} height={height} fill={fill} fillOpacity={opacity} stroke={fill} strokeOpacity={isHourActive ? 0.7 : 0.45} strokeWidth={1} radius={radius} style={glassStyle} />
      {/* Inner glass highlight */}
      <Rectangle x={x + 1} y={y + 1} width={Math.max(0, width - 2)} height={Math.max(0, Math.min(height * 0.12, 5))} fill="white" fillOpacity={0.1} radius={radius ? [Math.max(0, radius[0] - 1), Math.max(0, radius[1] - 1), 0, 0] : undefined} style={{
      pointerEvents: "none"
    }} />
    </g>;
}

// Custom tooltip for hourly price data on 7D/30D views
function HourlyPriceTooltip({
  active,
  payload,
  priceColor
}: any) {
  if (!active || !payload || !payload.length) return null;
  const dataPoint = payload[0]?.payload;
  if (!dataPoint) return null;
  return <div className="bg-card border border-border rounded-lg p-3 shadow-xl min-w-[160px]">
      <div className="flex items-center justify-between mb-2">
        <span className="font-semibold text-card-foreground">{dataPoint.dateLabel}</span>
        <span className="text-xs text-muted-foreground">{dataPoint.timeLabel}</span>
      </div>

      {dataPoint.price != null && <div className="flex items-center gap-2">
          <DollarSign className="h-4 w-4" style={{
        color: priceColor || "#00C805"
      }} />
          <span className="font-bold text-lg" style={{
        color: priceColor || "#00C805"
      }}>
            ${dataPoint.price.toFixed(2)}
          </span>
        </div>}
    </div>;
}

// Custom tooltip for independent daily/hourly view with volume indicator
function NarrativeStackedTooltip({
  active,
  payload,
  label,
  priceColor
}: any) {
  if (!active || !payload || !payload.length) return null;
  const dataPoint = payload[0]?.payload;

  // Handle gap placeholders
  if (dataPoint?.isGap) {
    return <div className="bg-card border border-dashed border-amber-500/50 rounded-lg p-3 shadow-xl min-w-[200px]">
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          <span className="font-semibold text-amber-500">{label}</span>
        </div>
        <p className="text-sm text-muted-foreground">No data available for this date.</p>
        <p className="text-xs text-amber-500/80 mt-2">Click "Fill Gaps" to fetch historical data.</p>
      </div>;
  }

  // Handle empty hours (no data yet - e.g., future hours in "Today" view)
  if (dataPoint?.isEmpty) {
    return <div className="bg-card border border-border rounded-lg p-3 shadow-xl min-w-[180px]">
        <span className="font-semibold text-card-foreground">{label}</span>
        <p className="text-sm text-muted-foreground mt-1">No data available yet</p>
        {dataPoint.price != null && <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border/50">
            <DollarSign className="h-3 w-3" style={{
          color: priceColor || "#00C805"
        }} />
            <span className="font-semibold" style={{
          color: priceColor || "#00C805"
        }}>
              ${dataPoint.price.toFixed(2)}
            </span>
          </div>}
      </div>;
  }

  // Extract all segments from payload - use segment${i}Count for actual values (works on any slot)
  const segments: {
    name: string;
    count: number;
    sentiment: string;
  }[] = [];
  if (dataPoint) {
    for (let i = 0; i < MAX_SEGMENTS; i++) {
      const name = dataPoint[`segment${i}Name`];
      // Use segment${i}Count if available (for 5-min view), fallback to segment${i} for other views
      const count = dataPoint[`segment${i}Count`] ?? dataPoint[`segment${i}`];
      const sentiment = dataPoint[`segment${i}Sentiment`];
      if (name && count > 0) {
        segments.push({
          name,
          count,
          sentiment
        });
      }
    }
  }
  const totalMessages = dataPoint?.totalMessages || 0;
  const volumePercent = dataPoint?.volumePercent || 0;
  const price = dataPoint?.price;
  return <div className="bg-card border border-border rounded-lg p-3 shadow-xl min-w-[280px]">
      <div className="flex items-center justify-between mb-2">
        <span className="font-semibold text-card-foreground">{label}</span>
        {totalMessages > 0 && <div className="flex items-center gap-1.5 text-xs">
            <MessageSquare className="h-3 w-3 text-amber-400" />
            <span className="text-amber-400 font-medium">{totalMessages.toLocaleString()}</span>
            <span className="text-muted-foreground">msgs</span>
          </div>}
        {price != null && <span className="font-bold text-foreground text-sm">
            ${price.toFixed(2)}
          </span>}
      </div>

      {/* Volume indicator bar */}
      {volumePercent > 0 && <div className="mb-3">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-muted-foreground">Relative Activity</span>
            <span className={`font-medium ${volumePercent >= 80 ? "text-amber-400" : volumePercent >= 50 ? "text-primary" : "text-muted-foreground"}`}>
              {volumePercent.toFixed(0)}%
            </span>
          </div>
          <div className="h-1.5 bg-muted/30 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all ${volumePercent >= 80 ? "bg-amber-400" : volumePercent >= 50 ? "bg-primary" : "bg-muted-foreground/50"}`} style={{
          width: `${Math.min(volumePercent, 100)}%`
        }} />
          </div>
        </div>}

      {segments.length > 0 && <div className="space-y-1.5 pt-2 border-t border-border/50">
          <div className="text-xs text-muted-foreground mb-1">Top Narratives:</div>
          {segments.map((segment, idx) => <div key={idx} className="flex items-center gap-2 text-sm">
              <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{
          backgroundColor: SENTIMENT_COLORS[segment.sentiment as keyof typeof SENTIMENT_COLORS] || SENTIMENT_COLORS.neutral
        }} />
              <span className="text-card-foreground flex-1 truncate max-w-[160px]">{segment.name}</span>
              <span className="text-muted-foreground">{segment.count}</span>
              <span className={`text-xs px-1.5 py-0.5 rounded border ${getSentimentBadge(segment.sentiment)}`}>
                {segment.sentiment}
              </span>
            </div>)}
        </div>}
    </div>;
}

// Types for side panel data
interface SidePanelData {
  label: string;
  totalMessages: number;
  price?: number | null;
  volumePercent: number;
  segments: {
    name: string;
    count: number;
    sentiment: string;
  }[];
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
  // Track data changes for animation key
  const animationKey = data?.label ?? 'empty';

  // Professional monochromatic card styling matching LensReadinessCard
  const baseClasses = "relative overflow-hidden rounded-2xl bg-card/60 dark:bg-card/40 border border-border/50 backdrop-blur-xl";
  const containerClasses = isMobile 
    ? `${CHART_SIDE_PANEL_MOBILE.WIDTH_CLASS} ${CHART_SIDE_PANEL_MOBILE.MARGIN_CLASS} p-4 ${baseClasses}` 
    : `w-[${CHART_SIDE_PANEL.WIDTH}px] flex-shrink-0 p-5 ${baseClasses}`;

  // Animation variants for entrance
  const panelVariants = {
    initial: {
      opacity: 0,
      y: 6
    },
    animate: {
      opacity: 1,
      y: 0
    },
    exit: {
      opacity: 0,
      y: -4
    }
  };
  const transitionConfig = {
    duration: 0.35,
    ease: "easeOut" as const
  };
  if (!data) {
    return <div className={cn(
      isMobile 
        ? `${CHART_SIDE_PANEL_MOBILE.WIDTH_CLASS} ${CHART_SIDE_PANEL_MOBILE.MARGIN_CLASS} p-4` 
        : `w-[${CHART_SIDE_PANEL.WIDTH}px] flex-shrink-0 p-5`, 
      baseClasses, "flex items-center justify-center"
    )}>
        <p className={cn(isMobile ? "text-sm" : "text-base", "text-muted-foreground text-center")}>No data available</p>
      </div>;
  }

  // Handle gap placeholders
  if (data.isGap) {
    return <motion.div key={`gap-${animationKey}`} variants={panelVariants} initial="initial" animate="animate" transition={transitionConfig} className={cn(containerClasses, "!border-dashed !border-warning/50")}>
        <div className={cn("flex items-center gap-2", isMobile ? "mb-2" : "mb-3")}>
          <AlertTriangle className={cn(isMobile ? "h-4 w-4" : "h-5 w-5", "text-warning")} />
          <span className={cn("font-semibold text-warning", isMobile ? "text-base" : "text-lg")}>{data.label}</span>
        </div>
        <p className={cn("text-muted-foreground", isMobile ? "text-sm" : "text-base")}>
          No data available for this date.
        </p>
        <p className={cn("text-warning/80", isMobile ? "text-xs mt-2" : "text-sm mt-3")}>
          Click "Fill Gaps" to fetch historical data.
        </p>
      </motion.div>;
  }

  // Handle empty hours
  if (data.isEmpty) {
    return <motion.div key={`empty-${animationKey}`} variants={panelVariants} initial="initial" animate="animate" transition={transitionConfig} className={containerClasses}>
        <span className={cn("font-semibold text-foreground", isMobile ? "text-base" : "text-lg")}>
          {data.label}
        </span>
        <p className={cn("text-muted-foreground", isMobile ? "text-sm mt-1" : "text-base mt-2")}>
          No data available yet
        </p>
        {data.price != null && <div className={cn("flex items-center gap-2 border-t border-border/30", isMobile ? "mt-2 pt-2" : "mt-3 pt-3")}>
            <DollarSign className={cn(isMobile ? "h-4 w-4" : "h-5 w-5")} style={{
          color: priceColor
        }} />
            <span className={cn("font-bold", isMobile ? "text-lg" : "text-xl")} style={{
          color: priceColor
        }}>
              ${data.price.toFixed(2)}
            </span>
          </div>}
        {!isHovering && !isMobile && <div className="mt-4 pt-3 border-t border-border/30">
            <span className="text-sm text-muted-foreground italic">Showing latest • Hover chart to explore</span>
          </div>}
      </motion.div>;
  }
  return <motion.div key={animationKey} variants={panelVariants} initial="initial" animate="animate" transition={transitionConfig} className={containerClasses}>
      <div className="">
        {/* Time/Date Header with Messages and Price */}
        <div className={cn("flex items-center justify-between", isMobile ? "mb-2" : "mb-3")}>
          <span className={cn("font-semibold text-foreground tracking-tight", isMobile ? "text-base" : "text-lg")}>
            {data.label}
          </span>
          {data.totalMessages > 0 && <div className={cn("flex items-center gap-1", isMobile ? "text-xs" : "text-sm gap-1.5")}>
              <MessageSquare className={cn(isMobile ? "h-3 w-3" : "h-4 w-4")} style={{
            color: "#007BFF"
          }} />
              <span className="font-medium" style={{
            color: "#007BFF"
          }}>{data.totalMessages.toLocaleString()}</span>
              <span className={cn("text-muted-foreground", isMobile ? "text-[10px]" : "text-xs")}>msgs</span>
            </div>}
          {data.price != null && <span className={cn("font-bold text-foreground", isMobile ? "text-sm" : "text-base")}>
              ${data.price.toFixed(2)}
            </span>}
        </div>

        {/* Relative Activity Bar */}
        {data.volumePercent > 0 && <div className={isMobile ? "mb-3" : "mb-4"}>
            <div className={cn("flex items-center justify-between mb-1.5", isMobile ? "text-xs" : "text-sm")}>
              <span className="text-muted-foreground">Relative Activity</span>
              <span className={cn("font-medium", data.volumePercent >= 50 ? "text-primary" : "text-muted-foreground")} style={data.volumePercent >= 80 ? {
            color: "#007BFF"
          } : undefined}>
                {data.volumePercent.toFixed(0)}%
              </span>
            </div>
            <div className={cn("bg-muted/20 dark:bg-white/5 rounded-full overflow-hidden", isMobile ? "h-1.5" : "h-2")}>
              <motion.div initial={{
            width: 0
          }} animate={{
            width: `${Math.min(data.volumePercent, 100)}%`
          }} transition={{
            duration: 0.5,
            ease: "easeOut"
          }} className={cn("h-full rounded-full", data.volumePercent >= 50 ? "bg-primary" : "bg-muted-foreground/50")} style={{
            backgroundColor: data.volumePercent >= 80 ? "#007BFF" : undefined
          }} />
            </div>
          </div>}

        {/* Top Narratives */}
        {data.segments.length > 0 && <div className={cn("border-t border-border/30", isMobile ? "space-y-2 pt-3" : "space-y-3 pt-4")}>
            <div className={cn("text-muted-foreground", isMobile ? "text-xs mb-1" : "text-sm mb-2")}>Top Narratives:</div>
            {data.segments.map((segment, idx) => <motion.div key={idx} initial={{
          opacity: 0,
          x: -8
        }} animate={{
          opacity: 1,
          x: 0
        }} transition={{
          duration: 0.3,
          delay: idx * 0.05,
          ease: "easeOut"
        }} className={cn("flex items-center", isMobile ? "gap-1.5 text-xs" : "gap-2.5 text-base")}>
                
                <span className={cn("text-foreground/80 dark:text-foreground/75 flex-1 truncate", isMobile ? "text-xs" : "text-sm")}>
                  {segment.name}
                </span>
                <span className={cn("text-muted-foreground font-medium tabular-nums", isMobile ? "text-xs" : "text-sm")}>
                  {segment.count}
                </span>
                <span className={cn("px-2 py-0.5 rounded-md border font-medium", isMobile ? "text-[9px]" : "text-[11px]", getSentimentBadge(segment.sentiment))}>
                  {segment.sentiment}
                </span>
              </motion.div>)}
          </div>}

        {/* Default indicator - only on desktop */}
        {!isHovering && !isMobile && <div className="mt-4 pt-3 border-t border-border/30">
            <span className="text-sm text-muted-foreground italic">Showing latest • Hover chart to explore</span>
          </div>}
      </div>
    </motion.div>;
}

// Helper to extract segments from a data point
function extractSegmentsFromDataPoint(dataPoint: Record<string, any>): {
  name: string;
  count: number;
  sentiment: string;
}[] {
  const segments: {
    name: string;
    count: number;
    sentiment: string;
  }[] = [];
  for (let i = 0; i < MAX_SEGMENTS; i++) {
    const name = dataPoint[`segment${i}Name`];
    const count = dataPoint[`segment${i}Count`] ?? dataPoint[`segment${i}`];
    const sentiment = dataPoint[`segment${i}Sentiment`];
    if (name && count > 0) {
      segments.push({
        name,
        count,
        sentiment
      });
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
  timeRange: "7D" | "30D";
}) {
  const [showPriceOverlay, setShowPriceOverlay] = useState(true);
  const [showWeekends, setShowWeekends] = useState(false);
  const [hoveredData, setHoveredData] = useState<SidePanelData | null>(null);
  const isMobileDevice = useIsMobile();
  const prevDataPointRef = useRef<string | null>(null);
  const days = timeRange === "7D" ? 7 : 30;
  const {
    data: historyData,
    isLoading,
    error,
    refetch,
    isFetching
  } = useNarrativeHistory(symbol, days, "daily");

  // Fetch stock price data with 1-hour intervals
  const {
    data: priceData,
    isLoading: priceLoading
  } = useStockPrice(symbol, timeRange, showPriceOverlay);

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
  const {
    stackedChartData,
    totalMessages,
    gapCount,
    barDomain
  } = useMemo(() => {
    if (!historyData?.data || historyData.data.length === 0) {
      return {
        stackedChartData: [],
        totalMessages: 0,
        gapCount: 0,
        barDomain: [0, 100] as [number, number]
      };
    }

    // Group data by date
    const byDate = new Map<string, {
      date: string;
      sortKey: string;
      narratives: {
        name: string;
        count: number;
        sentiment: string;
      }[];
      totalMessages: number;
      isGap?: boolean;
    }>();
    historyData.data.forEach(point => {
      // Use UTC date to avoid timezone issues causing duplicate labels
      const sortKey = new Date(point.recorded_at).toISOString().split("T")[0];
      const [year, month, day] = sortKey.split("-").map(Number);
      const utcDate = new Date(Date.UTC(year, month - 1, day));
      const dateKey = format(utcDate, "MMM d");
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
              sentiment: n.sentiment || "neutral"
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
      const [year, month, day] = sortKey.split("-").map(Number);
      const utcDate = new Date(Date.UTC(year, month - 1, day));
      byDate.set(sortKey, {
        date: format(utcDate, "MMM d"),
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
    const stackedChartData = dateEntries.sort((a, b) => a.sortKey.localeCompare(b.sortKey)).map(dayData => {
      // Sort narratives by count descending and take top MAX_SEGMENTS
      const topNarratives = dayData.narratives.sort((a, b) => b.count - a.count).slice(0, MAX_SEGMENTS);

      // Build flattened data structure for Recharts
      const flatData: Record<string, any> = {
        date: dayData.date,
        sortKey: dayData.sortKey,
        totalMessages: dayData.totalMessages,
        volumePercent: dayData.totalMessages / maxMessages * 100,
        isGap: dayData.isGap || false
      };

      // For gaps, add a placeholder segment
      if (dayData.isGap) {
        flatData["gapPlaceholder"] = 1; // Small value for visual indicator
        for (let i = 0; i < MAX_SEGMENTS; i++) {
          flatData[`segment${i}`] = 0;
          flatData[`segment${i}Name`] = "";
          flatData[`segment${i}Sentiment`] = "neutral";
        }
      } else {
        flatData["gapPlaceholder"] = 0;
        topNarratives.forEach((n, idx) => {
          flatData[`segment${idx}`] = n.count;
          flatData[`segment${idx}Name`] = n.name;
          flatData[`segment${idx}Sentiment`] = n.sentiment;
        });

        // Fill remaining segments with zeros
        for (let i = topNarratives.length; i < MAX_SEGMENTS; i++) {
          flatData[`segment${i}`] = 0;
          flatData[`segment${i}Name`] = "";
          flatData[`segment${i}Sentiment`] = "neutral";
        }
      }
      return flatData;
    });
    const totalMessages = historyData.data.reduce((sum, point) => sum + point.message_count, 0);

    // Calculate max stacked value for bar domain (double to make bars half height)
    const maxStackedValue = Math.max(...stackedChartData.filter(d => !d.isGap).map(item => {
      let sum = 0;
      for (let i = 0; i < MAX_SEGMENTS; i++) {
        sum += item[`segment${i}`] as number || 0;
      }
      return sum;
    }), 1);
    const barDomain: [number, number] = [0, maxStackedValue * 2];
    return {
      stackedChartData,
      totalMessages,
      gapCount: missingDates.length,
      barDomain
    };
  }, [historyData]);

  // Helper to check if a date is a weekend
  const isWeekend = (sortKey: string) => {
    const [year, month, day] = sortKey.split("-").map(Number);
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
        sum += item[`segment${i}`] as number || 0;
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
    return priceData.prices.filter(p => {
      const dateKey = new Date(p.timestamp).toISOString().split("T")[0];
      if (!showWeekends && isWeekend(dateKey)) return false;
      return dateKey >= startDate && dateKey <= endDate;
    }).map(point => {
      const date = new Date(point.timestamp);
      const dateKey = date.toISOString().split("T")[0];
      const hour = date.getHours();

      // Calculate x position: barIndex + (hour / 24) to interpolate within the day
      const barIndex = dateToIndex.get(dateKey) ?? 0;
      const xPosition = barIndex + hour / 24;
      return {
        x: xPosition,
        price: point.price,
        timestamp: point.timestamp,
        dateLabel: date.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric"
        }),
        timeLabel: date.toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit"
        })
      };
    }).sort((a, b) => a.x - b.x);
  }, [filteredChartData, priceData, showPriceOverlay, showWeekends]);

  // Chart data for bars (using filtered data)
  const chartDataWithPrice = useMemo(() => {
    return filteredChartData;
  }, [filteredChartData]);

  // Calculate price domain for right Y-axis - tight padding to fill vertical space
  const priceDomain = useMemo(() => {
    if (!showPriceOverlay || !priceData?.prices || priceData.prices.length === 0) {
      return ["auto", "auto"];
    }
    const prices = priceData.prices.map(p => p.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const range = maxPrice - minPrice;
    // Use 5% padding for 7D/30D views (slightly more than intraday)
    const padding = Math.max(range * 0.05, 0.5);
    // Round to nearest $0.50 for cleaner axis labels
    const roundTo = 0.5;
    return [Math.floor((minPrice - padding) / roundTo) * roundTo, Math.ceil((maxPrice + padding) / roundTo) * roundTo];
  }, [priceData, showPriceOverlay]);

  // Derive panel data (hovered or most recent with data)
  const panelData = useMemo((): SidePanelData | null => {
    if (hoveredData) {
      return hoveredData;
    }

    // Find most recent data point with messages (non-gap, has data)
    let mostRecent = chartDataWithPrice.slice().reverse().find(item => !item.isGap && item.totalMessages > 0);

    // If no valid points, fall back to the last data point (most recent date)
    if (!mostRecent && chartDataWithPrice.length > 0) {
      mostRecent = chartDataWithPrice[chartDataWithPrice.length - 1];
    }
    if (!mostRecent) return null;
    return {
      label: mostRecent.date,
      totalMessages: mostRecent.totalMessages,
      price: mostRecent.price ?? null,
      volumePercent: mostRecent.volumePercent || 0,
      segments: extractSegmentsFromDataPoint(mostRecent),
      isGap: mostRecent.isGap
    };
  }, [hoveredData, chartDataWithPrice]);

  // Handle chart mouse events for side panel
  const handleChartMouseMove = useCallback((state: any) => {
    if (state?.activePayload?.[0]?.payload) {
      const payload = state.activePayload[0].payload;

      // Trigger haptic feedback when moving to a new data point on mobile
      const currentLabel = payload.date || payload.dateLabel || payload.timestamp?.toString() || "";
      if (isMobileDevice && currentLabel !== prevDataPointRef.current) {
        triggerHaptic("selection");
        prevDataPointRef.current = currentLabel;
      }

      // For price line data, find corresponding bar data
      if (payload.dateLabel !== undefined) {
        // This is hourly price data - find matching date bar
        const dateKey = new Date(payload.timestamp).toISOString().split("T")[0];
        const matchingBar = chartDataWithPrice.find(d => d.sortKey === dateKey);
        if (matchingBar) {
          setHoveredData({
            label: `${payload.dateLabel} ${payload.timeLabel}`,
            totalMessages: matchingBar.totalMessages,
            price: payload.price,
            volumePercent: matchingBar.volumePercent || 0,
            segments: extractSegmentsFromDataPoint(matchingBar),
            isGap: matchingBar.isGap
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
        isGap: payload.isGap
      });
    }
  }, [chartDataWithPrice, isMobileDevice]);
  const handleChartMouseLeave = useCallback(() => {
    setHoveredData(null);
    prevDataPointRef.current = null;
  }, []);
  if (isLoading) {
    return <ChartSkeleton variant="stacked" showSidePanel={true} showControls={true} chartHeight="h-[350px] md:h-[480px]" />;
  }
  if (error) {
    return <div className="h-[480px] w-full flex flex-col items-center justify-center gap-4 text-muted-foreground">
        <AlertCircle className="h-8 w-8 text-destructive" />
        <p className="text-sm">Failed to load narrative history. Please try again.</p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>;
  }
  if (stackedChartData.length === 0) {
    return <div className="h-[480px] w-full flex flex-col items-center justify-center gap-4 text-muted-foreground">
        <Sparkles className="h-8 w-8" />
        <p className="text-sm">No narrative history found for {symbol}. Data will accumulate over time.</p>
      </div>;
  }
  return <div className="h-[480px] md:h-[520px] w-full">
      {/* Backfill indicator */}
      {isBackfilling && <div className="mb-3">
          <BackfillIndicator status={backfillStatus} progress={backfillProgress} />
        </div>}

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
                  <span className="px-2 py-0.5 rounded bg-primary/20 text-primary text-xs">independent</span>
                  <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-400 text-xs">
                    {historyData?.data.length || 0} snapshots
                  </span>
                  {gapCount > 0 && !isBackfilling && <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 text-xs flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      {gapCount} gap{gapCount > 1 ? "s" : ""}
                    </span>}
                  <BackfillBadge isBackfilling={isBackfilling} />
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                  {totalMessages > 0 && <span className="flex items-center gap-1">
                      <span className="font-semibold text-primary">{totalMessages.toLocaleString()}</span> total
                      messages
                    </span>}
                  <span>{days} days • each bar shows that day's top narratives</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* Weekend Toggle */}
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" style={{
                color: showWeekends ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))"
              }} />
                <span className="text-xs text-muted-foreground">Weekends</span>
                <Switch checked={showWeekends} onCheckedChange={setShowWeekends} />
              </div>
              {/* Price Toggle */}
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" style={{
                color: showPriceOverlay ? priceLineColor : "hsl(var(--muted-foreground))"
              }} />
                <span className="text-xs text-muted-foreground">Price</span>
                <Switch checked={showPriceOverlay} onCheckedChange={setShowPriceOverlay} style={{
                backgroundColor: showPriceOverlay ? priceLineColor : undefined
              }} />
              </div>
              <FillGapsDialog symbol={symbol} onComplete={() => refetch()} />
              <Button variant="ghost" size="sm" onClick={() => refetch()} disabled={isFetching || isBackfilling} className="h-8 px-3 text-xs">
                <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isFetching ? "animate-spin" : ""}`} />
                {isFetching ? "Refreshing..." : "Refresh"}
              </Button>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Main content: Side Panel + Chart */}
      <div className="flex md:gap-4 h-[calc(92%-55px)] pl-1">
        {/* Left Side Panel - Only on desktop */}
        {!isMobileDevice && <NarrativeSidePanel data={panelData} priceColor={priceLineColor} isHovering={hoveredData !== null} />}

        {/* Chart - Takes remaining space */}
        <div className="flex-1 min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={showPriceOverlay && priceLineData.length > 0 ? priceLineData : chartDataWithPrice} margin={{
            top: 10,
            right: showPriceOverlay ? 50 : 15,
            left: 5,
            bottom: 10
          }} onMouseMove={handleChartMouseMove} onMouseLeave={handleChartMouseLeave}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(217 33% 17%)" vertical={false} />
              {/* X-axis for bar labels */}
              <XAxis xAxisId="bar" dataKey="date" stroke="hsl(215 20% 55%)" fontSize={11} tickLine={false} axisLine={false} ticks={chartDataWithPrice.map(d => d.date)} allowDuplicatedCategory={false} />
              {/* Numeric X-axis for price line and hourly tooltip positioning */}
              <XAxis xAxisId="price" type="number" dataKey="x" domain={[0, chartDataWithPrice.length - 1]} hide={true} allowDataOverflow={true} />
              <YAxis yAxisId="left" hide={true} domain={filteredBarDomain} />
              {showPriceOverlay && <YAxis yAxisId="right" orientation="right" stroke={priceLineColor} fontSize={11} tickLine={false} axisLine={false} width={50} tickFormatter={value => `$${value.toFixed(0)}`} domain={priceDomain as [number, number]} />}
              {/* Tooltip hidden completely - side panel shows data on both desktop and mobile */}
              {/* Gap placeholder bars - shown with dashed pattern */}
              <Bar xAxisId="bar" yAxisId="left" dataKey="gapPlaceholder" data={chartDataWithPrice} stackId="narratives" radius={[4, 4, 0, 0]} isAnimationActive={false}>
                {chartDataWithPrice.map((entry, entryIdx) => <Cell key={`gap-${entryIdx}`} fill={entry.isGap ? "hsl(38 92% 50% / 0.3)" : "transparent"} stroke={entry.isGap ? "hsl(38 92% 50%)" : "transparent"} strokeWidth={entry.isGap ? 1 : 0} strokeDasharray={entry.isGap ? "4 2" : "0"} />)}
              </Bar>
              {/* Render segment bars - each segment uses its own sentiment color */}
              {Array.from({
              length: MAX_SEGMENTS
            }).map((_, idx) => <Bar key={`segment${idx}`} xAxisId="bar" yAxisId="left" dataKey={`segment${idx}`} data={chartDataWithPrice} stackId="narratives" radius={idx === MAX_SEGMENTS - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]} isAnimationActive={false}>
                  {chartDataWithPrice.map((entry, entryIdx) => <Cell key={`cell-${entryIdx}`} fill={entry.isGap ? "transparent" : SENTIMENT_COLORS[entry[`segment${idx}Sentiment`] as keyof typeof SENTIMENT_COLORS] || SENTIMENT_COLORS.neutral} fillOpacity={0.25} />)}
                </Bar>)}
              {/* Hourly Price Line Overlay */}
              {showPriceOverlay && priceLineData.length > 0 && <Line xAxisId="price" yAxisId="right" type="monotone" dataKey="price" stroke={priceLineColor} strokeWidth={2} dot={false} activeDot={false} connectNulls={true} />}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Mobile Side Panel - Only on mobile */}
      {isMobileDevice && <motion.div initial={{
      opacity: 0,
      y: 20
    }} animate={{
      opacity: 1,
      y: 0
    }} transition={{
      duration: 0.3,
      ease: "easeOut"
    }}>
          <NarrativeSidePanel data={panelData} priceColor={priceLineColor} isHovering={hoveredData !== null} isMobile={true} />
        </motion.div>}
    </div>;
}

// Hourly stacked bar chart for 1D/24H - Independent hourly view with live AI fallback
function HourlyStackedNarrativeChart({
  symbol,
  timeRange
}: {
  symbol: string;
  timeRange: "1D" | "24H";
}) {
  const [showPriceOverlay, setShowPriceOverlay] = useState(true);
  const [activeHour, setActiveHour] = useState<number | null>(null);
  const [marketSession, setMarketSession] = useState<MarketSession>("regular");
  const [hoveredData, setHoveredData] = useState<SidePanelData | null>(null);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const isMobileDevice = useIsMobile();

  // Get session-specific hour range
  const {
    startHour: START_HOUR,
    endHour: END_HOUR
  } = SESSION_RANGES[marketSession];
  const VISIBLE_HOURS = END_HOUR - START_HOUR + 1;
  const SLOTS_PER_HOUR = 12;

  // Calculate proper day boundaries in user's local timezone
  // On weekends or before market open, show the most recent trading day
  const {
    todayStart,
    todayEnd,
    twentyFourHoursAgo,
    now,
    displayDate
  } = useMemo(() => {
    const now = new Date();
    const currentHour = now.getHours();
    const dayOfWeek = now.getDay(); // 0 = Sunday, 6 = Saturday

    // Determine if we should show the previous trading day:
    // 1. It's a weekend (Saturday or Sunday)
    // 2. It's before market open (before START_HOUR, typically 8am or 5am)
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const isBeforeMarketOpen = currentHour < START_HOUR;
    const showPreviousTradingDay = isWeekend || isBeforeMarketOpen;
    let targetDate = new Date(now);
    if (showPreviousTradingDay) {
      // Go back to the most recent trading day
      if (isWeekend) {
        // Saturday: go back 1 day to Friday
        // Sunday: go back 2 days to Friday
        const daysToSubtract = dayOfWeek === 6 ? 1 : 2;
        targetDate = new Date(now.getTime() - daysToSubtract * 24 * 60 * 60 * 1000);
      } else if (isBeforeMarketOpen) {
        // Before market open on a weekday - check if yesterday was a trading day
        targetDate = new Date(now.getTime() - 24 * 60 * 60 * 1000); // Go back 1 day
        const yesterdayDayOfWeek = targetDate.getDay();

        // If yesterday was Sunday, go back to Friday
        if (yesterdayDayOfWeek === 0) {
          targetDate = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
        }
        // If yesterday was Saturday, go back to Friday
        else if (yesterdayDayOfWeek === 6) {
          targetDate = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
        }
      }
    }

    // Set day boundaries based on target date
    const todayStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 0, 0, 0, 0);
    const todayEnd = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 23, 59, 59, 999);
    // 24H: rolling 24 hours (always from current time)
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    return {
      todayStart,
      todayEnd,
      twentyFourHoursAgo,
      now,
      displayDate: targetDate
    };
  }, [START_HOUR]);

  // Fetch 3 days of data to ensure we capture the full local day regardless of timezone
  // (e.g., UTC-12 to UTC+14 covers ~26 hour spread from UTC midnight)
  const {
    data: historyData,
    isLoading: historyLoading,
    error,
    refetch,
    isFetching
  } = useNarrativeHistory(symbol, 3, "hourly");

  // Fetch stock price data
  const {
    data: priceData,
    isLoading: priceLoading
  } = useStockPrice(symbol, timeRange, showPriceOverlay);

  // Fetch actual hourly volume from StockTwits analytics API
  // This provides the REAL message count per hour (not the AI sample size)
  // For 1D view, pass the target date boundaries to fetch volume for that specific day
  const volumeStartDate = timeRange === "1D" ? todayStart.toISOString() : undefined;
  const volumeEndDate = timeRange === "1D" ? todayEnd.toISOString() : undefined;
  const {
    data: volumeData
  } = useVolumeAnalytics(symbol, timeRange, volumeStartDate, volumeEndDate);

  // Fetch actual volume history from database for past days
  // The volume_history table stores hourly_distribution with real message counts
  const targetDateStr = displayDate.toISOString().split('T')[0];
  const {
    data: volumeHistoryData
  } = useQuery({
    queryKey: ['volume-history-hourly', symbol, targetDateStr],
    queryFn: async () => {
      // Get the latest volume_history record for the target date
      const startOfDay = new Date(displayDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(displayDate);
      endOfDay.setHours(23, 59, 59, 999);
      const {
        data,
        error
      } = await supabase.from('volume_history').select('hourly_distribution, daily_volume, recorded_at').eq('symbol', symbol).gte('recorded_at', startOfDay.toISOString()).lte('recorded_at', endOfDay.toISOString()).order('recorded_at', {
        ascending: false
      }).limit(1).maybeSingle();
      if (error) {
        console.error('Failed to fetch volume history:', error);
        return null;
      }
      return data;
    },
    enabled: !!symbol && timeRange === "1D",
    staleTime: 60000
  });

  // Determine price line color based on current price vs previous close
  // Used for UI elements like the toggle icon and side panel
  const priceLineColor = useMemo(() => {
    if (!priceData?.currentPrice || !priceData?.previousClose) {
      return PRICE_UP_COLOR; // Default to green
    }
    return priceData.currentPrice >= priceData.previousClose ? PRICE_UP_COLOR : PRICE_DOWN_COLOR;
  }, [priceData?.currentPrice, priceData?.previousClose]);

  // Calculate gradient stops for dynamic price line coloring
  // The line should be green above previousClose and red below it
  const priceGradientStops = useMemo(() => {
    if (!priceData?.prices || priceData.prices.length === 0 || priceData.previousClose == null) {
      return null;
    }
    const prices = priceData.prices.map(p => p.price);
    const previousClose = priceData.previousClose;

    // Check boundary conditions
    const allAbovePrevClose = prices.every(p => p >= previousClose);
    const allBelowPrevClose = prices.every(p => p <= previousClose);
    let minPrice: number;
    let maxPrice: number;
    if (allAbovePrevClose) {
      // Pin bottom to previousClose - this aligns reference line with chart bottom
      minPrice = previousClose;
      maxPrice = Math.max(...prices);
    } else if (allBelowPrevClose) {
      // Pin top to previousClose - this aligns reference line with chart top
      minPrice = Math.min(...prices);
      maxPrice = previousClose;
    } else {
      minPrice = Math.min(...prices, previousClose);
      maxPrice = Math.max(...prices, previousClose);
    }
    const range = maxPrice - minPrice;
    if (range === 0) return null;

    // Calculate where previousClose sits in the vertical range (0 = top, 1 = bottom)
    // SVG gradients go from top (0%) to bottom (100%)
    const previousClosePercent = (maxPrice - previousClose) / range * 100;
    return {
      previousClosePercent,
      hasDataAbove: prices.some(p => p > previousClose),
      hasDataBelow: prices.some(p => p < previousClose)
    };
  }, [priceData?.prices, priceData?.previousClose]);

  // Build a map of hour -> actual message volume
  // Prefer volume_history from database (has real hourly counts) over analytics API
  const hourlyVolumeMap = useMemo(() => {
    const map = new Map<number, number>();

    // First, try to use volume_history from database (most accurate)
    if (volumeHistoryData?.hourly_distribution && Array.isArray(volumeHistoryData.hourly_distribution)) {
      volumeHistoryData.hourly_distribution.forEach((item: any) => {
        // Parse hour from "HH:MM" format (e.g., "09:00", "14:00")
        const hourStr = item.hour || "";
        if (hourStr.includes(":")) {
          const hour = parseInt(hourStr.split(":")[0], 10);
          map.set(hour, item.count || 0);
        }
      });
      if (map.size > 0) return map;
    }

    // Fallback to analytics API data (only has current day data)
    if (volumeData && volumeData.length > 0) {
      volumeData.forEach((item: any) => {
        // Parse hour from time string - handles both "HH:MM" (e.g., "15:00") and "8am/12pm" formats
        const timeStr = item.time?.toLowerCase() || "";
        let hour = 0;

        // Handle "HH:MM" format (e.g., "15:00", "09:00") from StockTwits analytics API
        if (timeStr.includes(":")) {
          const parts = timeStr.split(":");
          hour = parseInt(parts[0], 10);
        }
        // Handle "8am", "12pm" format
        else if (timeStr.includes("am")) {
          const num = parseInt(timeStr.replace("am", ""));
          hour = num === 12 ? 0 : num; // 12am = 0
        } else if (timeStr.includes("pm")) {
          const num = parseInt(timeStr.replace("pm", ""));
          hour = num === 12 ? 12 : num + 12; // 12pm = 12, 1pm = 13, etc.
        }
        map.set(hour, item.volume || 0);
      });
    }
    return map;
  }, [volumeData, volumeHistoryData]);
  const {
    stackedChartData,
    totalMessages,
    hasAnyData,
    is5MinView
  } = useMemo(() => {
    // For "Today" view (1D), use 5-minute slots for granular price line
    // but only put bar data at hour boundaries
    if (timeRange === "1D") {
      const TOTAL_SLOTS = VISIBLE_HOURS * SLOTS_PER_HOUR;

      // First, collect hourly narrative data
      const hourlyNarratives: Map<number, {
        narratives: {
          name: string;
          count: number;
          sentiment: string;
        }[];
        hasNarrativeData: boolean;
      }> = new Map();

      // Initialize hours based on selected session
      for (let h = START_HOUR; h <= END_HOUR; h++) {
        hourlyNarratives.set(h, {
          narratives: [],
          hasNarrativeData: false
        });
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
            slot.hasNarrativeData = true;

            // Aggregate narratives for this hour
            if (point.narratives && Array.isArray(point.narratives)) {
              point.narratives.forEach((n: any) => {
                const existing = slot.narratives.find(x => x.name === n.name);
                if (existing) {
                  existing.count += n.count || 0;
                } else {
                  slot.narratives.push({
                    name: n.name,
                    count: n.count || 0,
                    sentiment: n.sentiment || "neutral"
                  });
                }
              });
            }
          }
        });
      }

      // Get actual hourly volumes from hourlyVolumeMap
      // This map now prefers volume_history (has real counts) over analytics API
      const hourlyVolumes: Map<number, number> = new Map();
      for (let h = START_HOUR; h <= END_HOUR; h++) {
        const volume = hourlyVolumeMap.get(h) || 0;
        hourlyVolumes.set(h, volume);
      }

      // Calculate total volume and max for scaling
      const volumeValues = Array.from(hourlyVolumes.values());
      const totalVolumeFromMap = volumeValues.reduce((sum, v) => sum + v, 0);
      const maxVolume = Math.max(...volumeValues, 1);

      // Determine the current hour for filtering out future hours
      // For "today" view showing current day: cap at current hour
      // For previous trading days (weekends/pre-market): show all hours up to END_HOUR
      const currentTime = new Date();
      const isShowingCurrentDay = displayDate.toDateString() === currentTime.toDateString();
      const currentHour = currentTime.getHours();

      // Build chart data slots
      const stackedChartData: Record<string, any>[] = [];
      for (let slotIdx = 0; slotIdx < TOTAL_SLOTS; slotIdx++) {
        const hour = START_HOUR + Math.floor(slotIdx / SLOTS_PER_HOUR);
        const isHourStart = slotIdx % SLOTS_PER_HOUR === 0;

        // Time label: show hour label at hour boundaries (e.g., "8am", "12pm")
        const hourLabel = hour === 0 ? "12am" : hour < 12 ? `${hour}am` : hour === 12 ? "12pm" : `${hour - 12}pm`;

        // Check if this hour is in the future (only applies when showing current day)
        const isFutureHour = isShowingCurrentDay && hour > currentHour;

        // Get the hour's narrative data (for tooltip on any slot within the hour)
        const hourNarr = hourlyNarratives.get(hour)!;
        const topNarratives = hourNarr.narratives.sort((a, b) => b.count - a.count).slice(0, MAX_SEGMENTS);

        // Get actual volume for this hour from hourlyVolumes (from volume_history or analytics API)
        // For future hours, always show 0 volume
        const hourlyVolume = isFutureHour ? 0 : hourlyVolumes.get(hour) || 0;

        // Calculate total sample count from narratives for proportional scaling
        const totalSampleCount = topNarratives.reduce((sum, n) => sum + n.count, 0);
        const flatData: Record<string, any> = {
          time: hourLabel,
          slotIndex: slotIdx,
          hourIndex: hour,
          isHourStart,
          // Use actual hourly volume for display
          totalMessages: hourlyVolume,
          volumePercent: hourlyVolume / maxVolume * 100,
          isEmpty: isFutureHour || !hourNarr.hasNarrativeData && hourlyVolume === 0,
          isFutureHour
        };

        // Add narrative segment data to ALL slots (for tooltip)
        // Scale segment heights proportionally to actual hourly volume
        // For future hours, clear all segment data to avoid showing misleading tooltips
        if (isFutureHour) {
          for (let i = 0; i < MAX_SEGMENTS; i++) {
            flatData[`segment${i}`] = 0;
            flatData[`segment${i}Name`] = "";
            flatData[`segment${i}Sentiment`] = "neutral";
            flatData[`segment${i}Count`] = 0;
          }
        } else {
          topNarratives.forEach((n, idx) => {
            flatData[`segment${idx}Name`] = n.name;
            flatData[`segment${idx}Sentiment`] = n.sentiment;

            // Scale segment values proportionally to actual hourly volume
            const proportion = totalSampleCount > 0 ? n.count / totalSampleCount : 0;
            const scaledValue = Math.round(proportion * hourlyVolume);

            // Only set segment VALUE at hour start for bar rendering
            flatData[`segment${idx}`] = isHourStart ? scaledValue : 0;
            flatData[`segment${idx}Count`] = n.count; // Store original count for tooltip
          });
          for (let i = topNarratives.length; i < MAX_SEGMENTS; i++) {
            flatData[`segment${i}`] = 0;
            flatData[`segment${i}Name`] = "";
            flatData[`segment${i}Sentiment`] = "neutral";
            flatData[`segment${i}Count`] = 0;
          }
        }
        stackedChartData.push(flatData);
      }

      // Add a closing slot for the final X-axis label (e.g., "3pm" for market close)
      const closingHour = END_HOUR + 1;
      const closingHourLabel = closingHour === 0 ? "12am" : closingHour < 12 ? `${closingHour}am` : closingHour === 12 ? "12pm" : `${closingHour - 12}pm`;
      const closingSlot: Record<string, any> = {
        time: closingHourLabel,
        slotIndex: TOTAL_SLOTS,
        hourIndex: closingHour,
        isHourStart: true,
        isClosingSlot: true,
        totalMessages: 0,
        volumePercent: 0,
        isEmpty: true,
        isFutureHour: true
      };
      // Zero out all segments for the closing slot
      for (let i = 0; i < MAX_SEGMENTS; i++) {
        closingSlot[`segment${i}`] = 0;
        closingSlot[`segment${i}Name`] = "";
        closingSlot[`segment${i}Sentiment`] = "neutral";
        closingSlot[`segment${i}Count`] = 0;
      }
      stackedChartData.push(closingSlot);
      const totalMessages = volumeValues.reduce((sum, v) => sum + v, 0);
      const hasAnyData = Array.from(hourlyNarratives.values()).some(h => h.hasNarrativeData);
      return {
        stackedChartData,
        totalMessages,
        hasAnyData,
        is5MinView: true
      };
    }

    // Original logic for 24H view
    if (!historyData?.data || historyData.data.length === 0) {
      return {
        stackedChartData: [],
        totalMessages: 0,
        hasAnyData: false,
        is5MinView: false
      };
    }
    const filteredData = historyData.data.filter(point => {
      const pointDate = new Date(point.recorded_at);
      return pointDate.getTime() >= twentyFourHoursAgo.getTime() && pointDate.getTime() <= now.getTime();
    });

    // Build a map of hourIndex -> actual volume from analytics API for 24H view
    // Note: For 24H rolling window, we use the same hourlyVolumeMap which has today's data
    const hourlyVolumes24H: Map<number, number> = new Map();
    for (let h = 0; h < 24; h++) {
      hourlyVolumes24H.set(h, hourlyVolumeMap.get(h) || 0);
    }

    // Group data by hour
    const byHour = new Map<string, {
      hour: string;
      sortKey: string;
      hourIndex: number;
      narratives: {
        name: string;
        count: number;
        sentiment: string;
      }[];
      totalMessages: number;
    }>();
    filteredData.forEach(point => {
      const date = new Date(point.recorded_at);
      const hourKey = date.toLocaleTimeString(undefined, {
        hour: "numeric",
        hour12: true
      });
      const sortKey = date.toISOString();
      const hourIndex = date.getHours();
      if (!byHour.has(sortKey)) {
        byHour.set(sortKey, {
          hour: hourKey,
          sortKey,
          hourIndex,
          narratives: [],
          // Initialize with actual volume from analytics API
          totalMessages: hourlyVolumes24H.get(hourIndex) || 0
        });
      }
      const entry = byHour.get(sortKey)!;
      // Don't accumulate message_count - we use actual volume from analytics API

      // Aggregate narratives for this hour
      if (point.narratives && Array.isArray(point.narratives)) {
        point.narratives.forEach((n: any) => {
          const existing = entry.narratives.find(x => x.name === n.name);
          if (existing) {
            existing.count += n.count || 0;
          } else {
            entry.narratives.push({
              name: n.name,
              count: n.count || 0,
              sentiment: n.sentiment || "neutral"
            });
          }
        });
      }
    });

    // Find max message count for relative volume calculation
    const hourEntries = Array.from(byHour.values());
    const maxMessages = Math.max(...hourEntries.map(h => h.totalMessages), 1);

    // Process each hour: sort by count and take top segments
    const stackedChartData = hourEntries.sort((a, b) => a.sortKey.localeCompare(b.sortKey)).map(hourData => {
      // Sort narratives by count descending and take top MAX_SEGMENTS
      const topNarratives = hourData.narratives.sort((a, b) => b.count - a.count).slice(0, MAX_SEGMENTS);

      // Calculate total sample count from narratives for proportional scaling
      const totalSampleCount = topNarratives.reduce((sum, n) => sum + n.count, 0);
      const actualVolume = hourData.totalMessages;

      // Build flattened data structure for Recharts
      const flatData: Record<string, any> = {
        hour: hourData.hour,
        sortKey: hourData.sortKey,
        hourIndex: hourData.hourIndex,
        totalMessages: hourData.totalMessages,
        volumePercent: hourData.totalMessages / maxMessages * 100
      };

      // Scale segment heights proportionally to actual volume
      topNarratives.forEach((n, idx) => {
        const proportion = totalSampleCount > 0 ? n.count / totalSampleCount : 0;
        const scaledValue = Math.round(proportion * actualVolume);
        flatData[`segment${idx}`] = scaledValue;
        flatData[`segment${idx}Name`] = n.name;
        flatData[`segment${idx}Sentiment`] = n.sentiment;
        flatData[`segment${idx}Count`] = n.count; // Store original count for reference
      });

      // Fill remaining segments with zeros
      for (let i = topNarratives.length; i < MAX_SEGMENTS; i++) {
        flatData[`segment${i}`] = 0;
        flatData[`segment${i}Name`] = "";
        flatData[`segment${i}Sentiment`] = "neutral";
      }
      return flatData;
    });

    // Compute total from actual volumes
    const totalMessages = hourEntries.reduce((sum, h) => sum + h.totalMessages, 0);
    return {
      stackedChartData,
      totalMessages,
      hasAnyData: stackedChartData.length > 0,
      is5MinView: false
    };
  }, [historyData, timeRange, todayStart, todayEnd, twentyFourHoursAgo, now, displayDate, START_HOUR, END_HOUR, VISIBLE_HOURS, SLOTS_PER_HOUR, hourlyVolumeMap]);

  // Merge price data into chart data
  const chartDataWithPrice = useMemo(() => {
    if (!showPriceOverlay || !priceData?.prices || priceData.prices.length === 0) {
      return stackedChartData;
    }
    const previousClose = priceData.previousClose ?? 0;

    // For 5-minute view (Today), use 5-minute slot alignment for granular price line
    if (is5MinView) {
      const priceBySlot = alignPricesToFiveMinSlots(priceData.prices, START_HOUR, END_HOUR);

      // Find the first slot that has actual price data to use for pre-market extension
      let firstPriceSlotIndex: number | null = null;
      let firstPrice: number | null = null;
      for (let i = 0; i < stackedChartData.length; i++) {
        const slotIndex = stackedChartData[i].slotIndex;
        const pricePoint = priceBySlot.get(slotIndex);
        if (pricePoint?.price !== undefined) {
          firstPriceSlotIndex = slotIndex;
          firstPrice = pricePoint.price;
          break;
        }
      }
      return stackedChartData.map(item => {
        const slotIndex = item.slotIndex;
        const pricePoint = priceBySlot.get(slotIndex);
        const price = pricePoint?.price ?? null;

        // For slots BEFORE the first real price data, extend backwards with reduced opacity
        // This handles the pre-market period (e.g., 8am-9:30am before market opens)
        const isPreMarketExtension = firstPriceSlotIndex !== null && firstPrice !== null && slotIndex < firstPriceSlotIndex && price === null;

        // Also include the first real price slot in the extension to create seamless overlap
        const isTransitionSlot = firstPriceSlotIndex !== null && firstPrice !== null && slotIndex === firstPriceSlotIndex;
        if (isPreMarketExtension) {
          // Use the first available price for the extension line
          return {
            ...item,
            price: null,
            // Keep main price null so it doesn't render
            priceExtension: firstPrice,
            // Separate data key for extension
            priceAbove: null,
            priceBelow: null,
            priceExtensionAbove: firstPrice! >= previousClose ? firstPrice : null,
            priceExtensionBelow: firstPrice! < previousClose ? firstPrice : null,
            previousClose,
            isPreMarketExtension: true
          };
        }

        // At the transition slot, include BOTH extension and regular price to overlap fills
        if (isTransitionSlot) {
          return {
            ...item,
            price,
            priceExtension: firstPrice,
            // Extension also has this value to overlap
            priceAbove: price! >= previousClose ? price : null,
            priceBelow: price! < previousClose ? price : null,
            priceExtensionAbove: firstPrice! >= previousClose ? firstPrice : null,
            priceExtensionBelow: firstPrice! < previousClose ? firstPrice : null,
            previousClose,
            isPreMarketExtension: false
          };
        }

        // When price is null (gaps in data), set area values to null so connectNulls bridges smoothly
        if (price === null) {
          return {
            ...item,
            price: null,
            priceExtension: null,
            priceAbove: null,
            priceBelow: null,
            priceExtensionAbove: null,
            priceExtensionBelow: null,
            previousClose,
            isPreMarketExtension: false
          };
        }
        return {
          ...item,
          price,
          priceExtension: null,
          // No extension for slots with real data
          // For area fills: both areas need the price value
          // priceAbove fills from previousClose UP to price (when price > previousClose)
          // priceBelow fills from previousClose DOWN to price (when price < previousClose)
          priceAbove: price >= previousClose ? price : null,
          priceBelow: price < previousClose ? price : null,
          priceExtensionAbove: null,
          priceExtensionBelow: null,
          previousClose,
          isPreMarketExtension: false
        };
      });
    }

    // Build hour-to-price map for other views
    const priceByHour = alignPricesToHourSlots(priceData.prices, timeRange);
    return stackedChartData.map(item => {
      const hourIndex = item.hourIndex;
      const pricePoint = priceByHour.get(hourIndex);
      const price = pricePoint?.price ?? null;
      if (price === null) {
        return {
          ...item,
          price: null,
          priceExtension: null,
          priceAbove: null,
          priceBelow: null,
          previousClose,
          isPreMarketExtension: false
        };
      }
      return {
        ...item,
        price,
        priceExtension: null,
        priceAbove: price >= previousClose ? price : null,
        priceBelow: price < previousClose ? price : null,
        previousClose,
        isPreMarketExtension: false
      };
    });
  }, [stackedChartData, priceData, showPriceOverlay, timeRange, is5MinView]);

  // Calculate bar domain for left Y-axis - absolute message counts, no normalization
  const barDomain = useMemo(() => {
    if (!chartDataWithPrice || chartDataWithPrice.length === 0) {
      return [0, "auto"];
    }
    // Calculate max stacked value for each data point (raw message counts)
    const maxStackedValue = Math.max(...chartDataWithPrice.map(item => {
      let sum = 0;
      for (let i = 0; i < MAX_SEGMENTS; i++) {
        sum += item[`segment${i}`] as number || 0;
      }
      return sum;
    }), 1);
    // Scale domain to make bars shorter - multiply by 1.8 (25% reduction from 1.35)
    // This leaves more vertical space for the price line overlay
    return [0, Math.ceil(maxStackedValue * 1.8)];
  }, [chartDataWithPrice]);

  // Calculate price domain for right Y-axis - tight padding to fill vertical space
  // When stock is only above/below previous close, pin the domain to align reference line with chart edge
  const priceDomain = useMemo(() => {
    if (!showPriceOverlay || !priceData?.prices || priceData.prices.length === 0) {
      return ["auto", "auto"];
    }
    const prices = priceData.prices.map(p => p.price);
    const previousClose = priceData.previousClose;
    let minPrice = Math.min(...prices);
    let maxPrice = Math.max(...prices);

    // Include previousClose in the domain so the reference line is always visible
    if (previousClose != null) {
      minPrice = Math.min(minPrice, previousClose);
      maxPrice = Math.max(maxPrice, previousClose);
    }
    const range = maxPrice - minPrice;
    // Use 1% padding for expanded vertical range, minimum $0.10 to handle flat prices
    const topPadding = Math.max(range * 0.01, 0.10);
    const bottomPadding = Math.max(range * 0.01, 0.10);
    // Round to nearest $0.10 for cleaner axis labels with tighter domain
    const roundTo = 0.10;

    // Check if all prices are above or equal to previousClose (stock only up)
    const allAbovePrevClose = previousClose != null && prices.every(p => p >= previousClose);
    // Check if all prices are below or equal to previousClose (stock only down)
    const allBelowPrevClose = previousClose != null && prices.every(p => p <= previousClose);
    if (allAbovePrevClose && previousClose != null) {
      // Pin the bottom of the domain to previousClose exactly
      // This aligns the reference line with the chart bottom, so fill covers all bars
      return [previousClose, Math.ceil((maxPrice + topPadding) / roundTo) * roundTo];
    }
    if (allBelowPrevClose && previousClose != null) {
      // Pin the top of the domain to previousClose exactly
      // This aligns the reference line with the chart top
      return [Math.floor((minPrice - bottomPadding) / roundTo) * roundTo, previousClose];
    }

    // Normal case: price crossed both sides of previous close
    return [Math.floor((minPrice - bottomPadding) / roundTo) * roundTo, Math.ceil((maxPrice + topPadding) / roundTo) * roundTo];
  }, [priceData, showPriceOverlay]);

  // Calculate the first price point for the pre-market extension line
  const firstPriceData = useMemo(() => {
    if (!showPriceOverlay || !priceData?.prices || priceData.prices.length === 0 || !is5MinView) {
      return null;
    }
    const priceBySlot = alignPricesToFiveMinSlots(priceData.prices, START_HOUR, END_HOUR);
    const previousClose = priceData.previousClose ?? 0;

    // Find the first slot index with actual price data
    for (let i = 0; i < stackedChartData.length; i++) {
      const slotIndex = stackedChartData[i].slotIndex;
      const pricePoint = priceBySlot.get(slotIndex);
      if (pricePoint?.price !== undefined) {
        return {
          price: pricePoint.price,
          color: pricePoint.price >= previousClose ? PRICE_UP_COLOR : PRICE_DOWN_COLOR,
          dataIndex: i // Track the index in chart data where price begins
        };
      }
    }
    return null;
  }, [priceData, showPriceOverlay, is5MinView, stackedChartData, START_HOUR, END_HOUR]);

  // Custom component to render horizontal line from Y-axis to first price point
  const FirstPriceExtensionLine = useCallback(({
    yAxisMap,
    xAxisMap
  }: any) => {
    if (!firstPriceData || !yAxisMap?.right || !xAxisMap) return null;
    const yAxis = yAxisMap.right;
    const xAxis = Object.values(xAxisMap)[0] as any;
    if (!yAxis || !xAxis) return null;

    // Calculate y position from price
    const yScale = yAxis.scale;
    const y = yScale ? yScale(firstPriceData.price) : null;
    if (y === null || y === undefined) return null;

    // Calculate x position - from axis start to the center of the first data point bar
    const xStart = xAxis.x; // Left edge of chart area
    const barWidth = xAxis.width / stackedChartData.length;
    // End at the center of the bar where the price point sits
    const xEnd = xAxis.x + barWidth * firstPriceData.dataIndex + barWidth / 2;
    return <line x1={xStart} y1={y} x2={xEnd} y2={y} stroke={firstPriceData.color} strokeOpacity={0.5} strokeWidth={2} strokeLinecap="round" />;
  }, [firstPriceData, stackedChartData.length]);

  // Custom crosshair line that we can control via activeIndex - includes dot on price line
  // Track whether the user is actively hovering over the chart
  const isHoveringChart = hoveredData !== null;
  const CrosshairLine = useCallback(({
    offset,
    xAxisMap,
    yAxisMap
  }: any) => {
    // Only show crosshair when hovering over the chart
    if (!isHoveringChart || activeIndex === null || activeIndex === undefined) return null;
    const xAxis = xAxisMap ? Object.values(xAxisMap)[0] as any : null;
    if (!xAxis || !offset || !chartDataWithPrice.length) return null;
    const barWidth = xAxis.width / chartDataWithPrice.length;
    const clampedIndex = Math.max(0, Math.min(activeIndex, chartDataWithPrice.length - 1));
    const x = xAxis.x + barWidth * clampedIndex + barWidth / 2;
    const y1 = offset.top;
    const y2 = offset.top + offset.height;

    // Calculate the Y position for the dot on the price line
    let dotY: number | null = null;
    let dotColor = priceLineColor;
    if (showPriceOverlay && yAxisMap?.right) {
      const yAxis = yAxisMap.right;
      const yScale = yAxis.scale;
      const dataPoint = chartDataWithPrice[clampedIndex] as any;
      const price = dataPoint?.price;
      if (price !== null && price !== undefined && yScale) {
        dotY = yScale(price);
        // Determine dot color based on price vs previous close
        if (priceData?.previousClose) {
          dotColor = price >= priceData.previousClose ? PRICE_UP_COLOR : PRICE_DOWN_COLOR;
        }
      }
    }
    return <g style={{
      opacity: 1,
      transition: 'opacity 0.2s ease-out'
    }}>
        <line x1={x} y1={y1} x2={x} y2={y2} stroke="hsl(var(--muted-foreground))" strokeWidth={1} strokeOpacity={0.5} style={{
        transition: 'x1 0.05s ease-out, x2 0.05s ease-out'
      }} />
        {/* Dot on the price line */}
        {dotY !== null && <circle cx={x} cy={dotY} r={5} fill={dotColor} style={{
        transition: 'cx 0.05s ease-out, cy 0.05s ease-out, fill 0.15s ease-out'
      }} />}
      </g>;
  }, [activeIndex, chartDataWithPrice, showPriceOverlay, priceLineColor, priceData?.previousClose, isHoveringChart]);

  // Derive panel data (hovered or most recent with data)
  const panelData = useMemo((): SidePanelData | null => {
    if (hoveredData) {
      return hoveredData;
    }

    // Find most recent data point with messages (prioritize non-empty points)
    let mostRecent = chartDataWithPrice.slice().reverse().find(item => (item as any).totalMessages > 0 && !(item as any).isEmpty);

    // If no non-empty points, fall back to the last data point (most recent time slot)
    if (!mostRecent && chartDataWithPrice.length > 0) {
      mostRecent = chartDataWithPrice[chartDataWithPrice.length - 1];
    }
    if (!mostRecent) return null;
    const mr = mostRecent as Record<string, any>;
    return {
      label: mr.time || mr.hour || "",
      totalMessages: mr.totalMessages || 0,
      price: mr.price ?? null,
      volumePercent: mr.volumePercent || 0,
      segments: extractSegmentsFromDataPoint(mr),
      isEmpty: mr.isEmpty
    };
  }, [hoveredData, chartDataWithPrice]);

  // Initialize activeIndex to the last data point with price when data loads
  const hasInitializedRef = useRef(false);
  useEffect(() => {
    if (chartDataWithPrice.length > 0 && !hasInitializedRef.current) {
      // Find the last data point with price data (the rightmost point on the price line)
      let lastPriceIndex = chartDataWithPrice.length - 1;
      for (let i = chartDataWithPrice.length - 1; i >= 0; i--) {
        if ((chartDataWithPrice[i] as any).price !== null && (chartDataWithPrice[i] as any).price !== undefined) {
          lastPriceIndex = i;
          break;
        }
      }
      setActiveIndex(lastPriceIndex);
      hasInitializedRef.current = true;
    }
  }, [chartDataWithPrice]);

  // Track previous hour for haptic feedback
  const prevHourRef = useRef<number | null>(null);

  // Handle chart mouse events for side panel
  const handleChartMouseMove = useCallback((state: any) => {
    if (state?.activePayload?.[0]?.payload) {
      const payload = state.activePayload[0].payload;

      // Update active index for crosshair positioning
      if (state.activeTooltipIndex !== undefined) {
        setActiveIndex(state.activeTooltipIndex);
      }

      // Update active hour for bar highlighting
      if (payload.hourIndex !== undefined) {
        // Trigger haptic feedback when hour changes on mobile
        if (isMobileDevice && prevHourRef.current !== payload.hourIndex) {
          triggerHaptic('selection');
        }
        prevHourRef.current = payload.hourIndex;
        setActiveHour(payload.hourIndex);
      }

      // Update side panel data
      setHoveredData({
        label: payload.time || payload.hour,
        totalMessages: payload.totalMessages || 0,
        price: payload.price ?? null,
        volumePercent: payload.volumePercent || 0,
        segments: extractSegmentsFromDataPoint(payload),
        isEmpty: payload.isEmpty
      });
    }
  }, [isMobileDevice]);
  // Calculate the last price point index for crosshair default position
  const lastPricePointIndex = useMemo(() => {
    if (chartDataWithPrice.length === 0) return null;
    for (let i = chartDataWithPrice.length - 1; i >= 0; i--) {
      if ((chartDataWithPrice[i] as any).price !== null && (chartDataWithPrice[i] as any).price !== undefined) {
        return i;
      }
    }
    return chartDataWithPrice.length - 1;
  }, [chartDataWithPrice]);
  const handleChartMouseLeave = useCallback(() => {
    setActiveHour(null);
    setHoveredData(null);
    // Reset to last data point with price when cursor leaves
    if (lastPricePointIndex !== null) {
      setActiveIndex(lastPricePointIndex);
    }
  }, [lastPricePointIndex]);

  // Determine if we should fall back to live AI analysis
  // For "Today" view, always show the 24-hour skeleton even with no data
  // For "24H" view, fall back to live AI if no data
  const shouldFallbackToLive = !historyLoading && timeRange === "24H" && !hasAnyData;

  // If no hourly data exists for 24H view, fall back to live AI analysis (same as 1H/6H views)
  if (shouldFallbackToLive) {
    return <HorizontalNarrativeChart symbol={symbol} timeRange={timeRange} />;
  }
  if (historyLoading) {
    return <AIAnalysisLoader symbol={symbol} analysisType="narratives" />;
  }
  if (error) {
    return <div className="h-[480px] w-full flex flex-col items-center justify-center gap-4 text-muted-foreground">
        <AlertCircle className="h-8 w-8 text-destructive" />
        <p className="text-sm">Failed to load narrative history. Please try again.</p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>;
  }
  return <div className="w-full overflow-x-clip">
      {/* Main chart area with fixed height - wider on mobile via negative margins */}
      {/*  <div className="h-[380px] md:h-[520px] -mx-4 px-0 md:mx-0 md:px-0">   */}
      <div className="w-full overflow-x-clip">
        <div className="
      min-h-[320px] h-auto
w-[120vw]
-ml-[8vw] -mr-[12vw]
      md:w-full md:mx-0
    ">
          {/* Header - Collapsible */}
          <Collapsible defaultOpen={false} className="mb-2">
            <CollapsibleTrigger asChild>
              <div className="flex items-center justify-end p-1 cursor-pointer rounded transition-colors bg-[#292929]/0 py-0">
                <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform [[data-state=open]>&]:rotate-180" />
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2">
              <div className="flex items-center justify-between p-3 rounded-xl bg-white/60 dark:bg-[hsl(0_0%_15%/0.55)] backdrop-blur-[20px] backdrop-saturate-[140%] border border-black/[0.08] dark:border-white/[0.08] shadow-[0_2px_8px_rgba(0,0,0,0.04)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.2)]">
                <div className="flex items-center gap-3">
                  <div className="p-1.5 rounded-lg bg-primary/10">
                    <TrendingUp className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">Hourly Narrative Breakdown</span>
                      <span className="px-2 py-0.5 rounded-full bg-white/50 dark:bg-white/[0.08] backdrop-blur-sm border border-black/[0.06] dark:border-white/[0.08] text-primary text-xs">independent</span>
                      <span className="px-2 py-0.5 rounded-full bg-white/50 dark:bg-white/[0.08] backdrop-blur-sm border border-black/[0.06] dark:border-white/[0.08] text-muted-foreground text-xs">
                        {historyData?.data.length || 0} snapshots
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                      {totalMessages > 0 && <span className="flex items-center gap-1">
                          <span className="font-semibold text-primary">{totalMessages.toLocaleString()}</span> total
                          messages
                        </span>}
                      <span>
                        {timeRange === "1D" ? "Today" : "Last 24h"} • each bar shows that hour's top narratives
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {timeRange === "1D" && <MarketSessionSelector session={marketSession} onSessionChange={setMarketSession} />}
                  <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-full bg-white/50 dark:bg-white/[0.06] backdrop-blur-sm border border-black/[0.06] dark:border-white/[0.08]">
                    <DollarSign className="h-4 w-4" style={{
                    color: showPriceOverlay ? priceLineColor : "hsl(var(--muted-foreground))"
                  }} />
                    <span className="text-xs text-muted-foreground">Price</span>
                    <Switch checked={showPriceOverlay} onCheckedChange={setShowPriceOverlay} style={{
                    backgroundColor: showPriceOverlay ? priceLineColor : undefined
                  }} />
                  </div>
                  <Button variant="glass-pill" size="sm" onClick={() => refetch()} disabled={isFetching} className="h-8 px-3 text-xs">
                    <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isFetching ? "animate-spin" : ""}`} />
                    {isFetching ? "Refreshing..." : "Refresh"}
                  </Button>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Main content: Side Panel + Chart */}
          <div className="flex md:gap-4 h-[320px] md:h-[420px]">
            {/* Left Side Panel - Only on desktop */}
            {!isMobileDevice && <NarrativeSidePanel data={panelData} priceColor={priceLineColor} isHovering={hoveredData !== null} />}

            {/* Chart - Takes remaining space */}
            <div className="flex-1 min-w-0 pl-[27px] pr-[10px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartDataWithPrice} margin={{
                top: 10,
                right: showPriceOverlay ? 50 : 15,
                left: 5,
                bottom: 10
              }} barCategoryGap={0} barGap={0} onMouseMove={handleChartMouseMove} onMouseLeave={handleChartMouseLeave}>
                  {/* SVG Defs for gradient fills */}
                  <defs>
                    {/* Solid fill above previous close - consistent 0.09 opacity (reduced 40%), clipped at baseline */}
                    <linearGradient id="priceAboveGradient" x1="0" y1="0" x2="0" y2="1">
                      {priceGradientStops ? <>
                          <stop offset="0%" stopColor={PRICE_UP_COLOR} stopOpacity={0.09} />
                          <stop offset={`${priceGradientStops.previousClosePercent}%`} stopColor={PRICE_UP_COLOR} stopOpacity={0.09} />
                          <stop offset={`${priceGradientStops.previousClosePercent}%`} stopColor="transparent" stopOpacity={0} />
                          <stop offset="100%" stopColor="transparent" stopOpacity={0} />
                        </> : <stop offset="0%" stopColor={PRICE_UP_COLOR} stopOpacity={0.09} />}
                    </linearGradient>
                    {/* Solid fill below previous close - consistent 0.09 opacity (reduced 40%), clipped at baseline */}
                    <linearGradient id="priceBelowGradient" x1="0" y1="0" x2="0" y2="1">
                      {priceGradientStops ? <>
                          <stop offset="0%" stopColor="transparent" stopOpacity={0} />
                          <stop offset={`${priceGradientStops.previousClosePercent}%`} stopColor="transparent" stopOpacity={0} />
                          <stop offset={`${priceGradientStops.previousClosePercent}%`} stopColor={PRICE_DOWN_COLOR} stopOpacity={0.09} />
                          <stop offset="100%" stopColor={PRICE_DOWN_COLOR} stopOpacity={0.09} />
                        </> : <stop offset="0%" stopColor={PRICE_DOWN_COLOR} stopOpacity={0.09} />}
                    </linearGradient>
                    {/* Dynamic gradient for price line - green above previous close, red below */}
                    <linearGradient id="priceLineGradient" x1="0" y1="0" x2="0" y2="1">
                      {priceGradientStops ? <>
                          <stop offset="0%" stopColor={PRICE_UP_COLOR} />
                          <stop offset={`${priceGradientStops.previousClosePercent}%`} stopColor={PRICE_UP_COLOR} />
                          <stop offset={`${priceGradientStops.previousClosePercent}%`} stopColor={PRICE_DOWN_COLOR} />
                          <stop offset="100%" stopColor={PRICE_DOWN_COLOR} />
                        </> : <stop offset="0%" stopColor={PRICE_UP_COLOR} />}
                    </linearGradient>
                    {/* Pre-market extension line gradient - 50% opacity */}
                    <linearGradient id="priceExtensionLineGradient" x1="0" y1="0" x2="0" y2="1">
                      {priceGradientStops ? <>
                          <stop offset="0%" stopColor={PRICE_UP_COLOR} stopOpacity={0.5} />
                          <stop offset={`${priceGradientStops.previousClosePercent}%`} stopColor={PRICE_UP_COLOR} stopOpacity={0.5} />
                          <stop offset={`${priceGradientStops.previousClosePercent}%`} stopColor={PRICE_DOWN_COLOR} stopOpacity={0.5} />
                          <stop offset="100%" stopColor={PRICE_DOWN_COLOR} stopOpacity={0.5} />
                        </> : <stop offset="0%" stopColor={PRICE_UP_COLOR} stopOpacity={0.5} />}
                    </linearGradient>
                    {/* Pre-market extension fill - single color based on opening price position */}
                    {firstPriceData && <linearGradient id="priceExtensionFillGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={firstPriceData.color} stopOpacity={0.09} />
                        <stop offset="100%" stopColor={firstPriceData.color} stopOpacity={0.09} />
                      </linearGradient>}
                  </defs>
                  <XAxis dataKey="time" stroke="hsl(215 20% 55%)" fontSize={11} tickLine={false} axisLine={false} interval={is5MinView ? 11 : 0} tick={({
                  x,
                  y,
                  payload
                }: {
                  x: number;
                  y: number;
                  payload: {
                    index: number;
                    value: string;
                  };
                }) => {
                  const isLastTick = payload.index === chartDataWithPrice.length - 1;
                  if (is5MinView) {
                    const item = chartDataWithPrice[payload.index] as Record<string, any> | undefined;
                    // Show tick if it's hour start OR if it's the final tick on desktop
                    if (!item?.isHourStart && !(isLastTick && !isMobileDevice)) return null;
                  }
                  // Hide first and last time label on mobile/tablet to prevent clipping
                  if (isMobileDevice && (payload.index === 0 || isLastTick)) return null;
                  return <text x={x} y={y + 12} textAnchor="middle" fill="#999999" fillOpacity={0.5} fontSize={11}>
                          {payload.value}
                        </text>;
                }} />
                  <YAxis yAxisId="left" hide={true} domain={barDomain as [number, number | string]} />
                  {showPriceOverlay && <YAxis yAxisId="right" hide={true} domain={priceDomain as [number, number]} />}
                  {/* Tooltip drives Recharts' activeTooltipIndex; we render our own crosshair for full control */}
                  <Tooltip content={() => null} cursor={false} defaultIndex={lastPricePointIndex ?? undefined} />
                  {/* Only render bars when data is ready - prevents placeholder bars during loading */}
                  {!historyLoading && hasAnyData && Array.from({
                  length: MAX_SEGMENTS
                }).map((_, idx) => <Bar key={`segment${idx}`} yAxisId="left" dataKey={`segment${idx}`} stackId="narratives" shape={(props: any) => <WideBarShape {...props} is5MinView={is5MinView} activeHour={activeHour} radius={idx === MAX_SEGMENTS - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]} />} activeBar={false}>
                      {chartDataWithPrice.map((entry, entryIdx) => <Cell key={`cell-${entryIdx}`} fill={SENTIMENT_COLORS[entry[`segment${idx}Sentiment`] as keyof typeof SENTIMENT_COLORS] || SENTIMENT_COLORS.neutral} />)}
                    </Bar>)}
                  {/* Single area fill between price line and previous close - gradient handles color transition */}
                  {showPriceOverlay && is5MinView && priceData?.previousClose && <>
                      {/* Pre-market extension area - single color based on opening price position */}
                      {firstPriceData && <Area yAxisId="right" type="monotone" dataKey="priceExtension" stroke="none" fill="url(#priceExtensionFillGradient)" baseValue={priceData.previousClose} connectNulls={false} isAnimationActive={false} dot={false} activeDot={false} />}
                      {/* Fill above previous close (green) - uses price data, gradient clips at baseline */}
                      <Area yAxisId="right" type="monotone" dataKey="price" stroke="none" fill="url(#priceAboveGradient)" baseValue={priceData.previousClose} connectNulls isAnimationActive={false} dot={false} activeDot={false} />
                      {/* Fill below previous close (red) - uses price data, gradient clips at baseline */}
                      <Area yAxisId="right" type="monotone" dataKey="price" stroke="none" fill="url(#priceBelowGradient)" baseValue={priceData.previousClose} connectNulls isAnimationActive={false} dot={false} activeDot={false} />
                    </>}
                  {/* Pre-market extension line - same opacity as main line for consistent appearance */}
                  {showPriceOverlay && is5MinView && <Line yAxisId="right" type="monotone" dataKey="priceExtension" stroke="url(#priceLineGradient)" strokeWidth={2} dot={false} activeDot={false} connectNulls={false} />}
                  {showPriceOverlay && <Line yAxisId="right" type="monotone" dataKey="price" stroke="url(#priceLineGradient)" strokeWidth={2} dot={false} activeDot={false} connectNulls />}
                  {showPriceOverlay && is5MinView && priceData?.previousClose && <ReferenceLine yAxisId="right" y={priceData.previousClose} stroke="hsl(215 20% 65% / 0.5)" strokeDasharray="2 3" strokeWidth={1} />}
                  {/* Horizontal line from Y-axis to first price point */}
                  {showPriceOverlay && is5MinView && firstPriceData && <Customized component={FirstPriceExtensionLine} />}
                  {/* Controlled crosshair line (moves with cursor; resets on mouse leave) */}
                  <Customized component={CrosshairLine} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>{" "}
        {/* wide mobile container */}
      </div>{" "}
      {/* overflow-x-clip */}
      {/* Mobile Side Panel - Only on mobile for Today view */}
      {is5MinView && isMobileDevice && <motion.div initial={{
      opacity: 0,
      y: 20
    }} animate={{
      opacity: 1,
      y: 0
    }} transition={{
      duration: 0.3,
      ease: "easeOut"
    }}>
          <NarrativeSidePanel data={panelData} priceColor={priceLineColor} isHovering={hoveredData !== null} isMobile={true} />
        </motion.div>}
    </div>;
}

// Horizontal bar chart for 1H/6H
function HorizontalNarrativeChart({
  symbol,
  timeRange
}: {
  symbol: string;
  timeRange: TimeRange;
}) {
  const {
    data,
    isLoading,
    error,
    forceRefresh,
    isFetching
  } = useNarrativeAnalysis(symbol, timeRange);
  const chartData = useMemo(() => {
    if (!data?.narratives || data.narratives.length === 0) {
      return [];
    }
    return data.narratives.map((narrative: Narrative, index: number) => ({
      ...narrative,
      fill: getSentimentColor(narrative.sentiment, index)
    }));
  }, [data]);
  if (isLoading) {
    return <ChartSkeleton variant="bar" showSidePanel={false} showControls={false} chartHeight="h-[480px]" />;
  }
  if (error) {
    return <div className="h-[480px] w-full flex flex-col items-center justify-center gap-4 text-muted-foreground">
        <AlertCircle className="h-8 w-8 text-destructive" />
        <p className="text-sm">Failed to analyze narratives. Please try again.</p>
        <Button variant="outline" size="sm" onClick={forceRefresh}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>;
  }
  if (chartData.length === 0) {
    return <div className="h-[480px] w-full flex flex-col items-center justify-center gap-4 text-muted-foreground">
        <Sparkles className="h-8 w-8" />
        <p className="text-sm">No narratives found for {symbol}. Try a different time range.</p>
      </div>;
  }
  return <div className="h-[480px] w-full">
      {/* Prominent metadata header */}
      <div className="flex items-center justify-between mb-4 p-3 rounded-lg bg-card/50 border border-border">
        <div className="flex items-center gap-3">
          <Sparkles className="h-5 w-5 text-primary" />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">AI Narrative Analysis</span>
              {data?.cached && <span className="px-2 py-0.5 rounded bg-muted text-muted-foreground text-xs">cached</span>}
              {data?.aggregated && <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-400 text-xs">
                  {data.snapshotCount} snapshots
                </span>}
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
              {data?.messageCount && data.messageCount > 0 && <span className="flex items-center gap-1">
                  <span className="font-semibold text-primary">{data.messageCount.toLocaleString()}</span> messages
                  analyzed
                </span>}
              {data?.timestamp && <span className="flex items-center gap-1">
                  Updated: {new Date(data.timestamp).toLocaleTimeString()}
                </span>}
            </div>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={forceRefresh} disabled={isFetching} className="h-8 px-3 text-xs">
          <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isFetching ? "animate-spin" : ""}`} />
          {isFetching ? "Refreshing..." : "Refresh"}
        </Button>
      </div>

      <ResponsiveContainer width="100%" height="90%">
        <BarChart data={chartData} layout="vertical" margin={{
        top: 10,
        right: 30,
        left: 20,
        bottom: 10
      }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(217 33% 17%)" horizontal={false} />
          <XAxis type="number" stroke="hsl(215 20% 55%)" fontSize={12} tickLine={false} axisLine={false} />
          <YAxis type="category" dataKey="name" stroke="hsl(215 20% 55%)" fontSize={11} tickLine={false} axisLine={false} width={220} tick={({
          x,
          y,
          payload
        }) => <g transform={`translate(${x},${y})`}>
                <text x={-5} y={0} dy={4} textAnchor="end" fill="hsl(210 40% 98%)" fontSize={11}>
                  {payload.value}
                </text>
              </g>} />
          <Tooltip contentStyle={{
          backgroundColor: "hsl(222 47% 8%)",
          border: "1px solid hsl(217 33% 17%)",
          borderRadius: "8px",
          boxShadow: "0 4px 24px -4px hsl(0 0% 0% / 0.3)"
        }} labelStyle={{
          color: "hsl(210 40% 98%)"
        }} formatter={(value: number, name: string, props: any) => [<div key="tooltip" className="flex flex-col gap-1">
                <span className="font-semibold">{value} mentions</span>
                <span className={`text-xs px-2 py-0.5 rounded border inline-block w-fit ${getSentimentBadge(props.payload.sentiment)}`}>
                  {props.payload.sentiment}
                </span>
              </div>, ""]} />
          <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={40}>
            {chartData.map((entry: any, index: number) => <Cell key={`cell-${index}`} fill={entry.fill} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>;
}
export function NarrativeChart({
  symbol,
  timeRange = "24H",
  enabled = true
}: NarrativeChartProps) {
  // Don't render anything if not enabled (saves resources)
  if (!enabled) {
    return null;
  }

  // Use time series stacked bar chart for 7D and 30D
  if (timeRange === "7D" || timeRange === "30D") {
    return <TimeSeriesNarrativeChart symbol={symbol} timeRange={timeRange} />;
  }

  // Use hourly stacked bar chart for 1D and 24H
  if (timeRange === "1D" || timeRange === "24H") {
    return <HourlyStackedNarrativeChart symbol={symbol} timeRange={timeRange} />;
  }

  // Use horizontal bar chart for 1H/6H
  return <HorizontalNarrativeChart symbol={symbol} timeRange={timeRange} />;
}