import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useLatestSnapshotWithOutcomes, NarrativeOutcome } from "@/hooks/use-psychology-snapshot";
import { ConfidenceBadge } from "@/components/ui/ConfidenceBadge";
import { FlaskConical, TrendingUp, TrendingDown, BarChart3, ChevronDown, ChevronUp, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Cell, ReferenceLine } from "recharts";
interface NarrativeImpactHistorySectionProps {
  symbol: string;
}
function getPersistenceBadge(persistence: NarrativeOutcome["persistence"]) {
  const config = {
    structural: {
      bg: "bg-primary/20",
      text: "text-primary",
      border: "border-primary/30",
      label: "Structural"
    },
    "event-driven": {
      bg: "bg-amber-500/20",
      text: "text-amber-400",
      border: "border-amber-500/30",
      label: "Event-Driven"
    },
    emerging: {
      bg: "bg-purple-500/20",
      text: "text-purple-400",
      border: "border-purple-500/30",
      label: "Emerging"
    }
  };
  return config[persistence];
}
function formatPercent(value: number | null): string {
  if (value === null) return "N/A";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}
function getMoveColor(value: number | null): string {
  if (value === null) return "text-muted-foreground";
  return value > 0 ? "text-bullish" : value < 0 ? "text-bearish" : "text-muted-foreground";
}
function NarrativeImpactCard({
  outcome,
  isExpanded,
  onToggle
}: {
  outcome: NarrativeOutcome;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const {
    historical_outcomes,
    confidence_label,
    persistence,
    label,
    current_prevalence_pct,
    dominant_emotion
  } = outcome;
  const {
    episode_count,
    avg_price_move_5d,
    avg_price_move_10d,
    median_price_move_10d,
    win_rate_5d,
    win_rate_10d,
    p25_price_move_10d,
    p75_price_move_10d,
    max_drawdown_avg
  } = historical_outcomes;
  const persistenceStyle = getPersistenceBadge(persistence);
  const isExperimental = episode_count < 5;
  const displayMove = median_price_move_10d ?? avg_price_move_10d;
  const MoveIcon = displayMove && displayMove > 0 ? TrendingUp : TrendingDown;
  return <Card className="glass-card overflow-hidden">
      <div className="p-4 cursor-pointer hover:bg-secondary/30 transition-colors" onClick={onToggle}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <h4 className="font-medium text-sm truncate">{label}</h4>
              <ConfidenceBadge level={confidence_label} tooltipContent={`Based on ${episode_count} historical episodes`} />
              <Badge variant="outline" className={cn("text-[9px] shrink-0", persistenceStyle.bg, persistenceStyle.text, persistenceStyle.border)}>
                {persistenceStyle.label}
              </Badge>
            </div>
            
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span>Current: {current_prevalence_pct.toFixed(0)}%</span>
              <span>•</span>
              <span className="capitalize">{dominant_emotion}</span>
              <span>•</span>
              <span>{episode_count} episode{episode_count !== 1 ? 's' : ''}</span>
            </div>
          </div>
          
          {/* Quick metric preview */}
          {!isExperimental && displayMove !== null && <div className="flex items-center gap-2 shrink-0">
              <div className={cn("text-right", getMoveColor(displayMove))}>
                <div className="flex items-center gap-1 text-sm font-medium">
                  <MoveIcon className="h-3.5 w-3.5" />
                  {formatPercent(displayMove)}
                </div>
                <div className="text-[10px] text-muted-foreground">10D median</div>
              </div>
            </div>}
          
          <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0">
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
      </div>
      
      <AnimatePresence>
        {isExpanded && <motion.div initial={{
        height: 0,
        opacity: 0
      }} animate={{
        height: "auto",
        opacity: 1
      }} exit={{
        height: 0,
        opacity: 0
      }} transition={{
        duration: 0.2
      }}>
            <div className="px-4 pb-4 border-t border-border/30">
              {isExperimental ? <div className="pt-4 flex items-center gap-3 text-sm">
                  <FlaskConical className="h-5 w-5 text-purple-400" />
                  <div>
                    <span className="font-medium text-purple-400">Experimental</span>
                    <p className="text-muted-foreground text-xs mt-1">
                      Only {episode_count} episode{episode_count !== 1 ? 's' : ''} observed. 
                      Need 5+ episodes for reliable analysis.
                    </p>
                  </div>
                </div> : <div className="pt-4 space-y-4">
                  {/* Metrics Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <MetricBlock label="5D Move" value={formatPercent(avg_price_move_5d)} valueColor={getMoveColor(avg_price_move_5d)} tooltip="Average price change 5 trading days after narrative peaked" />
                    <MetricBlock label="10D Move" value={formatPercent(median_price_move_10d)} valueColor={getMoveColor(median_price_move_10d)} tooltip="Median price change 10 trading days after narrative peaked" highlight />
                    <MetricBlock label="5D Win Rate" value={win_rate_5d !== null ? `${win_rate_5d}%` : "N/A"} valueColor={win_rate_5d && win_rate_5d >= 50 ? "text-bullish" : "text-bearish"} tooltip="% of episodes with positive 5-day returns" />
                    <MetricBlock label="10D Win Rate" value={win_rate_10d !== null ? `${win_rate_10d}%` : "N/A"} valueColor={win_rate_10d && win_rate_10d >= 50 ? "text-bullish" : "text-bearish"} tooltip="% of episodes with positive 10-day returns" />
                  </div>
                  
                  {/* Range Visualization */}
                  {p25_price_move_10d !== null && p75_price_move_10d !== null && <div className="pt-2">
                      <div className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                        <BarChart3 className="h-3 w-3" />
                        Outcome Range (10D, 25th-75th percentile)
                      </div>
                      <OutcomeRangeBar p25={p25_price_move_10d} p75={p75_price_move_10d} median={median_price_move_10d} />
                    </div>}
                  
                  {/* Contextual Insight */}
                  <div className="pt-2 border-t border-border/30">
                    <p className="text-xs text-muted-foreground italic">
                      {getContextualInsight(outcome)}
                    </p>
                  </div>
                </div>}
            </div>
          </motion.div>}
      </AnimatePresence>
    </Card>;
}
function MetricBlock({
  label,
  value,
  valueColor = "text-foreground",
  tooltip,
  highlight = false
}: {
  label: string;
  value: string;
  valueColor?: string;
  tooltip?: string;
  highlight?: boolean;
}) {
  const content = <div className={cn("p-3 rounded-lg bg-secondary/50", highlight && "ring-1 ring-primary/30")}>
      <div className="text-[10px] text-muted-foreground mb-1 flex items-center gap-1">
        {label}
        {tooltip && <Info className="h-2.5 w-2.5" />}
      </div>
      <div className={cn("text-lg font-semibold", valueColor)}>{value}</div>
    </div>;
  if (tooltip) {
    return <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>{content}</TooltipTrigger>
          <TooltipContent><p className="max-w-xs text-xs">{tooltip}</p></TooltipContent>
        </Tooltip>
      </TooltipProvider>;
  }
  return content;
}
function OutcomeRangeBar({
  p25,
  p75,
  median
}: {
  p25: number;
  p75: number;
  median: number | null;
}) {
  // Calculate the visible range for the chart
  const minVal = Math.min(p25, -10);
  const maxVal = Math.max(p75, 10);
  const range = maxVal - minVal;

  // Calculate positions as percentages
  const zeroPos = (0 - minVal) / range * 100;
  const p25Pos = (p25 - minVal) / range * 100;
  const p75Pos = (p75 - minVal) / range * 100;
  const medianPos = median !== null ? (median - minVal) / range * 100 : null;
  return <div className="relative h-8">
      {/* Background track */}
      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-2 bg-secondary rounded-full" />
      
      {/* Zero line */}
      <div className="absolute top-0 bottom-0 w-px bg-border" style={{
      left: `${zeroPos}%`
    }} />
      
      {/* Range bar */}
      <div className="absolute top-1/2 -translate-y-1/2 h-3 rounded-full bg-gradient-to-r from-bearish/60 via-muted to-bullish/60" style={{
      left: `${p25Pos}%`,
      width: `${p75Pos - p25Pos}%`
    }} />
      
      {/* Median marker */}
      {medianPos !== null && <div className="absolute top-1/2 -translate-y-1/2 w-1 h-5 bg-primary rounded-full" style={{
      left: `${medianPos}%`
    }} />}
      
      {/* Labels */}
      <div className="absolute -bottom-4 left-0 right-0 flex justify-between text-[9px] text-muted-foreground">
        <span style={{
        position: 'absolute',
        left: `${p25Pos}%`,
        transform: 'translateX(-50%)'
      }}>
          {formatPercent(p25)}
        </span>
        {medianPos !== null && <span className="text-primary font-medium" style={{
        position: 'absolute',
        left: `${medianPos}%`,
        transform: 'translateX(-50%)'
      }}>
            {formatPercent(median)}
          </span>}
        <span style={{
        position: 'absolute',
        left: `${p75Pos}%`,
        transform: 'translateX(-50%)'
      }}>
          {formatPercent(p75)}
        </span>
      </div>
    </div>;
}
function getContextualInsight(outcome: NarrativeOutcome): string {
  const {
    confidence_label,
    persistence,
    historical_outcomes
  } = outcome;
  const {
    median_price_move_10d,
    win_rate_10d,
    episode_count
  } = historical_outcomes;
  if (confidence_label === "high" && persistence === "structural") {
    if (median_price_move_10d && median_price_move_10d < -5) {
      return `Strong historical pattern: when this structural narrative dominates, the stock has typically declined ${formatPercent(median_price_move_10d)} over 10 days with ${win_rate_10d}% positive outcomes.`;
    } else if (median_price_move_10d && median_price_move_10d > 5) {
      return `Strong historical pattern: this structural narrative has preceded ${formatPercent(median_price_move_10d)} gains over 10 days with ${win_rate_10d}% win rate.`;
    }
    return `Structural narrative with consistent historical outcomes across ${episode_count} episodes.`;
  }
  if (persistence === "event-driven") {
    return `Event-driven narrative - outcomes may vary based on the specific catalyst. Historical data shows ${episode_count} similar episodes.`;
  }
  if (confidence_label === "moderate") {
    return `Moderate confidence pattern - use as directional context alongside other signals. Based on ${episode_count} observations.`;
  }
  return `Emerging pattern based on ${episode_count} episodes. Continue monitoring as more data accumulates.`;
}

// Mini chart showing the distribution of outcomes
function OutcomeDistributionChart({
  outcomes
}: {
  outcomes: NarrativeOutcome[];
}) {
  const chartData = outcomes.filter(o => o.historical_outcomes.episode_count >= 3 && o.historical_outcomes.median_price_move_10d !== null).slice(0, 8).map(o => ({
    name: o.label.length > 15 ? o.label.substring(0, 15) + '...' : o.label,
    fullName: o.label,
    move: o.historical_outcomes.median_price_move_10d || 0,
    episodes: o.historical_outcomes.episode_count,
    confidence: o.confidence_label
  }));
  if (chartData.length < 2) return null;
  return <Card className="glass-card p-4">
      <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
        <BarChart3 className="h-4 w-4 text-primary" />
        Narrative Impact Overview
      </h4>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} layout="vertical" margin={{
          top: 5,
          right: 30,
          left: 100,
          bottom: 5
        }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
            <XAxis type="number" tickFormatter={v => `${v > 0 ? '+' : ''}${v}%`} tick={{
            fill: 'hsl(var(--muted-foreground))',
            fontSize: 10
          }} domain={['auto', 'auto']} />
            <YAxis type="category" dataKey="name" tick={{
            fill: 'hsl(var(--muted-foreground))',
            fontSize: 10
          }} width={95} />
            <ReferenceLine x={0} stroke="hsl(var(--border))" />
            <Bar dataKey="move" radius={[0, 4, 4, 0]}>
              {chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.move > 0 ? 'hsl(var(--bullish))' : 'hsl(var(--bearish))'} fillOpacity={entry.confidence === 'high' ? 0.9 : entry.confidence === 'moderate' ? 0.6 : 0.4} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="text-[10px] text-muted-foreground text-center mt-2">
        Median 10-day price move by narrative (opacity indicates confidence level)
      </p>
    </Card>;
}
export function NarrativeImpactHistorySection({
  symbol
}: NarrativeImpactHistorySectionProps) {
  const {
    data: snapshot,
    isLoading,
    error
  } = useLatestSnapshotWithOutcomes(symbol);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [showAll, setShowAll] = useState(false);
  const outcomes = snapshot?.narrative_outcomes || [];

  // Sort by episode count (more data = more reliable) then by absolute move magnitude
  const sortedOutcomes = [...outcomes].sort((a, b) => {
    // First by confidence tier
    const tierOrder = {
      high: 0,
      moderate: 1,
      experimental: 2
    };
    const tierDiff = tierOrder[a.confidence_label] - tierOrder[b.confidence_label];
    if (tierDiff !== 0) return tierDiff;

    // Then by episode count
    return b.historical_outcomes.episode_count - a.historical_outcomes.episode_count;
  });
  const displayedOutcomes = showAll ? sortedOutcomes : sortedOutcomes.slice(0, 4);
  const hasMore = sortedOutcomes.length > 4;
  const toggleCard = (id: string) => {
    setExpandedCards(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };
  if (isLoading) {
    return <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </div>;
  }
  if (error || !snapshot) {
    return null;
  }
  if (outcomes.length === 0) {
    return <Card className="glass-card p-6">
        <div className="flex items-center gap-3 text-muted-foreground">
          <BarChart3 className="h-5 w-5" />
          <div>
            <h3 className="font-medium text-foreground">Narrative Impact History</h3>
            <p className="text-sm">No narrative outcome data available yet. Data accumulates as narratives complete their cycles.</p>
          </div>
        </div>
      </Card>;
  }
  const highConfidenceCount = outcomes.filter(o => o.confidence_label === 'high').length;
  const moderateCount = outcomes.filter(o => o.confidence_label === 'moderate').length;
  const experimentalCount = outcomes.filter(o => o.confidence_label === 'experimental').length;
  return <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            
            Narrative Impact History
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Historical price outcomes when these narratives dominated social sentiment
          </p>
        </div>
        <div className="flex gap-2 text-xs">
          {highConfidenceCount > 0 && <ConfidenceBadge level="high" showTooltip={false} count={highConfidenceCount} />}
          {moderateCount > 0 && <ConfidenceBadge level="moderate" showTooltip={false} count={moderateCount} />}
          {experimentalCount > 0 && <ConfidenceBadge level="experimental" showTooltip={false} count={experimentalCount} />}
        </div>
      </div>

      {/* Overview Chart */}
      <OutcomeDistributionChart outcomes={sortedOutcomes} />

      {/* Individual Narrative Cards */}
      <div className="grid gap-3 md:grid-cols-2">
        {displayedOutcomes.map(outcome => <NarrativeImpactCard key={outcome.narrative_id} outcome={outcome} isExpanded={expandedCards.has(outcome.narrative_id)} onToggle={() => toggleCard(outcome.narrative_id)} />)}
      </div>

      {/* Show More/Less */}
      {hasMore && <div className="flex justify-center">
          <Button variant="ghost" size="sm" onClick={() => setShowAll(!showAll)}>
            {showAll ? <>
                <ChevronUp className="h-4 w-4 mr-1" />
                Show Less
              </> : <>
                <ChevronDown className="h-4 w-4 mr-1" />
                Show {sortedOutcomes.length - 4} More Narratives
              </>}
          </Button>
        </div>}
    </div>;
}