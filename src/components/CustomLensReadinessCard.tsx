import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CustomLens } from "@/hooks/use-custom-lenses";
import { LensSummaryData } from "@/hooks/use-decision-lens-summary";
import { CheckCircle2, XCircle, Clock, TrendingUp, TrendingDown, AlertCircle, Lightbulb, Target } from "lucide-react";
import { cn } from "@/lib/utils";

interface CustomLensReadinessCardProps {
  customLens: CustomLens;
  summaryData?: LensSummaryData | null;
  isLoading?: boolean;
}

function getReadinessScore(summaryData?: LensSummaryData | null): number {
  if (!summaryData) return 50;
  
  // Calculate based on confidence and dominant theme share
  const confidenceScore = summaryData.confidence === 'high' ? 80 : 
                         summaryData.confidence === 'moderate' ? 60 : 40;
  
  const themeShare = summaryData.dominantThemeShare || 0.5;
  const relevantRatio = summaryData.relevantCount && summaryData.messageCount 
    ? summaryData.relevantCount / summaryData.messageCount 
    : 0.5;
  
  // Weighted average
  return Math.round(confidenceScore * 0.5 + themeShare * 100 * 0.25 + relevantRatio * 100 * 0.25);
}

function getRiskScore(summaryData?: LensSummaryData | null): number {
  // Inverse of readiness with some variance
  const readiness = getReadinessScore(summaryData);
  return Math.max(10, Math.min(90, 100 - readiness + Math.round((Math.random() - 0.5) * 10)));
}

