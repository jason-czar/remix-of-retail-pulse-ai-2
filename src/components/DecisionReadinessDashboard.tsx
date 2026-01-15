import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  useLatestPsychologySnapshot, 
  DecisionReadiness, 
  DecisionOverlay,
  NarrativePersistence,
  TemporalAttribution,
  NarrativeOutcome
} from "@/hooks/use-psychology-snapshot";
import { NarrativeImpactSummary } from "@/components/NarrativeHistoricalImpact";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
  Shield,
  Target,
  Activity,
  Brain,
  Users,
  Rocket,
  RefreshCcw,
  RefreshCw,
  Loader2,
  Lightbulb,
  AlertCircle,
  Timer,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { cn } from "@/lib/utils";

interface DecisionReadinessDashboardProps {
  symbol: string;
}

const LENS_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  earnings: { label: "Earnings", icon: TrendingUp, color: "text-chart-1" },
  ma: { label: "M&A", icon: Target, color: "text-chart-2" },
  capital_allocation: { label: "Capital Allocation", icon: Activity, color: "text-chart-3" },
  corporate_strategy: { label: "Corporate Strategy", icon: Brain, color: "text-chart-4" },
  leadership_change: { label: "Leadership", icon: Users, color: "text-chart-5" },
  strategic_pivot: { label: "Strategic Pivot", icon: RefreshCcw, color: "text-primary" },
  product_launch: { label: "Product Launch", icon: Rocket, color: "text-chart-1" },
  activist_risk: { label: "Activist Risk", icon: Shield, color: "text-destructive" },
};

function getTimingBadge(timing: DecisionReadiness["recommended_timing"]) {
  switch (timing) {
    case "proceed":
      return { icon: CheckCircle2, label: "Proceed", variant: "bullish" as const };
    case "delay":
      return { icon: Clock, label: "Delay", variant: "neutral" as const };
    case "avoid":
      return { icon: XCircle, label: "Avoid", variant: "bearish" as const };
    default:
      return { icon: Minus, label: "Unknown", variant: "neutral" as const };
  }
}

function getReadinessColor(score: number): string {
  if (score >= 70) return "text-bullish";
  if (score >= 40) return "text-amber-500";
  return "text-bearish";
}

function getProgressColor(score: number): string {
  if (score >= 70) return "bg-bullish";
  if (score >= 40) return "bg-amber-500";
  return "bg-bearish";
}

function getRiskColor(score: number): string {
  if (score >= 70) return "text-bearish";
  if (score >= 40) return "text-amber-500";
  return "text-bullish";
}

// ============= TEMPORAL ATTRIBUTION COMPONENTS =============

function TemporalAttributionBadge({ attribution }: { attribution?: TemporalAttribution }) {
  if (!attribution) return null;

  const { primary_timeframes, effective_weights, confidence_basis } = attribution;
  
  const dominantPeriods = Object.entries(effective_weights)
    .filter(([_, weight]) => weight > 0.25)
    .map(([period]) => period);

  return (
    <div className="flex flex-col gap-1 text-xs">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Timer className="h-3 w-3" />
        <span>Based on {dominantPeriods.join(" + ")} data</span>
        {confidence_basis.timeframe_agreement === "high" && (
          <Badge variant="outline" className="text-xs bg-bullish/10 text-bullish border-bullish/30">
            High agreement
          </Badge>
        )}
        {confidence_basis.timeframe_agreement === "low" && (
          <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-400 border-amber-500/30">
            Low agreement
          </Badge>
        )}
      </div>
      {confidence_basis.hourly_override_active && (
        <div className="flex items-center gap-1 text-amber-400">
          <AlertTriangle className="h-3 w-3" />
          <span>{confidence_basis.override_reason}</span>
        </div>
      )}
    </div>
  );
}

