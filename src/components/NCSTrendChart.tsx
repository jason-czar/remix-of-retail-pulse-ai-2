import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useNCSHistory, NCSTimeRange, NCSDataPoint } from "@/hooks/use-ncs-history";
import { ConfidenceBadge, getConfidenceLevel } from "@/components/ui/ConfidenceBadge";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip as RechartsTooltip, ReferenceLine, Dot } from "recharts";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { Activity, AlertCircle } from "lucide-react";

interface NCSTrendChartProps {
  symbol: string;
}

// Minimum snapshots required per range (accounting for weekends)
const MIN_SNAPSHOTS: Record<NCSTimeRange, number> = {
  "7D": 4,   // 7 days ≈ 5 trading days, require 4
  "30D": 7,  // 30 days ≈ 21 trading days
  "90D": 7,  // 90 days ≈ 63 trading days
};

const RANGE_OPTIONS: { value: NCSTimeRange; label: string }[] = [
  { value: "7D", label: "7D" },
  { value: "30D", label: "30D" },
  { value: "90D", label: "90D" },
];

function getRiskColor(level: "low" | "moderate" | "high"): string {
  switch (level) {
    case "low": return "hsl(var(--bullish))";
    case "moderate": return "hsl(var(--chart-4))"; // Amber/neutral
    case "high": return "hsl(var(--bearish))";
  }
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  
  const data = payload[0].payload as NCSDataPoint;
  const confidenceLevel = getConfidenceLevel(data.confidence_score);
  
  return (
    <div className="bg-card border border-border rounded-lg shadow-lg p-3 min-w-[180px]">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium">
          {format(parseISO(data.date), "MMM d, yyyy")}
        </span>
        <ConfidenceBadge level={confidenceLevel} />
      </div>
      
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">NCS Score</span>
          <span className="text-sm font-semibold">{data.score}</span>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Risk Level</span>
          <Badge 
            variant="outline" 
            className={cn(
              "text-[10px] capitalize",
              data.risk_level === "low" && "border-bullish/50 text-bullish",
              data.risk_level === "moderate" && "border-amber-500/50 text-amber-500",
              data.risk_level === "high" && "border-bearish/50 text-bearish"
            )}
          >
            {data.risk_level}
          </Badge>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Top Narrative</span>
          <span className="text-xs">{data.dominant_narrative_share.toFixed(0)}%</span>
        </div>
        
        <div className="pt-1.5 border-t border-border/50 mt-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Messages</span>
            <span className="text-xs">{data.message_count.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Authors</span>
            <span className="text-xs">{data.unique_authors.toLocaleString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function CustomDot(props: any) {
  const { cx, cy, payload } = props;
  if (!payload) return null;
  
  return (
    <Dot
      cx={cx}
      cy={cy}
      r={4}
      fill={getRiskColor(payload.risk_level)}
      stroke="hsl(var(--background))"
      strokeWidth={2}
    />
  );
}

export function NCSTrendChart({ symbol }: NCSTrendChartProps) {
  const [range, setRange] = useState<NCSTimeRange>("30D");
  const { data: ncsData, isLoading, error } = useNCSHistory(symbol, range);
  
  if (isLoading) {
    return (
      <Card className="p-4 glass-card mt-4">
        <div className="flex items-center gap-2 mb-3">
          <Skeleton className="h-4 w-4 rounded" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-[120px] w-full" />
      </Card>
    );
  }
  
  if (error) {
    return null;
  }
  
  const minRequired = MIN_SNAPSHOTS[range];
  const hasInsufficientData = !ncsData || ncsData.length < minRequired;
  
  // Calculate stats for context
  const stats = ncsData && ncsData.length > 0 ? (() => {
    const avg = Math.round(ncsData.reduce((sum, d) => sum + d.score, 0) / ncsData.length);
    const min = Math.min(...ncsData.map(d => d.score));
    const max = Math.max(...ncsData.map(d => d.score));
    const range = max - min;
    const volatility = ncsData.length > 1 
      ? Math.round(
          Math.sqrt(
            ncsData.reduce((sum, d, i, arr) => {
              if (i === 0) return 0;
              return sum + Math.pow(d.score - arr[i - 1].score, 2);
            }, 0) / (ncsData.length - 1)
          )
        )
      : 0;
    
    // Calculate trend direction (first half avg vs second half avg)
    const midpoint = Math.floor(ncsData.length / 2);
    const firstHalfAvg = ncsData.slice(0, midpoint).reduce((s, d) => s + d.score, 0) / midpoint;
    const secondHalfAvg = ncsData.slice(midpoint).reduce((s, d) => s + d.score, 0) / (ncsData.length - midpoint);
    const trendDelta = secondHalfAvg - firstHalfAvg;
    
    return { avg, min, max, range, volatility, trendDelta };
  })() : null;
  
  // Derive qualitative interpretation from stats
  function getInterpretation(s: typeof stats): { label: string; explanation: string } | null {
    if (!s) return null;
    
    const normalizedVolatility = s.volatility / Math.max(s.avg, 1); // relative to mean
    const normalizedRange = s.range / 100; // relative to max possible range
    
    // Thresholds (calibrated for 0-100 scale)
    const isLowVolatility = normalizedVolatility < 0.15 && normalizedRange < 0.25;
    const isHighVolatility = normalizedVolatility > 0.25 || normalizedRange > 0.40;
    const isDecliningSharply = s.trendDelta < -8;
    const isRisingSharply = s.trendDelta > 8;
    
    if (isLowVolatility && Math.abs(s.trendDelta) < 5) {
      return { 
        label: "Stabilizing", 
        explanation: "Narrow variance and consistent levels over the period" 
      };
    }
    
    if (isDecliningSharply && isHighVolatility) {
      return { 
        label: "Fragmenting", 
        explanation: "Widening dispersion with declining coherence" 
      };
    }
    
    if (isHighVolatility && !isDecliningSharply && !isRisingSharply) {
      return { 
        label: "Churning", 
        explanation: "High volatility without directional resolution" 
      };
    }
    
    if (isRisingSharply && !isHighVolatility) {
      return { 
        label: "Consolidating", 
        explanation: "Coherence strengthening with controlled variance" 
      };
    }
    
    if (isDecliningSharply && !isHighVolatility) {
      return { 
        label: "Weakening", 
        explanation: "Steady decline in narrative alignment" 
      };
    }
    
    // Moderate cases
    if (s.trendDelta > 3) {
      return { 
        label: "Gradually consolidating", 
        explanation: "Modest improvement in coherence" 
      };
    }
    
    if (s.trendDelta < -3) {
      return { 
        label: "Gradually fragmenting", 
        explanation: "Modest decline in narrative alignment" 
      };
    }
    
    return { 
      label: "Mixed", 
      explanation: "No clear pattern in coherence behavior" 
    };
  }
  
  const interpretation = getInterpretation(stats);
  
  return (
    <Card className="p-3 md:p-4 glass-card h-full flex flex-col border-border/30">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Activity className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground">NCS Trend</span>
        </div>
        
        {/* Range toggles */}
        <div className="flex items-center gap-0.5 bg-secondary/50 rounded-md p-0.5">
          {RANGE_OPTIONS.map(option => (
            <button
              key={option.value}
              onClick={() => setRange(option.value)}
              className={cn(
                "px-2 py-0.5 text-[10px] font-medium rounded transition-colors",
                range === option.value
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
      
      {hasInsufficientData ? (
        <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
          <AlertCircle className="h-4 w-4" />
          <span className="text-sm">
            Insufficient history ({ncsData?.length ?? 0} of {minRequired} snapshots required)
          </span>
        </div>
      ) : (
        <>
          {/* Interpretation label */}
          {interpretation && (
            <div className="mb-3 pb-2 border-b border-border/30">
              <div className="text-sm font-medium text-foreground">
                {interpretation.label}
              </div>
              <div className="text-[10px] text-muted-foreground mt-0.5">
                {interpretation.explanation}
              </div>
            </div>
          )}
          
          {/* Chart */}
          <div className="h-[100px] md:h-[120px] -mx-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={ncsData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(date) => format(parseISO(date), "M/d")}
                  tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
                  axisLine={false}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis 
                  domain={[
                    (dataMin: number) => Math.max(0, Math.floor(dataMin - (stats?.range || 10) * 0.3)),
                    (dataMax: number) => Math.min(100, Math.ceil(dataMax + (stats?.range || 10) * 0.3))
                  ]}
                  tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
                  axisLine={false}
                  tickLine={false}
                  width={25}
                  tickCount={3}
                />
                <ReferenceLine y={50} stroke="hsl(var(--border))" strokeDasharray="3 3" />
                <RechartsTooltip content={<CustomTooltip />} />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="hsl(var(--primary))"
                  strokeWidth={1.5}
                  dot={false}
                  activeDot={{ r: 4, stroke: "hsl(var(--primary))", strokeWidth: 2, fill: "hsl(var(--background))" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          
          {/* Stats row */}
          {stats && (
            <div className="flex items-center justify-between pt-2 mt-2 border-t border-border/30">
              <div className="flex items-center gap-4">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="text-center">
                        <div className="text-[10px] text-muted-foreground">Avg</div>
                        <div className="text-xs font-medium">{stats.avg}</div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">Average coherence over period</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="text-center">
                        <div className="text-[10px] text-muted-foreground">Range</div>
                        <div className="text-xs font-medium">{stats.min}–{stats.max}</div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">Min-max score range</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="text-center">
                        <div className="text-[10px] text-muted-foreground">Churn</div>
                        <div className="text-xs font-medium">±{stats.volatility}</div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">Day-to-day score volatility (std dev)</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              
              <Badge variant="outline" className="text-[9px]">
                {ncsData?.length} snapshots
              </Badge>
            </div>
          )}
        </>
      )}
    </Card>
  );
}
