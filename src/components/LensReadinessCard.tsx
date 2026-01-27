import { useState } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { useLatestPsychologySnapshot, DecisionReadiness, DecisionOverlay, NarrativeOutcome } from "@/hooks/use-psychology-snapshot";
import { DecisionLens, getLensDisplayName } from "@/components/DecisionLensSelector";
import { CheckCircle2, XCircle, Clock, TrendingUp, TrendingDown, Minus, RefreshCw, AlertTriangle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn, getReadinessSeverity, getRiskSeverity } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
interface LensReadinessCardProps {
  symbol: string;
  lens: DecisionLens;
  onRefresh?: () => void;
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
  return getReadinessSeverity(score).textClass;
}
function getProgressColor(score: number): string {
  return getReadinessSeverity(score).bgClass;
}
function getRiskColor(score: number): string {
  return getRiskSeverity(score).textClass;
}
export function LensReadinessCard({
  symbol,
  lens,
  onRefresh
}: LensReadinessCardProps) {
  const {
    user
  } = useAuth();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const isAdmin = user?.email === 'admin@czar.ing';
  const {
    data: snapshot,
    isLoading,
    refetch
  } = useLatestPsychologySnapshot(symbol);
  const handleRefreshSnapshot = async () => {
    setIsRefreshing(true);
    try {
      const {
        error
      } = await supabase.functions.invoke('record-psychology-snapshot', {
        body: {
          symbols: [symbol.toUpperCase()],
          periodType: 'hourly',
          forceRun: true
        }
      });
      if (error) throw error;
      toast.success(`Fresh snapshot triggered for ${symbol.toUpperCase()}`);

      // Trigger refetch after a short delay to allow snapshot to be recorded
      setTimeout(() => {
        refetch();
        onRefresh?.();
      }, 2000);
    } catch (err) {
      console.error('Failed to refresh snapshot:', err);
      toast.error('Failed to trigger snapshot refresh');
    } finally {
      setIsRefreshing(false);
    }
  };

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
  return <div className="p-4 md:p-5 h-full py-0 px-[25px]">

        {/* Top Row: Key Concerns Card (left) and Recommended Actions Card (right) */}
        {overlay && (overlay.dominant_concerns?.length > 0 || overlay.recommended_actions?.length > 0) && <>
          <Separator className="mb-6 opacity-50" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-4 items-stretch">
            {/* Key Concerns Card */}
            {overlay.dominant_concerns && overlay.dominant_concerns.length > 0 && <motion.div initial={{
          opacity: 0,
          y: 8
        }} animate={{
          opacity: 1,
          y: 0
        }} transition={{
          duration: 0.4,
          ease: "easeOut"
        }} className="relative overflow-hidden rounded-2xl p-5 pb-6
                  bg-gradient-to-br from-warning/[0.08] via-warning/[0.04] to-transparent
                  dark:from-warning/[0.12] dark:via-warning/[0.06] dark:to-transparent
                  border border-warning/20 dark:border-warning/25
                  shadow-[0_4px_24px_-4px_hsl(var(--warning)/0.15),inset_0_1px_0_hsl(0_0%_100%/0.08)]
                  dark:shadow-[0_4px_24px_-4px_hsl(var(--warning)/0.25)]
                  backdrop-blur-xl">
                {/* Subtle glow accent */}
                <div className="absolute -top-12 -right-12 w-32 h-32 bg-warning/10 dark:bg-warning/15 rounded-full blur-3xl pointer-events-none" />
                
                <div className="relative flex items-center justify-center gap-2.5 mb-4">
                  <span className="text-base font-semibold tracking-tight">Key Concerns</span>
                  <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-warning/15 dark:bg-warning/20">
                    <AlertTriangle className="h-4 w-4 text-warning" />
                  </div>
                </div>
                <ul className="relative space-y-3 px-3">
                  {overlay.dominant_concerns.slice(0, 3).map((concern, idx) => <li key={idx} className="text-[15px] text-foreground/80 dark:text-foreground/75 pl-5 relative before:absolute before:left-0 before:top-[9px] before:w-2 before:h-2 before:bg-warning/70 before:rounded-full before:shadow-[0_0_6px_hsl(var(--warning)/0.5)]">
                      {cleanNarrativeText(concern)}
                    </li>)}
                </ul>
              </motion.div>}

            {/* Recommended Actions Card */}
            {overlay.recommended_actions && overlay.recommended_actions.length > 0 && <motion.div initial={{
          opacity: 0,
          y: 8
        }} animate={{
          opacity: 1,
          y: 0
        }} transition={{
          duration: 0.4,
          ease: "easeOut",
          delay: 0.1
        }} className="relative overflow-hidden rounded-2xl p-5 pb-6
                  bg-gradient-to-br from-primary/[0.08] via-primary/[0.04] to-transparent
                  dark:from-primary/[0.12] dark:via-primary/[0.06] dark:to-transparent
                  border border-primary/20 dark:border-primary/25
                  shadow-[0_4px_24px_-4px_hsl(var(--primary)/0.15),inset_0_1px_0_hsl(0_0%_100%/0.08)]
                  dark:shadow-[0_4px_24px_-4px_hsl(var(--primary)/0.25)]
                  backdrop-blur-xl">
                {/* Subtle glow accent */}
                <div className="absolute -top-12 -right-12 w-32 h-32 bg-primary/10 dark:bg-primary/15 rounded-full blur-3xl pointer-events-none" />
                
                <div className="relative flex items-center justify-center gap-2.5 mb-4">
                  <span className="text-base font-semibold tracking-tight">Recommended Actions</span>
                  <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-primary/15 dark:bg-primary/20">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                  </div>
                </div>
                <ul className="relative space-y-3 px-3">
                  {overlay.recommended_actions.slice(0, 3).map((action, idx) => <li key={idx} className="text-[15px] text-foreground/80 dark:text-foreground/75 pl-5 relative before:absolute before:left-0 before:top-[9px] before:w-2 before:h-2 before:bg-primary/70 before:rounded-full before:shadow-[0_0_6px_hsl(var(--primary)/0.5)]">
                      {cleanNarrativeText(action)}
                    </li>)}
                </ul>
              </motion.div>}
          </div>
        </>}

        {/* Blocking and Supportive Narratives */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-0">
          {/* Blocking Narratives */}
          {readiness.blocking_narratives.length > 0 && <motion.div initial={{
        opacity: 0,
        y: 8
      }} animate={{
        opacity: 1,
        y: 0
      }} transition={{
        duration: 0.4,
        ease: "easeOut",
        delay: 0.15
      }} className="relative overflow-hidden rounded-2xl p-5 pb-6
                bg-gradient-to-br from-bearish/[0.08] via-bearish/[0.04] to-transparent
                dark:from-bearish/[0.12] dark:via-bearish/[0.06] dark:to-transparent
                border border-bearish/20 dark:border-bearish/25
                shadow-[0_4px_24px_-4px_hsl(var(--bearish)/0.15),inset_0_1px_0_hsl(0_0%_100%/0.08)]
                dark:shadow-[0_4px_24px_-4px_hsl(var(--bearish)/0.25)]
                backdrop-blur-xl">
              {/* Subtle glow accent */}
              <div className="absolute -top-12 -right-12 w-32 h-32 bg-bearish/10 dark:bg-bearish/15 rounded-full blur-3xl pointer-events-none" />
              
              <div className="relative flex items-center justify-center gap-2.5 mb-4">
                <span className="text-base font-semibold tracking-tight">Blocking</span>
                <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-bearish/15 dark:bg-bearish/20">
                  <TrendingDown className="h-4 w-4 text-bearish" />
                </div>
              </div>
              <div className="relative flex flex-wrap gap-2">
                {readiness.blocking_narratives.slice(0, 3).map((narrative, idx) => <Badge key={idx} variant="outline" className="text-xs border-bearish/40 text-bearish bg-bearish/10 px-2.5 py-1 rounded-lg">
                    {cleanNarrativeText(narrative)}
                  </Badge>)}
              </div>
            </motion.div>}

          {/* Supportive Narratives */}
          {readiness.supportive_narratives.length > 0 && <motion.div initial={{
        opacity: 0,
        y: 8
      }} animate={{
        opacity: 1,
        y: 0
      }} transition={{
        duration: 0.4,
        ease: "easeOut",
        delay: 0.2
      }} className="relative overflow-hidden rounded-2xl p-5 pb-6
                bg-gradient-to-br from-bullish/[0.08] via-bullish/[0.04] to-transparent
                dark:from-bullish/[0.12] dark:via-bullish/[0.06] dark:to-transparent
                border border-bullish/20 dark:border-bullish/25
                shadow-[0_4px_24px_-4px_hsl(var(--bullish)/0.15),inset_0_1px_0_hsl(0_0%_100%/0.08)]
                dark:shadow-[0_4px_24px_-4px_hsl(var(--bullish)/0.25)]
                backdrop-blur-xl">
              {/* Subtle glow accent */}
              <div className="absolute -top-12 -right-12 w-32 h-32 bg-bullish/10 dark:bg-bullish/15 rounded-full blur-3xl pointer-events-none" />
              
              <div className="relative flex items-center justify-center gap-2.5 mb-4">
                <span className="text-base font-semibold tracking-tight">Supportive</span>
                <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-bullish/15 dark:bg-bullish/20">
                  <TrendingUp className="h-4 w-4 text-bullish" />
                </div>
              </div>
              <div className="relative flex flex-wrap gap-2">
                {readiness.supportive_narratives.slice(0, 3).map((narrative, idx) => <Badge key={idx} variant="outline" className="text-xs border-bullish/40 text-bullish bg-bullish/10 px-2.5 py-1 rounded-lg">
                    {cleanNarrativeText(narrative)}
                  </Badge>)}
              </div>
            </motion.div>}
        </div>

        {/* Delay recommendation */}
        {readiness.recommended_delay && readiness.recommended_delay !== "None" && <p className="text-xs text-muted-foreground italic my-[22px] mb-0 mt-[17px]">
            Recommended delay: {readiness.recommended_delay}
          </p>}

      {/* Admin-only refresh button */}
      {isAdmin && <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t border-border/30">
          {/* Fallback indicator - check if concerns follow the fallback pattern */}
          {overlay?.dominant_concerns?.some(c => c.startsWith("Retail discussion centers on")) && <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1.5 text-xs text-warning/80">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  <span>Fallback</span>
                </div>
              </TooltipTrigger>
              <TooltipContent side="left">
                <p className="text-xs">AI generation failed — using fallback data</p>
              </TooltipContent>
            </Tooltip>}
          <Button variant="ghost" size="sm" onClick={handleRefreshSnapshot} disabled={isRefreshing} className="text-xs text-muted-foreground hover:text-foreground gap-1.5">
            <RefreshCw className={cn("h-3.5 w-3.5", isRefreshing && "animate-spin")} />
            {isRefreshing ? "Refreshing..." : "Refresh Snapshot"}
          </Button>
        </div>}
    </div>;
}