function NarrativePersistenceBadge({ 
  narrativeId, 
  persistence 
}: { 
  narrativeId: string; 
  persistence?: NarrativePersistence[] 
}) {
  const p = persistence?.find(np => np.narrative_id === narrativeId);
  if (!p) return <span className="text-xs">{narrativeId.replace(/_/g, " ")}</span>;

  const config = {
    structural: { 
      bg: "bg-blue-500/20", 
      text: "text-blue-400",
      label: "structural",
      tooltip: `Present in ${p.monthly_presence_pct}% of monthly data - use for strategy`
    },
    "event-driven": { 
      bg: "bg-amber-500/20", 
      text: "text-amber-400",
      label: "event",
      tooltip: "Recent/temporary - use for timing only"
    },
    emerging: { 
      bg: "bg-purple-500/20", 
      text: "text-purple-400",
      label: "emerging",
      tooltip: "Building momentum - monitor closely"
    },
  };

  const style = config[p.classification];

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={cn("px-2 py-0.5 rounded text-[10px]", style.bg, style.text)}>
            {narrativeId.replace(/_/g, " ")} ({style.label})
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <p>{style.tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ============= LENS CARDS =============

function LensReadinessCard({ 
  lensKey, 
  readiness, 
  overlay,
  narrativeOutcomes
}: { 
  lensKey: string; 
  readiness: DecisionReadiness;
  overlay?: DecisionOverlay;
  narrativeOutcomes?: NarrativeOutcome[];
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const config = LENS_CONFIG[lensKey] || { label: lensKey.replace(/_/g, " "), icon: Activity, color: "text-muted-foreground" };
  const Icon = config.icon;
  const timing = getTimingBadge(readiness.recommended_timing);
  const TimingIcon = timing.icon;

  return (
    <Card className="p-4 glass-card hover:bg-secondary/50 transition-colors h-full flex flex-col">
      {/* Main Content - Fixed height container when collapsed */}
      <div className={cn("flex-1", !isExpanded && "min-h-[200px] max-h-[200px] overflow-hidden")}>
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Icon className={`h-4 w-4 ${config.color}`} />
            <span className="font-medium text-sm">{config.label}</span>
          </div>
          <Badge variant={timing.variant} className="text-xs">
            <TimingIcon className="h-3 w-3 mr-1" />
            {timing.label}
          </Badge>
        </div>

        {/* Readiness Score */}
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-muted-foreground">Readiness Score</span>
            <span className={`text-lg font-display ${getReadinessColor(readiness.readiness_score)}`}>
              {readiness.readiness_score}
            </span>
          </div>
          <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary">
            <div 
              className={`h-full transition-all ${getProgressColor(readiness.readiness_score)}`}
              style={{ width: `${readiness.readiness_score}%` }}
            />
          </div>
        </div>

        {/* Blocking Narratives */}
        {readiness.blocking_narratives.length > 0 && (
          <div className="mb-3">
            <div className="flex items-center gap-1.5 mb-1.5">
              <TrendingDown className="h-3 w-3 text-bearish" />
              <span className="text-xs font-medium text-bearish">Blocking</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {readiness.blocking_narratives.slice(0, 2).map((narrative, idx) => (
                <Badge key={idx} variant="outline" className="text-[10px] border-bearish/30 text-bearish bg-bearish/5">
                  {narrative}
                </Badge>
              ))}
              {readiness.blocking_narratives.length > 2 && (
                <Badge variant="outline" className="text-[10px]">
                  +{readiness.blocking_narratives.length - 2}
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Supportive Narratives */}
        {readiness.supportive_narratives.length > 0 && (
          <div className="mb-3">
            <div className="flex items-center gap-1.5 mb-1.5">
              <TrendingUp className="h-3 w-3 text-bullish" />
              <span className="text-xs font-medium text-bullish">Supportive</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {readiness.supportive_narratives.slice(0, 2).map((narrative, idx) => (
                <Badge key={idx} variant="outline" className="text-[10px] border-bullish/30 text-bullish bg-bullish/5">
                  {narrative}
                </Badge>
              ))}
              {readiness.supportive_narratives.length > 2 && (
                <Badge variant="outline" className="text-[10px]">
                  +{readiness.supportive_narratives.length - 2}
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Delay Recommendation */}
        {readiness.recommended_delay && readiness.recommended_delay !== "None" && (
          <div className="text-xs text-muted-foreground italic mb-3">
            Recommended delay: {readiness.recommended_delay}
          </div>
        )}
      </div>

      {/* Show Details Toggle Button - Always at bottom */}
      {overlay && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full text-xs text-muted-foreground hover:text-foreground pt-2 border-t border-border/30"
        >
          {isExpanded ? (
            <>
              <ChevronUp className="h-3 w-3 mr-1" />
              Hide Details
            </>
          ) : (
            <>
              <ChevronDown className="h-3 w-3 mr-1" />
              Show Details
            </>
          )}
        </Button>
      )}

      {/* Overlay Details - Collapsible with Animation */}
      <AnimatePresence>
        {overlay && isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="pt-3 border-t border-border/50 space-y-3 mt-2">
              {/* Risk Score */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Risk Score</span>
                <span className={`text-sm font-medium ${getRiskColor(overlay.risk_score)}`}>
                  {overlay.risk_score}/100
                </span>
              </div>

              {/* Dominant Concerns */}
              {overlay.dominant_concerns && overlay.dominant_concerns.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <AlertCircle className="h-3 w-3 text-amber-500" />
                    <span className="text-xs font-medium">Key Concerns</span>
                  </div>
                  <ul className="space-y-1">
                    {overlay.dominant_concerns.slice(0, 3).map((concern, idx) => (
                      <li key={idx} className="text-[11px] text-muted-foreground pl-3 relative before:absolute before:left-0 before:top-[6px] before:w-1.5 before:h-1.5 before:bg-amber-500/50 before:rounded-full">
                        {concern}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Recommended Actions */}
              {overlay.recommended_actions && overlay.recommended_actions.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Lightbulb className="h-3 w-3 text-primary" />
                    <span className="text-xs font-medium">Recommended Actions</span>
                  </div>
                  <ul className="space-y-1">
                    {overlay.recommended_actions.slice(0, 4).map((action, idx) => (
                      <li key={idx} className="text-[11px] text-muted-foreground pl-3 relative before:absolute before:left-0 before:top-[6px] before:w-1.5 before:h-1.5 before:bg-primary/50 before:rounded-full">
                        {action}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Confidence */}
              <div className="flex items-center justify-end gap-1 pt-2">
                <span className="text-[10px] text-muted-foreground">Confidence:</span>
                <span className="text-[10px] font-medium">
                  {Math.round(overlay.confidence * 100)}%
                </span>
              </div>

              {/* Narrative Historical Impact */}
              {narrativeOutcomes && narrativeOutcomes.length > 0 && (
                <NarrativeImpactSummary outcomes={narrativeOutcomes} maxDisplay={1} />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

function OverviewCard({ 
  snapshot 
}: { 
  snapshot: ReturnType<typeof useLatestPsychologySnapshot>["data"];
}) {
  if (!snapshot) return null;

  const { interpretation, data_confidence, observed_state } = snapshot;
  const summary = interpretation.snapshot_summary;
  
  // Get the highest readiness lens
  const readinessEntries = Object.entries(interpretation.decision_readiness);
  const bestLens = readinessEntries.reduce((best, [key, val]) => {
    if (!best || val.readiness_score > best.score) {
      return { key, score: val.readiness_score, timing: val.recommended_timing };
    }
    return best;
  }, null as { key: string; score: number; timing: string } | null);

  // Count active signals
  const activeSignals = Object.entries(observed_state.signals)
    .filter(([_, signal]) => signal.active)
    .map(([key]) => key.replace(/_/g, " "));

  return (
    <Card className="p-4 md:p-5 glass-card border-primary/20 mb-4">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-primary/10 shrink-0">
          <Brain className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <h3 className="font-semibold text-sm md:text-base">Psychology Overview</h3>
            <Badge variant="outline" className="text-[10px]">
              Confidence: {Math.round(data_confidence.score * 100)}%
            </Badge>
          </div>
          
          {summary.one_liner && (
            <p className="text-sm text-muted-foreground mb-3">{summary.one_liner}</p>
          )}

          {/* Temporal Attribution */}
          <TemporalAttributionBadge attribution={snapshot.interpretation.temporal_attribution} />

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs mt-3">
            {summary.dominant_emotion && (
              <div>
                <span className="text-muted-foreground">Dominant Emotion</span>
                <p className="font-medium capitalize">{summary.dominant_emotion}</p>
              </div>
            )}
            {summary.primary_risk && (
              <div>
                <span className="text-muted-foreground">Primary Risk</span>
                <p className="font-medium text-amber-500">{summary.primary_risk}</p>
              </div>
            )}
            {summary.action_bias && (
              <div>
                <span className="text-muted-foreground">Action Bias</span>
                <p className="font-medium">{summary.action_bias}</p>
              </div>
            )}
            {bestLens && (
              <div>
                <span className="text-muted-foreground">Best Lens</span>
                <p className="font-medium">
                  {LENS_CONFIG[bestLens.key]?.label || bestLens.key} ({bestLens.score})
                </p>
              </div>
            )}
          </div>

          {/* Active Signals */}
          {activeSignals.length > 0 && (
            <div className="mt-3 pt-3 border-t border-border/50">
              <div className="flex items-center gap-1.5 mb-2">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                <span className="text-xs font-medium text-amber-500">Active Signals</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {activeSignals.map((signal, idx) => (
                  <Badge key={idx} variant="outline" className="text-[10px] border-amber-500/30 text-amber-500 bg-amber-500/5 capitalize">
                    {signal}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

// ============= DASHBOARD HEADER =============

function DashboardHeader({ 
  symbol, 
  createdAt,
  onRefreshComplete 
}: { 
  symbol: string; 
  createdAt: string;
  onRefreshComplete: () => void;
}) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const { error } = await supabase.functions.invoke(
        "record-psychology-snapshot",
        {
          body: { 
            symbol: symbol.toUpperCase(), 
            periodType: "hourly",
            forceRun: true 
          },
        }
      );

      if (error) throw error;

      toast.success(`Psychology snapshot refreshed for ${symbol}`);
      onRefreshComplete();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      toast.error(`Refresh failed: ${message}`);
    } finally {
      setIsRefreshing(false);
    }
  };

  const relativeTime = formatDistanceToNow(new Date(createdAt), { addSuffix: true });

  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-semibold">Decision Readiness</h2>
        <span className="text-xs text-muted-foreground flex items-center gap-1">
          <Clock className="h-3 w-3" />
          Updated {relativeTime}
        </span>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={handleRefresh}
        disabled={isRefreshing}
        className="flex items-center gap-2"
      >
        {isRefreshing ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <RefreshCw className="h-3.5 w-3.5" />
        )}
        {isRefreshing ? "Refreshing..." : "Refresh"}
      </Button>
    </div>
  );
}

// ============= MAIN DASHBOARD =============

export function DecisionReadinessDashboard({ symbol }: DecisionReadinessDashboardProps) {
  const queryClient = useQueryClient();
  const { data: snapshot, isLoading, error } = useLatestPsychologySnapshot(symbol);

  const handleRefreshComplete = () => {
    queryClient.invalidateQueries({ queryKey: ["psychology-snapshot-latest", symbol] });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-48 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !snapshot) {
    return (
      <Card className="p-6 text-center">
        <Brain className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
        <h3 className="font-medium mb-1">No Psychology Data Available</h3>
        <p className="text-sm text-muted-foreground">
          Psychology snapshots for {symbol} will appear here once generated.
        </p>
      </Card>
    );
  }

  const { interpretation } = snapshot;
  const readinessEntries = Object.entries(interpretation.decision_readiness);

  // Sort by readiness score descending
  const sortedEntries = readinessEntries.sort(([, a], [, b]) => b.readiness_score - a.readiness_score);

  return (
    <div className="space-y-4">
      {/* Dashboard Header with Last Updated and Refresh */}
      {snapshot && (
        <DashboardHeader 
          symbol={symbol} 
          createdAt={snapshot.created_at}
          onRefreshComplete={handleRefreshComplete}
        />
      )}

      {/* Overview Card */}
      <OverviewCard snapshot={snapshot} />

      {/* Lens Cards Grid */}
      {sortedEntries.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
          {sortedEntries.map(([lensKey, readiness]) => (
            <LensReadinessCard
              key={lensKey}
              lensKey={lensKey}
              readiness={readiness}
              overlay={interpretation.decision_overlays[lensKey]}
              narrativeOutcomes={snapshot.narrative_outcomes}
            />
          ))}
        </div>
      ) : (
        <Card className="p-6 text-center">
          <Activity className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            Decision readiness data is being processed...
          </p>
        </Card>
      )}
    </div>
  );
}
