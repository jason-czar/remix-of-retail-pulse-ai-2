import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useLatestPsychologySnapshot } from "@/hooks/use-psychology-snapshot";
import { AlertTriangle, TrendingUp, Target, Activity, Brain, Users, RefreshCcw, Rocket, Shield } from "lucide-react";
import { motion } from "framer-motion";
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

        {/* Active Signals */}
        {activeSignals.length > 0 && (
          <div className="mb-4 pb-3 border-b border-border/50 flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5">
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

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 flex-1">
          {summary.dominant_emotion && (
            <motion.div 
              className="glass-tile p-4 flex flex-col"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.05 }}
            >
              <span className="text-xs text-muted-foreground mb-1.5">
                Dominant Emotion
              </span>
              <p className="text-base font-semibold capitalize">{summary.dominant_emotion}</p>
            </motion.div>
          )}
          {summary.primary_risk && (
            <motion.div 
              className="glass-tile p-4 flex flex-col"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
            >
              <span className="text-xs text-muted-foreground mb-1.5">
                Primary Risk
              </span>
              <p className="text-base font-semibold">{summary.primary_risk}</p>
            </motion.div>
          )}
          {summary.action_bias && (
            <motion.div 
              className="glass-tile p-4 flex flex-col"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.15 }}
            >
              <span className="text-xs text-muted-foreground mb-1.5">
                Action Bias
              </span>
              <p className="text-base font-semibold">{summary.action_bias}</p>
            </motion.div>
          )}
          {bestLens && (
            <motion.div 
              className="glass-tile p-4 flex flex-col"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.2 }}
            >
              <span className="text-xs text-muted-foreground mb-1.5">
                Best Lens
              </span>
              <p className="text-base font-semibold">
                {LENS_CONFIG[bestLens.key]?.label || bestLens.key} <span className="text-primary dark:text-primary">({bestLens.score})</span>
              </p>
            </motion.div>
          )}
        </div>
      </div>
    </Card>
  );
}
