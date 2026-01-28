import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useLatestPsychologySnapshot } from "@/hooks/use-psychology-snapshot";
import { useSymbolStats } from "@/hooks/use-stocktwits";
import { useSentimentHistory } from "@/hooks/use-sentiment-history";
import { AlertTriangle, TrendingUp, TrendingDown, Minus, ArrowUpRight, ArrowDownRight, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useSearchParams } from "react-router-dom";

interface PsychologyOverviewCardProps {
  symbol: string;
  hideMetricTiles?: boolean; // Hide Sentiment Score, Message Volume, 7D Trend tiles
}

const glassCardClasses = cn(
  "rounded-2xl p-4 md:p-5 h-full",
  "bg-white/60 dark:bg-[hsl(0_0%_12%/0.55)]",
  "backdrop-blur-[28px] backdrop-saturate-[140%]",
  "border border-black/[0.08] dark:border-white/[0.06]",
  "shadow-[0_8px_32px_rgba(0,0,0,0.04),0_2px_8px_rgba(0,0,0,0.02)]"
);

const glassTileClasses = cn(
  "rounded-xl p-4 flex flex-col",
  "bg-white/45 dark:bg-white/[0.04]",
  "backdrop-blur-[12px] backdrop-saturate-[120%]",
  "border border-black/[0.06] dark:border-white/[0.04]"
);

export function PsychologyOverviewCard({ symbol, hideMetricTiles = false }: PsychologyOverviewCardProps) {
  const [, setSearchParams] = useSearchParams();
  const { data: snapshot, isLoading } = useLatestPsychologySnapshot(symbol);
  const { data: symbolStats } = useSymbolStats(symbol);
  const { data: sentimentHistory } = useSentimentHistory(symbol, 7);

  const handleNavigateToLens = () => {
    setSearchParams({ lens: 'corporate-strategy' });
  };
  if (isLoading) {
    return (
      <div className={glassCardClasses}>
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
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!snapshot) {
    return (
      <div className={glassCardClasses}>
        <p className="text-sm text-muted-foreground">No psychology data available.</p>
      </div>
    );
  }

  const { interpretation, data_confidence, observed_state } = snapshot;
  const summary = interpretation.snapshot_summary;

  // Count active signals
  const activeSignals = Object.entries(observed_state.signals)
    .filter(([_, signal]) => signal.active)
    .map(([key]) => key.replace(/_/g, " "));

  // Sentiment change helpers
  const sentimentChange = symbolStats?.sentimentChange || 0;
  const sentimentIsPositive = sentimentChange >= 0;
  
  // Volume change helpers
  const volumeChange = symbolStats?.volumeChange || 0;
  const volumeIsPositive = volumeChange >= 0;

  // 7D Trend helper
  const trendDirection = sentimentHistory?.momentum?.direction;
  const getTrendLabel = () => {
    if (trendDirection === 'bullish') return 'Rising';
    if (trendDirection === 'bearish') return 'Falling';
    return 'Stable';
  };
  const getTrendIcon = () => {
    if (trendDirection === 'bullish') return <TrendingUp className="h-4 w-4 text-bullish" />;
    if (trendDirection === 'bearish') return <TrendingDown className="h-4 w-4 text-bearish" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  return (
    <div className={glassCardClasses}>
      <div className="flex flex-col">
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
          <div className="mb-3 pb-2.5 border-b border-border/50 flex items-center gap-3 flex-wrap">
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

        {/* Top row - 2 tiles */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          {summary.dominant_emotion && (
            <motion.div 
              className={glassTileClasses}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.05 }}
            >
              <span className="text-xs text-muted-foreground mb-1.5">
                Dominant Emotion
              </span>
              <p className="text-sm font-medium capitalize">{summary.dominant_emotion}</p>
            </motion.div>
          )}
          {summary.primary_risk && (
            <motion.div 
              className={glassTileClasses}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
            >
              <span className="text-xs text-muted-foreground mb-1.5">
                Primary Risk
              </span>
              <p className="text-sm font-medium">{summary.primary_risk}</p>
            </motion.div>
          )}
        </div>

        {/* Bottom row - 3 tiles (hidden when hideMetricTiles is true) */}
        {!hideMetricTiles && (
          <div className="grid grid-cols-3 gap-3">
            {/* Sentiment Score tile */}
            <motion.div 
              className={glassTileClasses}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.15 }}
            >
              <span className="text-xs text-muted-foreground mb-1.5">
                Sentiment Score
              </span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{symbolStats?.sentiment ?? '--'}</span>
                {sentimentIsPositive ? (
                  <TrendingUp className="h-4 w-4 text-bullish" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-bearish" />
                )}
              </div>
              <div className="flex items-center gap-1 mt-1">
                {sentimentIsPositive ? (
                  <ArrowUpRight className="h-3 w-3 text-bullish" />
                ) : (
                  <ArrowDownRight className="h-3 w-3 text-bearish" />
                )}
                <span className={`text-xs ${sentimentIsPositive ? 'text-bullish' : 'text-bearish'}`}>
                  {Math.abs(sentimentChange).toFixed(1)}%
                </span>
              </div>
            </motion.div>

            {/* Message Volume tile */}
            <motion.div 
              className={glassTileClasses}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.2 }}
            >
              <span className="text-xs text-muted-foreground mb-1.5">
                Message Volume
              </span>
              <span className="text-sm font-medium">{symbolStats?.volume ?? '--'}</span>
              <div className="flex items-center gap-1 mt-1">
                {volumeIsPositive ? (
                  <ArrowUpRight className="h-3 w-3 text-bullish" />
                ) : (
                  <ArrowDownRight className="h-3 w-3 text-bearish" />
                )}
                <span className={`text-xs ${volumeIsPositive ? 'text-bullish' : 'text-bearish'}`}>
                  {Math.abs(volumeChange).toFixed(0)}% (24h)
                </span>
              </div>
            </motion.div>

            {/* 7D Trend tile */}
            <motion.div 
              className={glassTileClasses}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.25 }}
            >
              <span className="text-xs text-muted-foreground mb-1.5">
                7D Trend
              </span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{getTrendLabel()}</span>
                {getTrendIcon()}
              </div>
            </motion.div>
          </div>
        )}

        {/* Continue to Decision Lens navigation */}
        <motion.button
          onClick={handleNavigateToLens}
          className="mt-4 pt-4 border-t border-border/30 w-full flex items-center justify-between group cursor-pointer"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.3 }}
        >
          <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
            Continue to Decision Lens: <span className="font-medium text-foreground">Corporate Strategy</span>
          </span>
          <div className="flex items-center justify-center h-8 w-8 rounded-full bg-white/50 dark:bg-white/[0.08] backdrop-blur-sm border border-black/[0.06] dark:border-white/[0.08] group-hover:bg-primary/10 group-hover:border-primary/20 transition-all">
            <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
        </motion.button>
      </div>
    </div>
  );
}
