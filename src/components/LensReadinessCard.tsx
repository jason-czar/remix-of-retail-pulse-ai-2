import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useLatestPsychologySnapshot, DecisionReadiness, DecisionOverlay, NarrativeOutcome } from "@/hooks/use-psychology-snapshot";
import { DecisionLens, getLensDisplayName } from "@/components/DecisionLensSelector";
import { CheckCircle2, XCircle, Clock, TrendingUp, TrendingDown, Minus, AlertCircle, Lightbulb } from "lucide-react";
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
  'activist-risk': 'activist_risk'
};
function cleanNarrativeText(text: string): string {
  // Remove trailing technical IDs (e.g., "narrative_abc_123")
  let cleaned = text.replace(/\s+[a-z][a-z0-9]*(?:_[a-z0-9]+){2,}$/i, '');
  // Remove non-ASCII characters (Chinese, special symbols, etc.)
  cleaned = cleaned.replace(/[^\x00-\x7F]/g, '');
  return cleaned.trim();
}
function getTimingBadge(timing: DecisionReadiness["recommended_timing"]) {
  switch (timing) {
    case "proceed":
      return {
        icon: CheckCircle2,
        label: "Proceed",
        variant: "bullish" as const,
        bgClass: "bg-bullish/10 border-bullish/30"
      };
    case "delay":
      return {
        icon: Clock,
        label: "Delay",
        variant: "neutral" as const,
        bgClass: "bg-warning/10 border-warning/30"
      };
    case "avoid":
      return {
        icon: XCircle,
        label: "Avoid",
        variant: "bearish" as const,
        bgClass: "bg-bearish/10 border-bearish/30"
      };
    default:
      return {
        icon: Minus,
        label: "Unknown",
        variant: "neutral" as const,
        bgClass: "bg-muted/10 border-muted/30"
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
export function LensReadinessCard({
  symbol,
  lens
}: LensReadinessCardProps) {
  const {
    data: snapshot,
    isLoading
  } = useLatestPsychologySnapshot(symbol);

  // Don't render for summary lens
  if (lens === 'summary') {
    return null;
  }
  const lensKey = LENS_KEY_MAP[lens];
  if (isLoading) {
    return <Card className="p-4 md:p-5 glass-card h-full">
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
      </Card>;
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
  return <Card className="p-4 md:p-5 glass-card h-full border-primary/10">
      {/* Header with lens name and timing badge */}
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-semibold text-sm md:text-base">
          {getLensDisplayName(lens)} Readiness
        </h4>
          <Badge variant={timing.variant} className={cn("text-xs px-2.5 py-0.5", timing.bgClass)}>
            <TimingIcon className="h-3 w-3 mr-1" />
            {timing.label}
          </Badge>
        </div>

        {/* Two-column layout - 35/65 split */}
        <div className="grid grid-cols-1 md:grid-cols-[7fr_13fr] gap-4 md:gap-6">
          {/* Left Column: Readiness Score + Narratives (35%) */}
          <div className="flex flex-col min-w-0">
            {/* Readiness Score with progress bar */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-muted-foreground">Readiness Score</span>
                <span className={cn("text-xl font-display", getReadinessColor(readiness.readiness_score))}>
                  {readiness.readiness_score}
                </span>
              </div>
              <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary/50">
                <motion.div initial={{
              width: 0
            }} animate={{
              width: `${readiness.readiness_score}%`
            }} transition={{
              duration: 0.6,
              ease: "easeOut"
            }} className={cn("h-full rounded-full", getProgressColor(readiness.readiness_score))} />
              </div>
            </div>

            {/* Supportive and Blocking narratives - compact */}
            <div className="space-y-3 mt-4 mb-4">
              {/* Supportive Narratives */}
              {readiness.supportive_narratives.length > 0 && <div className="p-3 rounded-lg border border-bullish/20 bg-transparent">
                  <div className="flex items-center gap-1.5 mb-2">
                    <TrendingUp className="h-3.5 w-3.5 text-bullish" />
                    <span className="text-xs font-medium text-bullish">Supportive</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {readiness.supportive_narratives.slice(0, 3).map((narrative, idx) => <Badge key={idx} variant="outline" className="text-[10px] border-bullish/40 text-bullish bg-bullish/10 px-2 py-0">
                        {cleanNarrativeText(narrative)}
                      </Badge>)}
                  </div>
                </div>}

              {/* Blocking Narratives */}
              {readiness.blocking_narratives.length > 0 && <div className="p-3 rounded-lg border border-bearish/20 bg-transparent">
                  <div className="flex items-center gap-1.5 mb-2">
                    <TrendingDown className="h-3.5 w-3.5 text-bearish" />
                    <span className="text-xs font-medium text-bearish">Blocking</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {readiness.blocking_narratives.slice(0, 3).map((narrative, idx) => <Badge key={idx} variant="outline" className="text-[10px] border-bearish/40 text-bearish bg-bearish/10 px-2 py-0">
                        {cleanNarrativeText(narrative)}
                      </Badge>)}
                  </div>
                </div>}
            </div>

            {/* Delay recommendation */}
            {readiness.recommended_delay && readiness.recommended_delay !== "None" && <p className="text-xs text-muted-foreground italic">
                Recommended delay: {readiness.recommended_delay}
              </p>}

            {/* Confidence footer - at bottom of left column */}
            {overlay && <div className="pt-3 mt-auto">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-muted-foreground">Confidence</span>
                  <span className="text-xs font-medium">
                    {Math.round(overlay.confidence * 100)}%
                  </span>
                </div>
                <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-secondary/50">
                  <motion.div initial={{
              width: 0
            }} animate={{
              width: `${overlay.confidence * 100}%`
            }} transition={{
              duration: 0.5,
              ease: "easeOut"
            }} className="h-full rounded-full bg-primary/70" />
                </div>
              </div>}
          </div>

          {/* Right Column: Risk, Concerns, Actions (65%) */}
          {overlay && <div className="md:border-l md:border-border/40 md:pl-6 space-y-4 min-w-0">
              {/* Risk Score - inline header */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Risk Score</span>
                <span className={cn("text-xl font-semibold", getRiskColor(overlay.risk_score))}>
                  {overlay.risk_score}/100
                </span>
              </div>

              {/* Key Concerns - compact */}
              {overlay.dominant_concerns && overlay.dominant_concerns.length > 0 && <div>
                  <div className="flex items-center gap-2 mb-2.5">
                    <AlertCircle className="h-4 w-4 text-warning" />
                    <span className="text-sm font-medium">Key Concerns</span>
                  </div>
                  <ul className="space-y-1.5">
                    {overlay.dominant_concerns.slice(0, 3).map((concern, idx) => <li key={idx} className="text-[13px] text-muted-foreground pl-4 relative before:absolute before:left-0 before:top-[7px] before:w-1.5 before:h-1.5 before:bg-warning/60 before:rounded-full">
                        {cleanNarrativeText(concern)}
                      </li>)}
                  </ul>
                </div>}

              {/* Recommended Actions - compact */}
              {overlay.recommended_actions && overlay.recommended_actions.length > 0 && <div>
                  <div className="flex items-center gap-2 mb-2.5">
                    <Lightbulb className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">Recommended Actions</span>
                  </div>
                  <ul className="space-y-1.5">
                    {overlay.recommended_actions.slice(0, 3).map((action, idx) => <li key={idx} className="text-[13px] text-muted-foreground pl-4 relative before:absolute before:left-0 before:top-[7px] before:w-1.5 before:h-1.5 before:bg-primary/60 before:rounded-full">
                        {cleanNarrativeText(action)}
                      </li>)}
                  </ul>
                </div>}
            </div>}
      </div>
    </Card>;
}