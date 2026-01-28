import { 
  ComposedChart,
  BarChart,
  Bar,
  Line,
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
  Rectangle,
  ReferenceLine
} from "recharts";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import { motion } from "framer-motion";
import { useMemo, useState, useCallback, useRef, useEffect } from "react";
import { triggerHaptic } from "@/lib/haptics";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { useEmotionAnalysis, EmotionScore } from "@/hooks/use-emotion-analysis";
import { useEmotionHistory } from "@/hooks/use-emotion-history";
import { useStockPrice, TimeRange as StockTimeRange } from "@/hooks/use-stock-price";
import { alignPricesToFiveMinSlots, PricePoint } from "@/lib/stock-price-api";
import { AlertCircle, RefreshCw, Sparkles, DollarSign, Brain, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { AIAnalysisLoader } from "@/components/AIAnalysisLoader";
import { MarketSessionSelector, MarketSession, SESSION_RANGES } from "./MarketSessionSelector";

type TimeRange = '1H' | '6H' | '1D' | '24H' | '7D' | '30D';

// Stock price line colors
const PRICE_UP_COLOR = "#00C805";
const PRICE_DOWN_COLOR = "#FF6A26";

interface EmotionChartProps {
  symbol: string;
  timeRange?: TimeRange;
  start?: string;
  end?: string;
}

// Default signal emotions to display
const DEFAULT_SIGNAL_EMOTIONS = ["Euphoria", "Regret", "Capitulation", "FOMO", "Greed"];

// Emotion colors - trading-specific psychology
const EMOTION_COLORS: Record<string, string> = {
  "Euphoria": "hsl(300 80% 60%)",      // Magenta - peak excitement
  "Regret": "hsl(220 60% 50%)",        // Muted blue - sadness
  "Capitulation": "hsl(0 50% 45%)",    // Dark red - surrender
  "FOMO": "hsl(25 95% 55%)",           // Orange - urgency
  "Greed": "hsl(50 100% 45%)",         // Gold - money/excess
  // Additional core emotions
  "Excitement": "hsl(168 84% 45%)",
  "Fear": "hsl(0 72% 51%)",
  "Hopefulness": "hsl(142 71% 45%)",
  "Frustration": "hsl(38 92% 50%)",
  "Conviction": "hsl(199 89% 48%)",
  "Disappointment": "hsl(280 65% 60%)",
  "Sarcasm": "hsl(330 81% 60%)",
  "Humor": "hsl(45 93% 47%)",
  "Grit": "hsl(262 83% 58%)",
  "Surprise": "hsl(173 80% 40%)",
};

// Custom tooltip for stacked emotion bars
function EmotionStackedTooltip({ active, payload, label, priceColor }: any) {
  if (!active || !payload || !payload.length) return null;

  const dataPoint = payload[0]?.payload;
  
  if (dataPoint?.isEmpty) {
    return (
      <div className="bg-card border border-border rounded-lg p-3 shadow-xl min-w-[180px]">
        <span className="font-semibold text-card-foreground">{label}</span>
        <p className="text-sm text-muted-foreground mt-1">No data available yet</p>
        {dataPoint.price != null && (
          <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border/50">
            <DollarSign className="h-3 w-3" style={{ color: priceColor || PRICE_UP_COLOR }} />
            <span className="font-semibold" style={{ color: priceColor || PRICE_UP_COLOR }}>${dataPoint.price.toFixed(2)}</span>
          </div>
        )}
      </div>
    );
  }

  const price = dataPoint?.price;
  const emotions = DEFAULT_SIGNAL_EMOTIONS.map(name => ({
    name,
    score: dataPoint?.[name] || 0,
    color: EMOTION_COLORS[name]
  })).filter(e => e.score > 0);

  return (
    <div className="bg-card border border-border rounded-lg p-3 shadow-xl min-w-[200px]">
      <div className="flex items-center justify-between mb-2">
        <span className="font-semibold text-card-foreground">{label}</span>
      </div>
      
      {price != null && (
        <div className="flex items-center gap-2 mb-3 pb-2 border-b border-border/50">
          <DollarSign className="h-4 w-4" style={{ color: priceColor || PRICE_UP_COLOR }} />
          <span className="font-bold text-lg" style={{ color: priceColor || PRICE_UP_COLOR }}>${price.toFixed(2)}</span>
        </div>
      )}
      
      {emotions.length > 0 && (
        <div className="space-y-1.5">
          {emotions.map((emotion, idx) => (
            <div key={idx} className="flex items-center gap-2 text-sm">
              <div 
                className="w-3 h-3 rounded-sm flex-shrink-0" 
                style={{ backgroundColor: emotion.color }}
              />
              <span className="text-card-foreground flex-1">{emotion.name}</span>
              <span className="text-muted-foreground font-medium">{emotion.score}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Types for side panel data
interface EmotionSidePanelData {
  label: string;
  totalScore: number;
  price?: number | null;
  intensityPercent: number;
  emotions: { name: string; score: number; color: string }[];
  isEmpty?: boolean;
}

// Persistent side panel component with liquid glass styling and animation
function EmotionSidePanel({ 
  data, 
  priceColor,
  isHovering,
  isMobile = false
}: { 
  data: EmotionSidePanelData | null;
  priceColor: string;
  isHovering: boolean;
  isMobile?: boolean;
}) {
  // Track data changes for animation key
  const animationKey = data?.label ?? 'empty';
  
  // Professional monochromatic card styling matching LensReadinessCard
  const baseClasses = "relative overflow-hidden rounded-2xl bg-card/60 dark:bg-card/40 border border-border/50 backdrop-blur-xl";
  const containerClasses = isMobile 
    ? `w-[calc(100%-10px)] mx-[5px] p-4 ${baseClasses}`
    : `w-[343px] flex-shrink-0 p-5 ${baseClasses}`;
  
  // Animation variants for entrance
  const panelVariants = {
    initial: { opacity: 0, y: 6 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -4 }
  };
  
  const transitionConfig = {
    duration: 0.35,
    ease: "easeOut" as const
  };

  if (!data) {
    return (
      <div className={cn(
        isMobile ? "w-[calc(100%-10px)] mx-[5px] p-4" : "w-[343px] flex-shrink-0 p-5",
        baseClasses, "flex items-center justify-center"
      )}>
        <p className={cn(isMobile ? "text-sm" : "text-base", "text-muted-foreground text-center")}>
          No data available
        </p>
      </div>
    );
  }

  // Handle empty slots
  if (data.isEmpty) {
    return (
      <motion.div 
        key={`empty-${animationKey}`}
        variants={panelVariants}
        initial="initial"
        animate="animate"
        transition={transitionConfig}
        className={containerClasses}
      >
        <span className={cn("font-semibold text-foreground tracking-tight", isMobile ? "text-base" : "text-lg")}>{data.label}</span>
        <p className={cn("text-muted-foreground", isMobile ? "text-sm mt-1" : "text-base mt-2")}>
          No data available yet
        </p>
        {data.price != null && (
          <div className={cn("flex items-center gap-2 border-t border-border/30", isMobile ? "mt-2 pt-2" : "mt-3 pt-3")}>
            <DollarSign className={cn(isMobile ? "h-4 w-4" : "h-5 w-5")} style={{ color: priceColor }} />
            <span className={cn("font-bold", isMobile ? "text-lg" : "text-xl")} style={{ color: priceColor }}>${data.price.toFixed(2)}</span>
          </div>
        )}
        {!isHovering && !isMobile && (
          <div className="mt-4 pt-3 border-t border-border/30">
            <span className="text-sm text-muted-foreground italic">
              Showing latest • Hover chart to explore
            </span>
          </div>
        )}
      </motion.div>
    );
  }
  
  return (
    <motion.div 
      key={animationKey}
      variants={panelVariants}
      initial="initial"
      animate="animate"
      transition={transitionConfig}
      className={containerClasses}
    >
      {/* Time Header */}
      <div className={cn("flex items-center justify-between", isMobile ? "mb-2" : "mb-3")}>
        <span className={cn(
          "font-semibold text-foreground tracking-tight",
          isMobile ? "text-base" : "text-lg"
        )}>{data.label}</span>
        {data.totalScore > 0 && (
          <div className={cn("flex items-center gap-1", isMobile ? "text-xs" : "text-sm gap-1.5")}>
            <Brain className={cn(isMobile ? "h-3 w-3" : "h-4 w-4", "text-primary")} />
            <span className="text-primary font-medium">{data.totalScore}</span>
          </div>
        )}
      </div>
      
      {/* Stock Price */}
      {data.price != null && (
        <div className={cn(
          "flex items-center gap-2 border-b border-border/30",
          isMobile ? "mb-3 pb-2" : "mb-4 pb-3"
        )}>
          <DollarSign className={cn(isMobile ? "h-4 w-4" : "h-5 w-5")} style={{ color: priceColor }} />
          <span className={cn("font-bold", isMobile ? "text-lg" : "text-xl")} style={{ color: priceColor }}>
            ${data.price.toFixed(2)}
          </span>
        </div>
      )}
      
      {/* Intensity Bar */}
      {data.intensityPercent > 0 && (
        <div className={isMobile ? "mb-3" : "mb-4"}>
          <div className={cn("flex items-center justify-between mb-1.5", isMobile ? "text-xs" : "text-sm")}>
            <span className="text-muted-foreground">Relative Intensity</span>
            <span className={cn(
              "font-medium",
              data.intensityPercent >= 80 ? "text-warning" : 
              data.intensityPercent >= 50 ? "text-primary" : "text-muted-foreground"
            )}>
              {data.intensityPercent.toFixed(0)}%
            </span>
          </div>
          <div className={cn("bg-muted/20 dark:bg-white/5 rounded-full overflow-hidden", isMobile ? "h-1.5" : "h-2")}>
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(data.intensityPercent, 100)}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className={cn(
                "h-full rounded-full",
                data.intensityPercent >= 80 ? "bg-warning" : 
                data.intensityPercent >= 50 ? "bg-primary" : "bg-muted-foreground/50"
              )}
            />
          </div>
        </div>
      )}
      
      {/* Emotion Breakdown */}
      {data.emotions.length > 0 && (
        <div className={cn("border-t border-border/30", isMobile ? "space-y-2 pt-3" : "space-y-3 pt-4")}>
          <div className={cn("text-muted-foreground", isMobile ? "text-xs mb-1" : "text-sm mb-2")}>Signal Emotions:</div>
          {data.emotions.map((emotion, idx) => (
            <motion.div 
              key={idx} 
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: idx * 0.05, ease: "easeOut" }}
              className={cn(
                "flex items-center",
                isMobile ? "gap-1.5 text-xs" : "gap-2.5 text-base"
              )}
            >
              <div 
                className={cn("rounded-sm flex-shrink-0", isMobile ? "w-2.5 h-2.5" : "w-3.5 h-3.5")} 
                style={{ backgroundColor: emotion.color }}
              />
              <span className={cn("text-foreground/80 dark:text-foreground/75 flex-1 truncate", isMobile ? "text-xs" : "text-sm")}>{emotion.name}</span>
              <span className={cn("text-muted-foreground font-medium tabular-nums", isMobile ? "text-xs" : "text-sm")}>{emotion.score}</span>
            </motion.div>
          ))}
        </div>
      )}
      
      {/* Default indicator - only on desktop */}
      {!isHovering && !isMobile && (
        <div className="mt-4 pt-3 border-t border-border/30">
          <span className="text-sm text-muted-foreground italic">
            Showing latest • Hover chart to explore
          </span>
        </div>
      )}
    </motion.div>
  );
}

// Custom bar shape that expands to fill hour width for 5-min view
// Uses liquid glass effect with stroke border and inner highlight
const WideBarShape = (props: any) => {
  const { x, y, width, height, fill, is5MinView, activeHour, radius } = props;
  
  // Glass effect styles
  const glassStyle = { 
    transition: 'fill-opacity 0.2s ease-out, stroke-opacity 0.2s ease-out',
    filter: 'saturate(1.05)'
  };
  
  if (!is5MinView || height <= 0) {
    // Non-5min view with glass effect
    if (height <= 0) return null;
    return (
      <g>
        <Rectangle 
          {...props} 
          fillOpacity={0.06}
          stroke={fill}
          strokeOpacity={0.15}
          strokeWidth={1}
          style={glassStyle}
        />
        {/* Inner glass highlight */}
        <Rectangle
          x={x + 1}
          y={y + 1}
          width={Math.max(0, width - 2)}
          height={Math.max(0, Math.min(height * 0.12, 5))}
          fill="white"
          fillOpacity={0.1}
          radius={radius ? [Math.max(0, radius[0] - 1), Math.max(0, radius[1] - 1), 0, 0] : undefined}
          style={{ pointerEvents: 'none' }}
        />
      </g>
    );
  }
  
  const hourWidth = width * 12; // 12 5-minute slots per hour
  const slotIndex = Math.floor(props.index % 12);
  const newX = x - (slotIndex * width);
  
  const hourIndex = Math.floor(props.index / 12);
  const isHovered = activeHour === hourIndex;
  const baseOpacity = 0.06;
  const hoverOpacity = 0.3;
  const opacity = isHovered ? hoverOpacity : baseOpacity;
  
  return (
    <g>
      <Rectangle
        x={newX}
        y={y}
        width={hourWidth}
        height={height}
        fill={fill}
        fillOpacity={opacity}
        stroke={fill}
        strokeOpacity={isHovered ? 0.4 : 0.15}
        strokeWidth={1}
        radius={radius}
        style={glassStyle}
      />
      {/* Inner glass highlight */}
      <Rectangle
        x={newX + 1}
        y={y + 1}
        width={Math.max(0, hourWidth - 2)}
        height={Math.max(0, Math.min(height * 0.12, 5))}
        fill="white"
        fillOpacity={0.1}
        radius={radius ? [Math.max(0, radius[0] - 1), Math.max(0, radius[1] - 1), 0, 0] : undefined}
        style={{ pointerEvents: 'none' }}
      />
    </g>
  );
};

export function EmotionChart({ symbol, timeRange = '24H' }: EmotionChartProps) {
  const [showPriceOverlay, setShowPriceOverlay] = useState(true);
  const [activeHour, setActiveHour] = useState<number | null>(null);
  const [marketSession, setMarketSession] = useState<MarketSession>("regular");
  const [hoveredData, setHoveredData] = useState<EmotionSidePanelData | null>(null);
  const isMobileDevice = useIsMobile();

  // Determine view type
  const is1DView = timeRange === '1D';
  const is24HView = timeRange === '24H';
  const is5MinView = is1DView;
  const showPriceToggle = is1DView || is24HView;

  // Fetch emotion history for hourly data
  const periodType = (is1DView || is24HView) ? "hourly" : "daily";
  const days = is1DView ? 1 : is24HView ? 1 : timeRange === '7D' ? 7 : 30;
  
  const { data: historyData, isLoading: historyLoading, refetch, isFetching } = useEmotionHistory(symbol, days, periodType);
  
  // Fallback to live AI analysis if no history
  const { data: liveData, isLoading: liveLoading, forceRefresh } = useEmotionAnalysis(symbol, timeRange);

  // Fetch stock price data for overlay - use 1D for 5-min data
  const priceTimeRange: StockTimeRange = is5MinView ? '1D' : '24H';
  const { data: priceData, isLoading: priceLoading } = useStockPrice(
    symbol,
    priceTimeRange,
    showPriceOverlay && showPriceToggle
  );

  // Determine price line color
  const priceLineColor = useMemo(() => {
    if (!priceData?.prices?.length || !priceData?.previousClose) return PRICE_UP_COLOR;
    const latestPrice = priceData.prices[priceData.prices.length - 1]?.price;
    return latestPrice >= priceData.previousClose ? PRICE_UP_COLOR : PRICE_DOWN_COLOR;
  }, [priceData]);

  // Get session time range
  const sessionRange = SESSION_RANGES[marketSession];

  // Build chart data for stacked bar view
  const chartDataWithPrice = useMemo(() => {
    if (!is1DView && !is24HView) return [];

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);

    // For 1D view, create 5-minute slots within session hours
    if (is5MinView) {
      const slots: any[] = [];
      const startHour = sessionRange.startHour;
      const endHour = sessionRange.endHour;

      for (let h = startHour; h < endHour; h++) {
        for (let m = 0; m < 60; m += 5) {
          const slotTime = new Date(todayStart.getFullYear(), todayStart.getMonth(), todayStart.getDate(), h, m);
          const hourLabel = h === 0 ? '12 AM' : h < 12 ? `${h} AM` : h === 12 ? '12 PM' : `${h - 12} PM`;
          
          const slot: any = {
            time: hourLabel,
            timestamp: slotTime.getTime(),
            hourIndex: h - startHour,
            slotIndex: (h - startHour) * 12 + Math.floor(m / 5),
            isHourStart: m === 0,
            isEmpty: true,
          };

          // Initialize emotion values
          DEFAULT_SIGNAL_EMOTIONS.forEach(emotion => {
            slot[emotion] = 0;
          });

          slots.push(slot);
        }
      }

      // Fill in emotion data from history
      if (historyData?.data) {
        const todayData = historyData.data.filter(point => {
          const pointDate = new Date(point.recorded_at);
          return pointDate.getTime() >= todayStart.getTime();
        });

        todayData.forEach(point => {
          const pointDate = new Date(point.recorded_at);
          const hour = pointDate.getHours();
          
          if (hour >= startHour && hour < endHour) {
            // Find all slots for this hour and fill them
            slots.forEach(slot => {
              const slotDate = new Date(slot.timestamp);
              if (slotDate.getHours() === hour) {
                slot.isEmpty = false;
                DEFAULT_SIGNAL_EMOTIONS.forEach(emotion => {
                  if (point.emotions[emotion]) {
                    slot[emotion] = point.emotions[emotion];
                  }
                });
              }
            });
          }
        });
      }

      // Align price data
      if (priceData?.prices && showPriceOverlay) {
        const alignedPrices = alignPricesToFiveMinSlots(priceData.prices, startHour, endHour);
        
        slots.forEach(slot => {
          const slotDate = new Date(slot.timestamp);
          const slotHour = slotDate.getHours();
          const slotMinute = slotDate.getMinutes();
          const slotIndex = (slotHour - startHour) * 12 + Math.floor(slotMinute / 5);
          
          const matchingPrice = alignedPrices.get(slotIndex);
          if (matchingPrice) {
            slot.price = matchingPrice.price;
          }
        });
      }

      return slots;
    }

    // For 24H view, create hourly slots
    const hourSlots: any[] = [];
    for (let h = 0; h < 24; h++) {
      const hourLabel = h === 0 ? '12 AM' : h < 12 ? `${h} AM` : h === 12 ? '12 PM' : `${h - 12} PM`;
      const slot: any = {
        time: hourLabel,
        hourIndex: h,
        isEmpty: true,
      };

      DEFAULT_SIGNAL_EMOTIONS.forEach(emotion => {
        slot[emotion] = 0;
      });

      hourSlots.push(slot);
    }

    // Fill from history data
    if (historyData?.data) {
      historyData.data.forEach(point => {
        const pointDate = new Date(point.recorded_at);
        const hour = pointDate.getHours();
        
        if (hourSlots[hour]) {
          hourSlots[hour].isEmpty = false;
          DEFAULT_SIGNAL_EMOTIONS.forEach(emotion => {
            if (point.emotions[emotion]) {
              hourSlots[hour][emotion] = point.emotions[emotion];
            }
          });
        }
      });
    }

    return hourSlots;
  }, [is1DView, is24HView, is5MinView, historyData, priceData, showPriceOverlay, sessionRange]);

  // Calculate bar domain
  const barDomain = useMemo(() => {
    if (chartDataWithPrice.length === 0) return [0, 100];
    
    let maxStackedValue = 0;
    chartDataWithPrice.forEach(slot => {
      let stackTotal = 0;
      DEFAULT_SIGNAL_EMOTIONS.forEach(emotion => {
        stackTotal += slot[emotion] || 0;
      });
      maxStackedValue = Math.max(maxStackedValue, stackTotal);
    });
    
    return [0, Math.max(maxStackedValue * 2, 100)];
  }, [chartDataWithPrice]);

  // Calculate price domain
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
    const padding = Math.max(range * 0.03, 0.25);
    const roundTo = 0.25;
    return [
      Math.floor((minPrice - padding) / roundTo) * roundTo,
      Math.ceil((maxPrice + padding) / roundTo) * roundTo
    ];
  }, [priceData, showPriceOverlay]);

  const isLoading = historyLoading || liveLoading;
  const hasData = chartDataWithPrice.some(d => !d.isEmpty) || (liveData?.emotions?.length ?? 0) > 0;

  // Calculate dominant emotion from current data
  const dominantEmotionData = useMemo(() => {
    if (!chartDataWithPrice.length) return null;
    
    const emotionTotals: Record<string, number> = {};
    let totalScore = 0;
    
    chartDataWithPrice.forEach(slot => {
      DEFAULT_SIGNAL_EMOTIONS.forEach(emotion => {
        const score = slot[emotion] || 0;
        emotionTotals[emotion] = (emotionTotals[emotion] || 0) + score;
        totalScore += score;
      });
    });
    
    if (totalScore === 0) return null;
    
    const sorted = Object.entries(emotionTotals)
      .filter(([_, score]) => score > 0)
      .sort((a, b) => b[1] - a[1]);
    
    if (sorted.length === 0) return null;
    
    const [dominantEmotion, dominantScore] = sorted[0];
    const intensity = Math.round((dominantScore / totalScore) * 100);
    
    return {
      emotion: dominantEmotion,
      score: Math.round(dominantScore),
      intensity,
      color: EMOTION_COLORS[dominantEmotion],
      topEmotions: sorted.slice(0, 3).map(([name, score]) => ({
        name,
        score: Math.round(score),
        color: EMOTION_COLORS[name]
      }))
    };
  }, [chartDataWithPrice]);

  // Calculate max stacked value for intensity percentage
  const maxStackedValue = useMemo(() => {
    let max = 0;
    chartDataWithPrice.forEach(slot => {
      let stackTotal = 0;
      DEFAULT_SIGNAL_EMOTIONS.forEach(emotion => {
        stackTotal += slot[emotion] || 0;
      });
      max = Math.max(max, stackTotal);
    });
    return max || 100;
  }, [chartDataWithPrice]);

  // Helper to extract emotions from a data point
  const extractEmotionsFromDataPoint = useCallback((dataPoint: Record<string, any>): { name: string; score: number; color: string }[] => {
    return DEFAULT_SIGNAL_EMOTIONS
      .map(name => ({
        name,
        score: dataPoint[name] || 0,
        color: EMOTION_COLORS[name]
      }))
      .filter(e => e.score > 0)
      .sort((a, b) => b.score - a.score);
  }, []);

  // Calculate panel data - show hovered data or default to latest
  const panelData: EmotionSidePanelData | null = useMemo(() => {
    if (hoveredData) return hoveredData;
    
    // Find latest data point with emotion data
    const latestWithData = [...chartDataWithPrice].reverse().find(d => !d.isEmpty);
    if (!latestWithData) {
      // Return empty state with latest slot info
      const latestSlot = chartDataWithPrice[chartDataWithPrice.length - 1];
      if (latestSlot) {
        return {
          label: latestSlot.time || 'Latest',
          totalScore: 0,
          price: latestSlot.price ?? null,
          intensityPercent: 0,
          emotions: [],
          isEmpty: true,
        };
      }
      return null;
    }
    
    const emotions = extractEmotionsFromDataPoint(latestWithData);
    const totalScore = emotions.reduce((sum, e) => sum + e.score, 0);
    const intensityPercent = maxStackedValue > 0 ? (totalScore / maxStackedValue) * 100 : 0;
    
    return {
      label: latestWithData.time || 'Latest',
      totalScore,
      price: latestWithData.price ?? null,
      intensityPercent,
      emotions,
    };
  }, [hoveredData, chartDataWithPrice, extractEmotionsFromDataPoint, maxStackedValue]);

  // Track previous data point for haptic feedback
  const prevDataPointRef = useRef<string | null>(null);

  // Chart mouse handlers
  const handleChartMouseMove = useCallback((state: any) => {
    if (!state.activePayload?.[0]?.payload) {
      return;
    }
    
    const payload = state.activePayload[0].payload;
    
    // Trigger haptic feedback when moving to a new data point on mobile
    const currentLabel = payload.time || payload.timestamp?.toString() || '';
    if (isMobileDevice && currentLabel !== prevDataPointRef.current) {
      triggerHaptic('selection');
      prevDataPointRef.current = currentLabel;
    }
    
    setActiveHour(payload.hourIndex);
    
    if (payload.isEmpty) {
      setHoveredData({
        label: payload.time || '',
        totalScore: 0,
        price: payload.price ?? null,
        intensityPercent: 0,
        emotions: [],
        isEmpty: true,
      });
      return;
    }
    
    const emotions = extractEmotionsFromDataPoint(payload);
    const totalScore = emotions.reduce((sum, e) => sum + e.score, 0);
    const intensityPercent = maxStackedValue > 0 ? (totalScore / maxStackedValue) * 100 : 0;
    
    setHoveredData({
      label: payload.time || '',
      totalScore,
      price: payload.price ?? null,
      intensityPercent,
      emotions,
    });
  }, [extractEmotionsFromDataPoint, maxStackedValue, isMobileDevice]);

  const handleChartMouseLeave = useCallback(() => {
    setHoveredData(null);
    setActiveHour(null);
    prevDataPointRef.current = null;
  }, []);

  if (isLoading) {
    return <AIAnalysisLoader symbol={symbol} analysisType="emotions" />;
  }

  // For non-today views or no data, show horizontal bar chart fallback
  if (!is1DView && !is24HView) {
    return <HorizontalEmotionChart symbol={symbol} timeRange={timeRange} />;
  }

  return (
    <div className="w-full">
      {/* Main chart area with fixed height */}
      <div className="h-[362px] md:h-[562px]">
        {/* Header - Collapsible */}
        <Collapsible defaultOpen={false}>
          <div className="flex items-center justify-end mb-1 md:mb-1.5">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 md:h-8 px-1.5 md:px-2 shrink-0 group">
                <ChevronDown className="h-4 w-4 transition-transform duration-200 group-data-[state=open]:rotate-180" />
              </Button>
            </CollapsibleTrigger>
          </div>

          {/* Collapsible content - contains all header details and controls */}
          <CollapsibleContent>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-3 md:mb-4 pb-3 border-b border-border/30">
              <div className="flex items-center gap-2 md:gap-3 flex-1">
                <div className="p-1.5 md:p-2 rounded-lg bg-primary/10 shrink-0">
                  <Brain className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-semibold text-sm md:text-base">Market Psychology</h4>
                    {historyData?.data && historyData.data.length > 0 && (
                      <span className="px-1.5 md:px-2 py-0.5 rounded bg-muted text-muted-foreground text-[10px] md:text-xs">
                        {historyData.data.length} snapshots
                      </span>
                    )}
                  </div>
                  <p className="text-xs md:text-sm text-muted-foreground">
                    Signal emotions: Euphoria, Regret, Capitulation, FOMO, Greed
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2 md:gap-3 overflow-x-auto scrollbar-hide">
                {is1DView && (
                  <MarketSessionSelector session={marketSession} onSessionChange={setMarketSession} />
                )}
                
                {showPriceToggle && (
                  <div className="flex items-center gap-1.5 md:gap-2 shrink-0">
                    <DollarSign className="h-3.5 w-3.5 md:h-4 md:w-4" style={{ color: showPriceOverlay ? priceLineColor : 'hsl(var(--muted-foreground))' }} />
                    <Switch
                      checked={showPriceOverlay}
                      onCheckedChange={setShowPriceOverlay}
                      className="data-[state=checked]:bg-primary"
                      style={showPriceOverlay ? { backgroundColor: priceLineColor } : undefined}
                    />
                  </div>
                )}
                
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => refetch()}
                  disabled={isFetching}
                  className="h-7 md:h-8 px-2 md:px-3 text-[10px] md:text-xs shrink-0"
                >
                  <RefreshCw className={`h-3 w-3 md:h-3.5 md:w-3.5 mr-1 md:mr-1.5 ${isFetching ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">Refresh</span>
                </Button>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 md:gap-3 mb-3 md:mb-4">
              {/* Dominant emotion indicator */}
              {dominantEmotionData && (
                <div className="flex items-center gap-2 md:gap-3 pr-3 md:pr-4 border-r border-border/50">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full animate-pulse" 
                      style={{ backgroundColor: dominantEmotionData.color }}
                    />
                    <span className="text-sm font-medium" style={{ color: dominantEmotionData.color }}>
                      {dominantEmotionData.emotion}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {dominantEmotionData.intensity}% dominant
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    {dominantEmotionData.topEmotions.slice(1).map((e, i) => (
                      <div 
                        key={e.name}
                        className="w-2 h-2 rounded-full opacity-60" 
                        style={{ backgroundColor: e.color }}
                        title={`${e.name}: ${e.score}`}
                      />
                    ))}
                  </div>
                </div>
              )}
              
              {/* Emotion legend badges */}
              {DEFAULT_SIGNAL_EMOTIONS.map(emotion => (
                <div key={emotion} className="flex items-center gap-1 px-1.5 md:px-2 py-0.5 md:py-1 rounded bg-card/50 border border-border text-[10px] md:text-xs">
                  <div className="w-2 h-2 md:w-2.5 md:h-2.5 rounded-sm" style={{ backgroundColor: EMOTION_COLORS[emotion] }} />
                  <span>{emotion}</span>
                </div>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Main content: Side Panel + Chart */}
        <div className="flex gap-4 h-[calc(100%-100px)]">
          {/* Left Side Panel - Only on desktop */}
          {!isMobileDevice && (
            <EmotionSidePanel 
              data={panelData} 
              priceColor={priceLineColor}
              isHovering={hoveredData !== null}
            />
          )}
          
          {/* Chart - Takes remaining space */}
          <div className="flex-1 min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={chartDataWithPrice}
                margin={{ top: 10, right: 10, left: 0, bottom: 10 }}
                barCategoryGap={is5MinView ? 0 : "10%"}
                barGap={0}
                onMouseMove={handleChartMouseMove}
                onMouseLeave={handleChartMouseLeave}
              >
                {/* CartesianGrid hidden for cleaner look */}
                <XAxis 
                  dataKey="time"
                  stroke="hsl(215 20% 55%)" 
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  interval={is5MinView ? 11 : 0}
                  tick={({ x, y, payload }: { x: number; y: number; payload: { index: number; value: string } }) => {
                    if (is5MinView) {
                      const item = chartDataWithPrice[payload.index] as any;
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
                  domain={barDomain as [number, number]}
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
                {/* Tooltip disabled - side panel handles data display on all screen sizes */}
                {!isMobileDevice && (
                  <Tooltip 
                    content={() => null}
                  />
                )}
                
                {/* Stacked emotion bars */}
                {DEFAULT_SIGNAL_EMOTIONS.map((emotion, idx) => (
                  <Bar 
                    key={emotion}
                    yAxisId="left"
                    dataKey={emotion}
                    stackId="emotions"
                    fill={EMOTION_COLORS[emotion]}
                    shape={(props: any) => (
                      <WideBarShape 
                        {...props} 
                        is5MinView={is5MinView}
                        activeHour={activeHour}
                        radius={idx === DEFAULT_SIGNAL_EMOTIONS.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                      />
                    )}
                    activeBar={false}
                  />
                ))}
                
                {/* Price Line Overlay */}
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
                
                {/* Previous Close Reference Line */}
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
      
      {/* Mobile Side Panel - Only on mobile for Today view */}
      {is1DView && isMobileDevice && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        >
          <EmotionSidePanel 
            data={panelData} 
            priceColor={priceLineColor}
            isHovering={hoveredData !== null}
            isMobile={true}
          />
        </motion.div>
      )}
    </div>
  );
}

// Horizontal bar chart for 1H/6H/7D/30D views
function HorizontalEmotionChart({ symbol, timeRange }: { symbol: string; timeRange: TimeRange }) {
  const { data, isLoading, error, forceRefresh, isFetching } = useEmotionAnalysis(symbol, timeRange);
  
  const chartData = useMemo(() => {
    if (!data?.emotions || data.emotions.length === 0) return [];
    
    // Filter to show signal emotions first, then others
    const signalEmotions = data.emotions.filter((e: EmotionScore) => 
      DEFAULT_SIGNAL_EMOTIONS.includes(e.name)
    );
    const otherEmotions = data.emotions.filter((e: EmotionScore) => 
      !DEFAULT_SIGNAL_EMOTIONS.includes(e.name)
    );
    
    return [...signalEmotions, ...otherEmotions]
      .map((emotion: EmotionScore) => ({
        ...emotion,
        fill: EMOTION_COLORS[emotion.name] || "hsl(215 20% 55%)",
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
  }, [data]);

  if (isLoading) {
    return <AIAnalysisLoader symbol={symbol} analysisType="emotions" />;
  }

  if (error) {
    return (
      <div className="h-[400px] w-full flex flex-col items-center justify-center gap-4 text-muted-foreground">
        <AlertCircle className="h-8 w-8 text-destructive" />
        <p className="text-sm">Failed to analyze emotions. Please try again.</p>
      </div>
    );
  }

  if (chartData.length === 0) {
    return (
      <div className="h-[400px] w-full flex flex-col items-center justify-center gap-4 text-muted-foreground">
        <Sparkles className="h-8 w-8" />
        <p className="text-sm">No emotions found for {symbol}. Try a different time range.</p>
      </div>
    );
  }

  return (
    <div className="h-[440px] w-full">
      <div className="flex items-center justify-between mb-4 p-3 rounded-lg bg-card/50 border border-border">
        <div className="flex items-center gap-3">
          <Sparkles className="h-5 w-5 text-primary" />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">AI Emotion Analysis</span>
              {data?.cached && (
                <span className="px-2 py-0.5 rounded bg-muted text-muted-foreground text-xs">cached</span>
              )}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {data?.messageCount && data.messageCount > 0 && (
                <span>{data.messageCount.toLocaleString()} messages analyzed</span>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {data?.dominantEmotion && (
            <Badge variant="outline" className="text-xs">
              Dominant: {data.dominantEmotion}
            </Badge>
          )}
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
      </div>
      
      <ResponsiveContainer width="100%" height="75%">
        <BarChart 
          data={chartData} 
          layout="vertical"
          margin={{ top: 10, right: 30, left: 10, bottom: 10 }}
        >
          <XAxis 
            type="number"
            domain={[0, 100]}
            stroke="hsl(215 20% 55%)" 
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <YAxis 
            type="category"
            dataKey="name"
            stroke="hsl(215 20% 55%)" 
            fontSize={12}
            tickLine={false}
            axisLine={false}
            width={110}
            tick={({ x, y, payload }) => (
              <g transform={`translate(${x},${y})`}>
                <text
                  x={-5}
                  y={0}
                  dy={4}
                  textAnchor="end"
                  fill="hsl(210 40% 98%)"
                  fontSize={12}
                >
                  {payload.value}
                </text>
              </g>
            )}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "8px",
              boxShadow: "0 4px 24px -4px hsl(0 0% 0% / 0.3)"
            }}
            labelStyle={{ color: "hsl(var(--card-foreground))" }}
            formatter={(value: number, name: string, props: any) => [
              <div key="tooltip" className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-lg">{value}</span>
                  <span className="text-muted-foreground text-xs">/ 100 score</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  {props.payload.percentage}% of messages
                </div>
              </div>,
              ""
            ]}
          />
          <Bar 
            dataKey="score" 
            radius={[0, 4, 4, 0]}
            maxBarSize={35}
          >
            {chartData.map((entry: any, index: number) => (
              <Cell key={`cell-${index}`} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      
      {/* Legend */}
      <div className="flex flex-wrap gap-3 mt-4 justify-center">
        {chartData.slice(0, 5).map((emotion: any) => (
          <div 
            key={emotion.name}
            className="flex items-center gap-2 text-xs bg-card/50 px-3 py-1.5 rounded-full border border-border"
          >
            <div 
              className="w-2.5 h-2.5 rounded-full" 
              style={{ backgroundColor: emotion.fill }}
            />
            <span className="text-foreground font-medium">{emotion.name}</span>
            <span className="text-muted-foreground">{emotion.score}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
