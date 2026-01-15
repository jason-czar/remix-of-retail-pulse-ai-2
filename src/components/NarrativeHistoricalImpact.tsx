import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { NarrativeOutcome } from "@/hooks/use-psychology-snapshot";
import { ConfidenceBadge } from "@/components/ui/ConfidenceBadge";
import { FlaskConical, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

interface NarrativeHistoricalImpactProps {
  outcome: NarrativeOutcome;
  compact?: boolean; // For inline display in lens cards
}

function formatPercent(value: number | null): string {
  if (value === null) return "N/A";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

function getMoveColor(value: number | null): string {
  if (value === null) return "text-muted-foreground";
  return value > 0 ? "text-bullish" : value < 0 ? "text-bearish" : "text-muted-foreground";
}

export function NarrativeHistoricalImpact({ outcome, compact = false }: NarrativeHistoricalImpactProps) {
  const { historical_outcomes, confidence_label, label } = outcome;
  const { episode_count, avg_price_move_10d, median_price_move_10d, win_rate_10d, p25_price_move_10d, p75_price_move_10d } = historical_outcomes;
  
  const isExperimental = episode_count < 5;

  // Compact version for lens cards
  if (compact) {
    if (isExperimental) {
      return null; // Don't show in compact mode if experimental
    }

    const displayMove = median_price_move_10d ?? avg_price_move_10d;
    const moveStr = formatPercent(displayMove);
    
    // Confidence-aware language
    const language = confidence_label === "high" 
      ? `typical 10D move was ${moveStr}`
      : `historically associated with ${moveStr} moves`;

    return (
      <div className="flex items-start gap-2 pt-3 mt-3 border-t border-border/30 text-xs">
        <BarChart3 className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <span className="text-muted-foreground">
            When "{label}" dominated ({episode_count} episodes), {language}
          </span>
          <ConfidenceBadge 
            level={confidence_label} 
            className="ml-2"
            tooltipContent={`${episode_count} historical episodes analyzed`}
          />
        </div>
      </div>
    );
  }

  // Full version for narrative detail expansion
  return (
    <div className="mt-3 p-3 rounded-lg bg-secondary/50 border border-border/50">
      <div className="flex items-center gap-2 mb-2">
        {isExperimental ? (
          <FlaskConical className="h-4 w-4 text-purple-400" />
        ) : (
          <BarChart3 className="h-4 w-4 text-primary" />
        )}
        <span className="text-xs font-medium">Historical Impact</span>
      </div>

      {isExperimental ? (
        // Experimental state - not enough data
        <div className="flex items-center gap-2">
          <ConfidenceBadge 
            level="experimental"
            tooltipContent={`Only ${episode_count} episode${episode_count !== 1 ? "s" : ""} observed. Need 5+ for reliable analysis.`}
          />
          <span className="text-xs text-muted-foreground">
            {episode_count} episode{episode_count !== 1 ? "s" : ""} (5 required for analysis)
          </span>
        </div>
      ) : (
        // Full metrics
        <div className="space-y-2">
          {/* Confidence Badge and Episode Count */}
          <div className="flex items-center gap-2">
            <ConfidenceBadge 
              level={confidence_label}
              tooltipContent={`Based on ${episode_count} historical episodes`}
            />
            <span className="text-xs text-muted-foreground">
              {episode_count} episodes
            </span>
          </div>

          {/* Main Metrics */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
            {/* Typical Move */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Typical 10D Move:</span>
                    <span className={cn("font-medium", getMoveColor(median_price_move_10d))}>
                      {formatPercent(median_price_move_10d)}
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Median price change 10 trading days after narrative dominance</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Win Rate */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Win Rate:</span>
                    <span className={cn("font-medium", win_rate_10d && win_rate_10d > 50 ? "text-bullish" : "text-bearish")}>
                      {win_rate_10d !== null ? `${win_rate_10d}%` : "N/A"}
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Percentage of episodes with positive 10D returns</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Range */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center justify-between col-span-2">
                    <span className="text-muted-foreground">Range (25th-75th):</span>
                    <span className="font-medium">
                      <span className={getMoveColor(p25_price_move_10d)}>{formatPercent(p25_price_move_10d)}</span>
                      <span className="text-muted-foreground mx-1">to</span>
                      <span className={getMoveColor(p75_price_move_10d)}>{formatPercent(p75_price_move_10d)}</span>
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Interquartile range of outcomes - shows dispersion</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          {/* Descriptive Context */}
          <p className="text-[11px] text-muted-foreground italic pt-1 border-t border-border/30">
            {confidence_label === "high" 
              ? "Historically associated with consistent directional outcomes."
              : confidence_label === "moderate"
              ? "Outcomes have been variable - use as directional context only."
              : "Limited historical data - treat as emerging pattern."}
          </p>
        </div>
      )}
    </div>
  );
}

// Helper component for lens cards - shows the top narrative outcome with historical context
export function NarrativeImpactSummary({ 
  outcomes, 
  maxDisplay = 1 
}: { 
  outcomes: NarrativeOutcome[]; 
  maxDisplay?: number;
}) {
  // Filter to outcomes with enough data for display
  const displayableOutcomes = outcomes
    .filter(o => o.historical_outcomes.episode_count >= 5)
    .slice(0, maxDisplay);

  if (displayableOutcomes.length === 0) {
    return null;
  }

  return (
    <>
      {displayableOutcomes.map((outcome) => (
        <NarrativeHistoricalImpact 
          key={outcome.narrative_id} 
          outcome={outcome} 
          compact={true} 
        />
      ))}
    </>
  );
}
