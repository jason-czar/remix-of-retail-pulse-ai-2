import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useLatestPsychologySnapshot, DecisionReadiness, DecisionOverlay, NarrativeOutcome } from "@/hooks/use-psychology-snapshot";
import { DecisionLens, getLensDisplayName } from "@/components/DecisionLensSelector";
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  AlertCircle, 
  Lightbulb 
} from "lucide-react";
import { cn } from "@/lib/utils";

interface LensReadinessCardProps {
  symbol: string;
  lens: DecisionLens;
}

// Map from DecisionLens to interpretation keys
const LENS_KEY_MAP: Record<string, string> = {
  'corporate-strategy': 'corporate_strategy',
  'earnings': 'earnings',
  'ma': 'ma',
  'capital-allocation': 'capital_allocation',
  'leadership-change': 'leadership_change',
  'strategic-pivot': 'strategic_pivot',
  'product-launch': 'product_launch',
  'activist-risk': 'activist_risk',
};

function cleanNarrativeIdSuffix(text: string): string {
  return text.replace(/\s+[a-z][a-z0-9]*(?:_[a-z0-9]+){2,}$/i, '').trim();
}

function getTimingBadge(timing: DecisionReadiness["recommended_timing"]) {
  switch (timing) {
    case "proceed":
      return {
        icon: CheckCircle2,
        label: "Proceed",
        variant: "bullish" as const,
        bgClass: "bg-bullish/10 border-bullish/30",
      };
    case "delay":
      return {
        icon: Clock,
        label: "Delay",
        variant: "neutral" as const,
        bgClass: "bg-warning/10 border-warning/30",
      };
    case "avoid":
      return {
        icon: XCircle,
        label: "Avoid",
        variant: "bearish" as const,
        bgClass: "bg-bearish/10 border-bearish/30",
      };
    default:
      return {
        icon: Minus,
        label: "Unknown",
        variant: "neutral" as const,
        bgClass: "bg-muted/10 border-muted/30",
      };
  }
}

function getReadinessColor(score: number): string {
  if (score >= 70) return "text-bullish";
  if (score >= 40) return "text-warning";
  return "text-bearish";
}

function getProgressColor(score: number): string {
  if (score >= 70) return "bg-bullish";
  if (score >= 40) return "bg-warning";
  return "bg-bearish";
}

function getRiskColor(score: number): string {
  if (score >= 70) return "text-bearish";
  if (score >= 40) return "text-warning";
  return "text-bullish";
}

export function LensReadinessCard({ symbol, lens }: LensReadinessCardProps) {
  const { data: snapshot, isLoading } = useLatestPsychologySnapshot(symbol);
  
  // Don't render for summary lens
  if (lens === 'summary') {
    return null;
  }

  const lensKey = LENS_KEY_MAP[lens];
  
  if (isLoading) {
    return (
      <Card className="p-5 md:p-6 glass-card mt-4">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-6 w-24" />
          </div>
          <Skeleton className="h-3 w-full" />
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        </div>
      </Card>
    );
  }

  if (!snapshot) {
    return null;
  }

  const readiness = snapshot.interpretation.decision_readiness[lensKey];
  const overlay = snapshot.interpretation.decision_overlays[lensKey];

  if (!readiness) {
    return null;
  }

  const timing = getTimingBadge(readiness.recommended_timing);
  const TimingIcon = timing.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      <Card className="p-5 md:p-6 glass-card mt-4 border-primary/10">
        {/* Header with lens name and timing badge */}
        <div className="flex items-center justify-between mb-5">
          <h4 className="font-semibold text-base md:text-lg">
            {getLensDisplayName(lens)} Readiness
          </h4>
          <Badge 
            variant={timing.variant} 
            className={cn("text-xs md:text-sm px-3 py-1", timing.bgClass)}
          >
            <TimingIcon className="h-3.5 w-3.5 mr-1.5" />
            {timing.label}
          </Badge>
        </div>

        {/* Readiness Score with progress bar */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Readiness Score</span>
            <span className={cn("text-2xl font-display", getReadinessColor(readiness.readiness_score))}>
              {readiness.readiness_score}
            </span>
          </div>
          <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-secondary/50">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${readiness.readiness_score}%` }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className={cn("h-full rounded-full", getProgressColor(readiness.readiness_score))}
            />
          </div>
        </div>

        {/* Blocking and Supportive narratives grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
          {/* Blocking Narratives */}
          {readiness.blocking_narratives.length > 0 && (
            <div className="p-4 rounded-xl bg-bearish/5 border border-bearish/20">
              <div className="flex items-center gap-2 mb-3">
                <TrendingDown className="h-4 w-4 text-bearish" />
                <span className="text-sm font-medium text-bearish">Blocking</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {readiness.blocking_narratives.map((narrative, idx) => (
                  <Badge 
                    key={idx} 
                    variant="outline" 
                    className="text-xs border-bearish/40 text-bearish bg-bearish/10"
                  >
                    {narrative}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Supportive Narratives */}
          {readiness.supportive_narratives.length > 0 && (
            <div className="p-4 rounded-xl bg-bullish/5 border border-bullish/20">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="h-4 w-4 text-bullish" />
                <span className="text-sm font-medium text-bullish">Supportive</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {readiness.supportive_narratives.map((narrative, idx) => (
                  <Badge 
                    key={idx} 
                    variant="outline" 
                    className="text-xs border-bullish/40 text-bullish bg-bullish/10"
                  >
                    {narrative}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Delay recommendation */}
        {readiness.recommended_delay && readiness.recommended_delay !== "None" && (
          <p className="text-sm text-muted-foreground italic mb-5">
            Recommended delay: {readiness.recommended_delay}
          </p>
        )}

        {/* Overlay details: Risk, Concerns, and Actions */}
        {overlay && (
          <div className="pt-5 border-t border-border/40 space-y-5">
            {/* Risk Score */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Risk Score</span>
              <span className={cn("text-lg font-medium", getRiskColor(overlay.risk_score))}>
                {overlay.risk_score}/100
              </span>
            </div>

            {/* Key Concerns and Recommended Actions - Side by Side */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Key Concerns */}
              {overlay.dominant_concerns && overlay.dominant_concerns.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <AlertCircle className="h-4 w-4 text-warning" />
                    <span className="text-sm font-medium">Key Concerns</span>
                  </div>
                  <ul className="space-y-2">
                    {overlay.dominant_concerns.slice(0, 4).map((concern, idx) => (
                      <li 
                        key={idx} 
                        className="text-sm text-muted-foreground pl-4 relative before:absolute before:left-0 before:top-[8px] before:w-2 before:h-2 before:bg-warning/60 before:rounded-full"
                      >
                        {cleanNarrativeIdSuffix(concern)}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Recommended Actions */}
              {overlay.recommended_actions && overlay.recommended_actions.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Lightbulb className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">Recommended Actions</span>
                  </div>
                  <ul className="space-y-2">
                    {overlay.recommended_actions.slice(0, 4).map((action, idx) => (
                      <li 
                        key={idx} 
                        className="text-sm text-muted-foreground pl-4 relative before:absolute before:left-0 before:top-[8px] before:w-2 before:h-2 before:bg-primary/60 before:rounded-full"
                      >
                        {cleanNarrativeIdSuffix(action)}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Confidence footer */}
            <div className="flex items-center justify-end gap-2 pt-2">
              <span className="text-xs text-muted-foreground">Confidence:</span>
              <span className="text-xs font-medium">
                {Math.round(overlay.confidence * 100)}%
              </span>
            </div>
          </div>
        )}
      </Card>
    </motion.div>
  );
}