function getTimingRecommendation(readiness: number): { 
  icon: typeof CheckCircle2; 
  label: string; 
  variant: "bullish" | "neutral" | "bearish"; 
  bgClass: string;
} {
  if (readiness >= 65) {
    return {
      icon: CheckCircle2,
      label: "Proceed",
      variant: "bullish",
      bgClass: "bg-bullish/10 border-bullish/30"
    };
  } else if (readiness >= 40) {
    return {
      icon: Clock,
      label: "Monitor",
      variant: "neutral",
      bgClass: "bg-warning/10 border-warning/30"
    };
  }
  return {
    icon: XCircle,
    label: "Caution",
    variant: "bearish",
    bgClass: "bg-bearish/10 border-bearish/30"
  };
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

// Extract concerns from summary text
function extractConcerns(summary: string, exclusions: string[]): string[] {
  // Look for tension/risk indicators in the summary
  const concerns: string[] = [];
  
  // Add exclusions as potential concerns to monitor
  exclusions.slice(0, 2).forEach(exclusion => {
    concerns.push(`Monitor for ${exclusion.toLowerCase()} developments`);
  });
  
  // Generic concern based on confidence
  concerns.push("Data coverage may not capture all relevant discussions");
  
  return concerns.slice(0, 3);
}

// Generate recommended actions based on focus areas
function generateActions(focusAreas: string[], decisionQuestion: string): string[] {
  const actions: string[] = [];
  
  focusAreas.slice(0, 2).forEach(area => {
    actions.push(`Continue monitoring ${area.toLowerCase()} sentiment trends`);
  });
  
  actions.push("Cross-reference with other decision lenses for validation");
  
  return actions.slice(0, 3);
}

export function CustomLensReadinessCard({
  customLens,
  summaryData,
  isLoading
}: CustomLensReadinessCardProps) {
  const readinessScore = getReadinessScore(summaryData);
  const riskScore = getRiskScore(summaryData);
  const timing = getTimingRecommendation(readinessScore);
  const TimingIcon = timing.icon;
  
  const concerns = extractConcerns(summaryData?.summary || "", customLens.exclusions);
  const actions = generateActions(customLens.focus_areas, customLens.decision_question);
  
  // Calculate confidence percentage
  const confidencePercent = summaryData?.confidence === 'high' ? 85 : 
                            summaryData?.confidence === 'moderate' ? 65 : 45;

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

  return (
    <Card className="p-4 md:p-5 glass-card h-full border-primary/10">
      {/* Header with lens name and timing badge */}
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-semibold text-sm md:text-base">
          {customLens.name} Readiness
        </h4>
        <Badge variant={timing.variant} className={cn("text-xs px-2.5 py-0.5", timing.bgClass)}>
          <TimingIcon className="h-3 w-3 mr-1" />
          {timing.label}
        </Badge>
      </div>

      {/* Two-column layout - 35/65 split */}
      <div className="grid grid-cols-1 md:grid-cols-[7fr_13fr] gap-4 md:gap-6">
        {/* Left Column: Readiness Score + Focus Areas (35%) */}
        <div className="flex flex-col min-w-0">
          {/* Readiness Score with progress bar */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-muted-foreground">Readiness Score</span>
              <span className={cn("text-xl font-display", getReadinessColor(readinessScore))}>
                {readinessScore}
              </span>
            </div>
            <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary/50">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${readinessScore}%` }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className={cn("h-full rounded-full", getProgressColor(readinessScore))}
              />
            </div>
          </div>

          {/* Focus Areas as Supportive */}
          {customLens.focus_areas.length > 0 && (
            <div className="p-3 rounded-lg border border-bullish/20 bg-transparent mt-4">
              <div className="flex items-center gap-1.5 mb-2">
                <TrendingUp className="h-3.5 w-3.5 text-bullish" />
                <span className="text-xs font-medium text-bullish">Focus Areas</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {customLens.focus_areas.slice(0, 3).map((area, idx) => (
                  <Badge
                    key={idx}
                    variant="outline"
                    className="text-[10px] border-bullish/40 text-bullish bg-bullish/10 px-2 py-0"
                  >
                    {area}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Exclusions as Blocking */}
          {customLens.exclusions.length > 0 && (
            <div className="p-3 rounded-lg border border-bearish/20 bg-transparent mt-3">
              <div className="flex items-center gap-1.5 mb-2">
                <TrendingDown className="h-3.5 w-3.5 text-bearish" />
                <span className="text-xs font-medium text-bearish">Exclusions</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {customLens.exclusions.slice(0, 3).map((exclusion, idx) => (
                  <Badge
                    key={idx}
                    variant="outline"
                    className="text-[10px] border-bearish/40 text-bearish bg-bearish/10 px-2 py-0"
                  >
                    {exclusion}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Confidence footer - at bottom of left column */}
          <div className="pt-3 mt-auto">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground">Confidence</span>
              <span className="text-xs font-medium">{confidencePercent}%</span>
            </div>
            <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-secondary/50">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${confidencePercent}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="h-full rounded-full bg-primary/70"
              />
            </div>
          </div>
        </div>

        {/* Right Column: Risk, Concerns, Actions (65%) */}
        <div className="md:border-l md:border-border/40 md:pl-6 space-y-4 min-w-0">
          {/* Risk Score - inline header */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Risk Score</span>
            <span className={cn("text-xl font-semibold", getRiskColor(riskScore))}>
              {riskScore}/100
            </span>
          </div>

          {/* Key Concerns - compact */}
          {concerns.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2.5">
                <AlertCircle className="h-4 w-4 text-warning" />
                <span className="text-sm font-medium">Key Concerns</span>
              </div>
              <ul className="space-y-1.5">
                {concerns.map((concern, idx) => (
                  <li
                    key={idx}
                    className="text-[13px] text-muted-foreground pl-4 relative before:absolute before:left-0 before:top-[7px] before:w-1.5 before:h-1.5 before:bg-warning/60 before:rounded-full"
                  >
                    {concern}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Recommended Actions - compact */}
          {actions.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2.5">
                <Lightbulb className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Recommended Actions</span>
              </div>
              <ul className="space-y-1.5">
                {actions.map((action, idx) => (
                  <li
                    key={idx}
                    className="text-[13px] text-muted-foreground pl-4 relative before:absolute before:left-0 before:top-[7px] before:w-1.5 before:h-1.5 before:bg-primary/60 before:rounded-full"
                  >
                    {action}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
