import { useState } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfidenceBadge, ConfidenceLevel } from "@/components/ui/ConfidenceBadge";
import { LensValue, getLensDisplayName, getLensDecisionQuestion } from "@/components/DecisionLensSelector";
import { CustomLens } from "@/hooks/use-custom-lenses";
import { useLatestPsychologySnapshot } from "@/hooks/use-psychology-snapshot";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, XCircle, Clock, ShieldAlert, Target, Gauge, Link2, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface DecisionQuestionHeaderProps {
  symbol: string;
  lens: LensValue;
  customLens?: CustomLens | null;
  confidence?: ConfidenceLevel;
  relevantCount?: number;
  messageCount?: number;
  isLoading?: boolean;
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
  'supply-chain': 'supply_chain'
};

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

function getConfidenceColor(level?: ConfidenceLevel): string {
  if (level === 'high') return "text-bullish";
  if (level === 'moderate') return "text-warning";
  return "text-muted-foreground";
}

function getTimingBadge(timing?: string) {
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
      return null;
  }
}

export function DecisionQuestionHeader({
  symbol,
  lens,
  customLens,
  confidence,
  relevantCount,
  messageCount,
  isLoading
}: DecisionQuestionHeaderProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const { data: snapshot, isLoading: snapshotLoading } = useLatestPsychologySnapshot(symbol);
  
  // Get scores from snapshot for default lenses
  const lensKey = LENS_KEY_MAP[lens];
  const readiness = snapshot?.interpretation?.decision_readiness?.[lensKey];
  const overlay = snapshot?.interpretation?.decision_overlays?.[lensKey];
  
  // For custom lenses, calculate scores from confidence
  const isCustom = !!customLens;
  const readinessScore = isCustom 
    ? (confidence === 'high' ? 75 : confidence === 'moderate' ? 55 : 35)
    : readiness?.readiness_score ?? 0;
  const riskScore = isCustom
    ? (100 - readinessScore + Math.round((Math.random() - 0.5) * 10))
    : overlay?.risk_score ?? 0;
  const confidencePercent = overlay?.confidence 
    ? Math.round(overlay.confidence * 100)
    : (confidence === 'high' ? 85 : confidence === 'moderate' ? 65 : 45);
  
  const timing = getTimingBadge(readiness?.recommended_timing);
  const decisionQuestion = getLensDecisionQuestion(lens, customLens || undefined);
  const displayName = getLensDisplayName(lens, customLens || undefined);
  
  const showScores = lens !== 'summary';
  const loading = isLoading || snapshotLoading;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      toast({
        title: "Link copied",
        description: "The shareable link has been copied to your clipboard.",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast({
        title: "Failed to copy",
        description: "Could not copy link to clipboard.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <Card className="p-4 md:p-5 glass-card mb-4 lg:mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <Skeleton className="h-6 w-2/3" />
          <div className="flex gap-3">
            <Skeleton className="h-14 w-28" />
            <Skeleton className="h-14 w-28" />
            <Skeleton className="h-14 w-28" />
          </div>
        </div>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
    >
      <Card className="p-4 md:p-5 glass-card mb-4 lg:mb-6 border-primary/10">
        {/* Question on top, badges below */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* Left: Decision Question */}
          <div className="flex-1 min-w-0">
            {/* Decision Question - First */}
            <p className="text-base md:text-lg font-medium text-foreground leading-snug text-balance mb-2">
              {decisionQuestion}
            </p>
            {/* Badges Row - Confidence, Copy Link, Timing, then Lens Name */}
            <div className="flex items-center gap-2 flex-wrap">
              {confidence && (
                <ConfidenceBadge 
                  level={confidence} 
                  context="volume" 
                  tooltipContent={`${relevantCount ?? '—'} relevant messages analyzed out of ${messageCount ?? '—'} total.`} 
                  size="sm" 
                />
              )}
              {/* Copy Link Button */}
              <Button
                variant="ghost"
                size="icon"
                onClick={handleCopyLink}
                className="h-7 w-7 text-muted-foreground hover:text-foreground shrink-0"
                title="Copy shareable link"
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5 text-bullish" />
                ) : (
                  <Link2 className="h-3.5 w-3.5" />
                )}
              </Button>
              {/* Timing Badge */}
              {timing && showScores && (
                <Badge 
                  variant={timing.variant} 
                  className={cn(
                    "text-xs px-2 py-0.5 hidden md:flex items-center gap-1 shrink-0",
                    timing.bgClass
                  )}
                >
                  <timing.icon className="h-3 w-3" />
                  {timing.label}
                </Badge>
              )}
              {/* Lens Name Badge - After Timing */}
              <Badge variant="outline" className="text-xs shrink-0">
                {displayName}
              </Badge>
            </div>
          </div>

          {/* Right: Condensed Score Tiles */}
          {showScores && (
            <div className="grid grid-cols-3 gap-2 w-full lg:flex lg:w-auto lg:items-stretch lg:gap-4 lg:shrink-0">
              {/* Readiness Score */}
              <div className="glass-tile px-3 py-2.5 lg:px-4 lg:py-3.5 rounded-xl lg:rounded-2xl lg:min-w-[120px]">
                <div className="flex items-center gap-1.5 lg:gap-2 mb-1 lg:mb-1.5">
                  <Gauge className="h-3 w-3 lg:h-3.5 lg:w-3.5 text-muted-foreground" />
                  <span className="text-[10px] lg:text-xs text-muted-foreground">Readiness</span>
                </div>
                <div className="flex items-baseline gap-0.5 lg:gap-1">
                  <span className={cn("text-xl lg:text-3xl font-display", getReadinessColor(readinessScore))}>
                    {readinessScore}
                  </span>
                  <span className="text-[10px] lg:text-xs text-muted-foreground">/100</span>
                </div>
                <div className="relative h-1 lg:h-1.5 w-full overflow-hidden rounded-full bg-secondary/50 mt-1.5 lg:mt-2">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${readinessScore}%` }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    className={cn("h-full rounded-full", getProgressColor(readinessScore))}
                  />
                </div>
              </div>

              {/* Risk Score */}
              <div className="glass-tile px-3 py-2.5 lg:px-4 lg:py-3.5 rounded-xl lg:rounded-2xl lg:min-w-[120px]">
                <div className="flex items-center gap-1.5 lg:gap-2 mb-1 lg:mb-1.5">
                  <ShieldAlert className="h-3 w-3 lg:h-3.5 lg:w-3.5 text-muted-foreground" />
                  <span className="text-[10px] lg:text-xs text-muted-foreground">Risk</span>
                </div>
                <div className="flex items-baseline gap-0.5 lg:gap-1">
                  <span className={cn("text-xl lg:text-3xl font-display", getRiskColor(riskScore))}>
                    {riskScore}
                  </span>
                  <span className="text-[10px] lg:text-xs text-muted-foreground">/100</span>
                </div>
                <div className="relative h-1 lg:h-1.5 w-full overflow-hidden rounded-full bg-secondary/50 mt-1.5 lg:mt-2">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${riskScore}%` }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    className={cn(
                      "h-full rounded-full",
                      riskScore >= 70 ? "bg-bearish" : riskScore >= 40 ? "bg-warning" : "bg-bullish"
                    )}
                  />
                </div>
              </div>

              {/* Confidence Score */}
              <div className="glass-tile px-3 py-2.5 lg:px-4 lg:py-3.5 rounded-xl lg:rounded-2xl lg:min-w-[120px]">
                <div className="flex items-center gap-1.5 lg:gap-2 mb-1 lg:mb-1.5">
                  <Target className="h-3 w-3 lg:h-3.5 lg:w-3.5 text-muted-foreground" />
                  <span className="text-[10px] lg:text-xs text-muted-foreground">Confidence</span>
                </div>
                <div className="flex items-baseline gap-0.5 lg:gap-1">
                  <span className={cn("text-xl lg:text-3xl font-display", getConfidenceColor(confidence))}>
                    {confidencePercent}
                  </span>
                  <span className="text-[10px] lg:text-xs text-muted-foreground">%</span>
                </div>
                <div className="relative h-1 lg:h-1.5 w-full overflow-hidden rounded-full bg-secondary/50 mt-1.5 lg:mt-2">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${confidencePercent}%` }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    className="h-full rounded-full bg-primary/70"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Mobile Timing Badge - Below on small screens */}
        {timing && showScores && (
          <div className="md:hidden flex justify-center mt-3">
            <Badge 
              variant={timing.variant} 
              className={cn("text-sm px-3 py-1.5", timing.bgClass)}
            >
              <timing.icon className="h-4 w-4 mr-1.5" />
              {timing.label}
            </Badge>
          </div>
        )}
      </Card>
    </motion.div>
  );
}
