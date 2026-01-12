import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useSentimentHistory } from "@/hooks/use-sentiment-history";

interface SentimentMomentumBadgeProps {
  symbol: string;
  days?: number;
  showLabel?: boolean;
}

export function SentimentMomentumBadge({
  symbol,
  days = 7,
  showLabel = false,
}: SentimentMomentumBadgeProps) {
  const { data, isLoading } = useSentimentHistory(symbol, days);

  if (isLoading || !data) {
    return null;
  }

  const { momentum } = data;

  if (momentum.trend === "insufficient data") {
    return null;
  }

  const Icon =
    momentum.direction === "bullish"
      ? TrendingUp
      : momentum.direction === "bearish"
      ? TrendingDown
      : Minus;

  const variant =
    momentum.direction === "bullish"
      ? "bullish"
      : momentum.direction === "bearish"
      ? "bearish"
      : "neutral";

  const changeText =
    momentum.change > 0 ? `+${momentum.change}` : momentum.change.toString();

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge variant={variant} className="gap-1 cursor-help">
          <Icon className="h-3 w-3" />
          {showLabel && <span>{changeText}</span>}
        </Badge>
      </TooltipTrigger>
      <TooltipContent>
        <div className="text-sm">
          <p className="font-medium capitalize">{momentum.trend} Trend</p>
          <p className="text-muted-foreground">
            {days}D change: {changeText} pts
            {momentum.percentChange !== undefined && (
              <span> ({momentum.percentChange > 0 ? "+" : ""}{momentum.percentChange}%)</span>
            )}
          </p>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}