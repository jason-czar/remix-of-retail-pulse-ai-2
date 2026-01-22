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
      <Card className="p-4 md:p-5 glass-card h-full">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-5 w-20" />
          </div>
          <Skeleton className="h-2 w-full" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
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
    <Card className="p-4 md:p-5 glass-card h-full border-primary/10">
      {/* Header with lens name and timing badge */}
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-semibold text-sm md:text-base">
          {getLensDisplayName(lens)} Readiness
        </h4>
          <Badge 
            variant={timing.variant} 
            className={cn("text-xs px-2.5 py-0.5", timing.bgClass)}
          >
            <TimingIcon className="h-3 w-3 mr-1" />
            {timing.label}
          </Badge>
        </div>

        {/* Two-column layout - 30/70 split */}
        <div className="grid grid-cols-1 md:grid-cols-10 gap-4 md:gap-6">
          {/* Left Column: Readiness Score + Narratives (3/10 = 30%) */}
          <div className="md:col-span-3 space-y-4">
            {/* Readiness Score with progress bar */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-muted-foreground">Readiness Score</span>
                <span className={cn("text-xl font-display", getReadinessColor(readiness.readiness_score))}>
                  {readiness.readiness_score}
                </span>
              </div>
              <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary/50">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${readiness.readiness_score}%` }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                  className={cn("h-full rounded-full", getProgressColor(readiness.readiness_score))}
                />
              </div>
            </div>

            {/* Blocking and Supportive narratives - compact */}
            <div className="space-y-3">
              {/* Blocking Narratives */}
              {readiness.blocking_narratives.length > 0 && (
                <div className="p-3 rounded-lg bg-bearish/5 border border-bearish/20">
                  <div className="flex items-center gap-1.5 mb-2">
                    <TrendingDown className="h-3.5 w-3.5 text-bearish" />
                    <span className="text-xs font-medium text-bearish">Blocking</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {readiness.blocking_narratives.slice(0, 3).map((narrative, idx) => (
                      <Badge 
                        key={idx} 
                        variant="outline" 
                        className="text-[10px] border-bearish/40 text-bearish bg-bearish/10 px-2 py-0"
                      >
                        {narrative}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Supportive Narratives */}
              {readiness.supportive_narratives.length > 0 && (
                <div className="p-3 rounded-lg bg-bullish/5 border border-bullish/20">
                  <div className="flex items-center gap-1.5 mb-2">
                    <TrendingUp className="h-3.5 w-3.5 text-bullish" />
                    <span className="text-xs font-medium text-bullish">Supportive</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {readiness.supportive_narratives.slice(0, 3).map((narrative, idx) => (
                      <Badge 
                        key={idx} 
                        variant="outline" 
                        className="text-[10px] border-bullish/40 text-bullish bg-bullish/10 px-2 py-0"
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
              <p className="text-xs text-muted-foreground italic">
                Recommended delay: {readiness.recommended_delay}
              </p>
            )}
          </div>

          {/* Right Column: Risk, Concerns, Actions (7/10 = 70%) */}
          {overlay && (
            <div className="md:col-span-7 md:border-l md:border-border/40 md:pl-6 space-y-4">
              {/* Risk Score - inline header */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Risk Score</span>
                <span className={cn("text-lg font-medium", getRiskColor(overlay.risk_score))}>
                  {overlay.risk_score}/100
                </span>
              </div>

              {/* Key Concerns - compact */}
              {overlay.dominant_concerns && overlay.dominant_concerns.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <AlertCircle className="h-3.5 w-3.5 text-warning" />
                    <span className="text-xs font-medium">Key Concerns</span>
                  </div>
                  <ul className="space-y-1.5">
                    {overlay.dominant_concerns.slice(0, 3).map((concern, idx) => (
                      <li 
                        key={idx} 
                        className="text-xs text-muted-foreground pl-3 relative before:absolute before:left-0 before:top-[6px] before:w-1.5 before:h-1.5 before:bg-warning/60 before:rounded-full"
                      >
                        {cleanNarrativeIdSuffix(concern)}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Recommended Actions - compact */}
              {overlay.recommended_actions && overlay.recommended_actions.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <Lightbulb className="h-3.5 w-3.5 text-primary" />
                    <span className="text-xs font-medium">Recommended Actions</span>
                  </div>
                  <ul className="space-y-1.5">
                    {overlay.recommended_actions.slice(0, 3).map((action, idx) => (
                      <li 
                        key={idx} 
                        className="text-xs text-muted-foreground pl-3 relative before:absolute before:left-0 before:top-[6px] before:w-1.5 before:h-1.5 before:bg-primary/60 before:rounded-full"
                      >
                        {cleanNarrativeIdSuffix(action)}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Confidence footer */}
              <div className="flex items-center justify-end gap-1.5 pt-1">
                <span className="text-[10px] text-muted-foreground">Confidence:</span>
                <span className="text-[10px] font-medium">
                  {Math.round(overlay.confidence * 100)}%
                </span>
              </div>
            </div>
        )}
      </div>
    </Card>
  );
}
