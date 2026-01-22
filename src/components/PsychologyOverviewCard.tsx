import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useLatestPsychologySnapshot } from "@/hooks/use-psychology-snapshot";
import { AlertTriangle, TrendingUp, Target, Activity, Brain, Users, RefreshCcw, Rocket, Shield } from "lucide-react";

const LENS_CONFIG: Record<string, {
  label: string;
  icon: React.ElementType;
  color: string;
}> = {
  earnings: { label: "Earnings", icon: TrendingUp, color: "text-chart-1" },
  ma: { label: "M&A", icon: Target, color: "text-chart-2" },
  capital_allocation: { label: "Capital Allocation", icon: Activity, color: "text-chart-3" },
  corporate_strategy: { label: "Corporate Strategy", icon: Brain, color: "text-chart-4" },
  leadership_change: { label: "Leadership", icon: Users, color: "text-chart-5" },
  strategic_pivot: { label: "Strategic Pivot", icon: RefreshCcw, color: "text-primary" },
  product_launch: { label: "Product Launch", icon: Rocket, color: "text-bullish" },
  activist_risk: { label: "Activist Risk", icon: Shield, color: "text-warning" },
};

interface PsychologyOverviewCardProps {
  symbol: string;
}

export function PsychologyOverviewCard({ symbol }: PsychologyOverviewCardProps) {
  const { data: snapshot, isLoading } = useLatestPsychologySnapshot(symbol);

  if (isLoading) {
    return (
      <Card className="p-4 md:p-5 glass-card h-full">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-5 w-24" />
          </div>
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <div className="grid grid-cols-2 gap-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        </div>
      </Card>
    );
  }

  if (!snapshot) {
    return (
      <Card className="p-4 md:p-5 glass-card h-full">
        <p className="text-sm text-muted-foreground">No psychology data available.</p>
      </Card>
    );
  }

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
    <Card className="p-4 md:p-5 glass-card h-full border-primary/10">
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <h3 className="font-semibold text-sm md:text-base">Psychology Overview</h3>
          <Badge variant="outline" className="text-[10px]">
            Confidence: {Math.round(data_confidence.score * 100)}%
          </Badge>
        </div>
        
        {summary.one_liner && (
          <p className="text-sm text-muted-foreground mb-4 leading-relaxed">{summary.one_liner}</p>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 flex-1">
          {summary.dominant_emotion && (
            <div className="flex flex-col">
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground/70 mb-1.5 font-medium">
                Dominant Emotion
              </span>
              <div className="p-3 bg-bearish/5 dark:bg-bearish/[0.06] backdrop-blur-sm rounded-lg border border-bearish/20 dark:border-bearish/25 flex-1">
                <p className="text-sm font-medium capitalize">{summary.dominant_emotion}</p>
              </div>
            </div>
          )}
          {summary.primary_risk && (
            <div className="flex flex-col">
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground/70 mb-1.5 font-medium">
                Primary Risk
              </span>
              <div className="p-3 bg-warning/5 dark:bg-warning/[0.06] backdrop-blur-sm rounded-lg border border-warning/20 dark:border-warning/25 flex-1">
                <p className="text-sm font-medium text-warning">{summary.primary_risk}</p>
              </div>
            </div>
          )}
          {summary.action_bias && (
            <div className="flex flex-col">
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground/70 mb-1.5 font-medium">
                Action Bias
              </span>
              <div className="p-3 bg-bullish/5 dark:bg-bullish/[0.06] backdrop-blur-sm rounded-lg border border-bullish/20 dark:border-bullish/25 flex-1">
                <p className="text-sm font-medium">{summary.action_bias}</p>
              </div>
            </div>
          )}
          {bestLens && (
            <div className="flex flex-col">
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground/70 mb-1.5 font-medium">
                Best Lens
              </span>
              <div className="p-3 bg-neutral/5 dark:bg-neutral/[0.06] backdrop-blur-sm rounded-lg border border-neutral/20 dark:border-neutral/25 flex-1">
                <p className="text-sm font-medium">
                  {LENS_CONFIG[bestLens.key]?.label || bestLens.key} <span className="text-primary">({bestLens.score})</span>
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Active Signals */}
        {activeSignals.length > 0 && (
          <div className="mt-4 pt-3 border-t border-border/50">
            <div className="flex items-center gap-1.5 mb-2">
              <AlertTriangle className="h-3.5 w-3.5 text-warning" />
              <span className="text-xs font-medium text-warning">Active Signals</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {activeSignals.map((signal, idx) => (
                <Badge 
                  key={idx} 
                  variant="outline" 
                  className="text-[10px] border-warning/30 text-warning bg-warning/5 capitalize"
                >
                  {signal}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
