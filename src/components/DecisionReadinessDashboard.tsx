import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useLatestPsychologySnapshot, DecisionReadiness, DecisionOverlay } from "@/hooks/use-psychology-snapshot";
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
  Brain
} from "lucide-react";

interface DecisionReadinessDashboardProps {
  symbol: string;
}

const LENS_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  earnings: { label: "Earnings", icon: TrendingUp, color: "text-chart-1" },
  "m-and-a": { label: "M&A", icon: Target, color: "text-chart-2" },
  "capital-allocation": { label: "Capital Allocation", icon: Activity, color: "text-chart-3" },
  "corporate-strategy": { label: "Corporate Strategy", icon: Brain, color: "text-chart-4" },
  "investor-relations": { label: "Investor Relations", icon: Shield, color: "text-chart-5" },
  "crisis-management": { label: "Crisis Management", icon: AlertTriangle, color: "text-destructive" },
  "product-launch": { label: "Product Launch", icon: TrendingUp, color: "text-chart-1" },
  "competitive-positioning": { label: "Competitive Positioning", icon: Target, color: "text-chart-2" },
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

function LensReadinessCard({ 
  lensKey, 
  readiness, 
  overlay 
}: { 
  lensKey: string; 
  readiness: DecisionReadiness;
  overlay?: DecisionOverlay;
}) {
  const config = LENS_CONFIG[lensKey] || { label: lensKey, icon: Activity, color: "text-muted-foreground" };
  const Icon = config.icon;
  const timing = getTimingBadge(readiness.recommended_timing);
  const TimingIcon = timing.icon;

  return (
    <Card className="p-4 bg-gradient-card hover:bg-secondary/50 transition-colors">
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
            {readiness.blocking_narratives.slice(0, 3).map((narrative, idx) => (
              <Badge key={idx} variant="outline" className="text-[10px] border-bearish/30 text-bearish bg-bearish/5">
                {narrative}
              </Badge>
            ))}
            {readiness.blocking_narratives.length > 3 && (
              <Badge variant="outline" className="text-[10px]">
                +{readiness.blocking_narratives.length - 3}
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
            {readiness.supportive_narratives.slice(0, 3).map((narrative, idx) => (
              <Badge key={idx} variant="outline" className="text-[10px] border-bullish/30 text-bullish bg-bullish/5">
                {narrative}
              </Badge>
            ))}
            {readiness.supportive_narratives.length > 3 && (
              <Badge variant="outline" className="text-[10px]">
                +{readiness.supportive_narratives.length - 3}
              </Badge>
            )}
          </div>
        </div>
      )}

      {/* Delay Recommendation */}
      {readiness.recommended_delay && (
        <div className="text-xs text-muted-foreground italic">
          Recommended delay: {readiness.recommended_delay}
        </div>
      )}

      {/* Confidence Indicator */}
      <div className="flex items-center justify-end gap-1 mt-2 pt-2 border-t border-border/50">
        <span className="text-[10px] text-muted-foreground">Confidence:</span>
        <span className="text-[10px] font-medium">
          {Math.round(readiness.confidence * 100)}%
        </span>
      </div>
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
    <Card className="p-4 md:p-5 bg-gradient-card border-primary/20 mb-4">
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

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
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

export function DecisionReadinessDashboard({ symbol }: DecisionReadinessDashboardProps) {
  const { data: snapshot, isLoading, error } = useLatestPsychologySnapshot(symbol);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
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

  return (
    <div className="space-y-4">
      {/* Overview Card */}
      <OverviewCard snapshot={snapshot} />

      {/* Lens Cards Grid */}
      {readinessEntries.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {readinessEntries.map(([lensKey, readiness]) => (
            <LensReadinessCard
              key={lensKey}
              lensKey={lensKey}
              readiness={readiness}
              overlay={interpretation.decision_overlays[lensKey]}
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
