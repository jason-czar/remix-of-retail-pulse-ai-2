import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { Info } from "lucide-react";

export type ConfidenceLevel = "high" | "moderate" | "experimental";

interface ConfidenceBadgeProps {
  level: ConfidenceLevel;
  showTooltip?: boolean;
  tooltipContent?: string;
  className?: string;
  size?: "sm" | "md";
  count?: number; // Optional count prefix (e.g., "3 High")
  context?: ConfidenceContext; // Determines tooltip explanation context
}

// Context types for more specific tooltip explanations
export type ConfidenceContext = 
  | "volume"      // Message volume-based confidence
  | "episodes"    // Historical episode count-based
  | "coherence"   // Narrative coherence analysis
  | "match"       // Pattern/similarity matching
  | "general";    // Default general explanation

const CONFIDENCE_CONFIG: Record<ConfidenceLevel, {
  label: string;
  bg: string;
  text: string;
  border: string;
  defaultTooltip: string;
  contextTooltips: Record<ConfidenceContext, string>;
}> = {
  high: {
    label: "High",
    bg: "bg-bullish/20",
    text: "text-bullish",
    border: "border-bullish/30",
    defaultTooltip: "Strong signal: 70%+ relevant data with consistent patterns across sources.",
    contextTooltips: {
      volume: "High message volume (70%+ relevant) with diverse author participation.",
      episodes: "10+ historical episodes observed, providing statistically meaningful patterns.",
      coherence: "Strong narrative focus with low entropy and stable emotion alignment.",
      match: "Strong pattern match: 3+ matching narratives and emotions with 70%+ similarity.",
      general: "Strong signal: 70%+ relevant data with consistent patterns across sources.",
    },
  },
  moderate: {
    label: "Moderate",
    bg: "bg-amber-500/20",
    text: "text-amber-400",
    border: "border-amber-500/30",
    defaultTooltip: "Reasonable signal: 40-70% data coverage. Cross-reference with other sources.",
    contextTooltips: {
      volume: "Moderate message volume (40-70% relevant). Consider additional data sources.",
      episodes: "5-9 historical episodes observed. Patterns are indicative but not conclusive.",
      coherence: "Mixed narrative signals with moderate consistency across timeframes.",
      match: "Partial pattern match: some overlapping signals but incomplete alignment.",
      general: "Reasonable signal: 40-70% data coverage. Cross-reference with other sources.",
    },
  },
  experimental: {
    label: "Experimental",
    bg: "bg-purple-500/20",
    text: "text-purple-400",
    border: "border-purple-500/30",
    defaultTooltip: "Limited data: <40% coverage. Directional only, not actionable.",
    contextTooltips: {
      volume: "Low message volume (<40% relevant). Treat as directional signal only.",
      episodes: "Fewer than 5 episodes observed. Insufficient data for reliable patterns.",
      coherence: "High narrative fragmentation or unstable signals across timeframes.",
      match: "Weak pattern match: limited overlapping data points.",
      general: "Limited data: <40% coverage. Directional only, not actionable.",
    },
  },
};

export function getConfidenceLevel(score: number, episodeCount?: number): ConfidenceLevel {
  // If we have episode count, use that for historical data confidence
  if (episodeCount !== undefined) {
    if (episodeCount >= 10) return "high";
    if (episodeCount >= 5) return "moderate";
    return "experimental";
  }
  
  // Otherwise use numeric score (0-1 or 0-100)
  const normalizedScore = score > 1 ? score / 100 : score;
  if (normalizedScore >= 0.7) return "high";
  if (normalizedScore >= 0.4) return "moderate";
  return "experimental";
}

export function ConfidenceBadge({
  level,
  showTooltip = true,
  tooltipContent,
  className,
  size = "sm",
  count,
  context = "general",
}: ConfidenceBadgeProps) {
  const config = CONFIDENCE_CONFIG[level];
  const sizeClasses = size === "sm" ? "text-[10px]" : "text-xs";
  
  // Determine tooltip text: custom > context-specific > default
  const resolvedTooltip = tooltipContent || config.contextTooltips[context] || config.defaultTooltip;
  
  const badge = (
    <Badge
      variant="outline"
      className={cn(
        config.bg,
        config.text,
        config.border,
        sizeClasses,
        "gap-1",
        className
      )}
    >
      {count !== undefined && <span>{count}</span>}
      {config.label}
      {showTooltip && <Info className="h-2.5 w-2.5 opacity-70" />}
    </Badge>
  );
  
  if (!showTooltip) return badge;
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{badge}</TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <p className="text-xs">{resolvedTooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Utility component showing confidence drivers
interface ConfidenceDriversProps {
  drivers: {
    volume_percentile?: number;
    author_breadth?: number;
    narrative_coherence?: number;
    temporal_stability?: number;
    episode_count?: number;
  };
  className?: string;
}

export function ConfidenceDrivers({ drivers, className }: ConfidenceDriversProps) {
  const items = [
    { label: "Volume", value: drivers.volume_percentile, format: (v: number) => `${Math.round(v * 100)}%` },
    { label: "Author Diversity", value: drivers.author_breadth, format: (v: number) => `${Math.round(v * 100)}%` },
    { label: "Narrative Focus", value: drivers.narrative_coherence, format: (v: number) => `${Math.round(v * 100)}%` },
    { label: "Stability", value: drivers.temporal_stability, format: (v: number) => `${Math.round(v * 100)}%` },
    { label: "Episodes", value: drivers.episode_count, format: (v: number) => `${v}` },
  ].filter(item => item.value !== undefined);
  
  return (
    <div className={cn("flex flex-wrap gap-2 text-[10px] text-muted-foreground", className)}>
      {items.map(({ label, value, format }) => (
        <span key={label} className="flex items-center gap-1">
          <span className="opacity-70">{label}:</span>
          <span className="font-medium">{format(value!)}</span>
        </span>
      ))}
    </div>
  );
}
