import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfidenceBadge, ConfidenceLevel } from "@/components/ui/ConfidenceBadge";
import { useSymbolStats } from "@/hooks/use-stocktwits";
import { useSentimentHistory } from "@/hooks/use-sentiment-history";
import { useLatestPsychologySnapshot } from "@/hooks/use-psychology-snapshot";
import { TrendingUp, TrendingDown, Minus, ArrowUpRight, ArrowDownRight, RefreshCw, Link2, Check, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useState, ReactNode } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";

interface SummaryInsightsCardProps {
  symbol: string;
  confidence?: ConfidenceLevel;
  relevantCount?: number;
  messageCount?: number;
  isLoading?: boolean;
  isRegenerating?: boolean;
  isFetching?: boolean;
  isAdmin?: boolean;
  onRegenerate?: () => void;
  children?: ReactNode;
}

export function SummaryInsightsCard({
  symbol,
  confidence,
  relevantCount,
  messageCount,
  isLoading,
  isRegenerating,
  isFetching,
  isAdmin,
  onRegenerate,
  children
}: SummaryInsightsCardProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const { data: symbolStats, isLoading: statsLoading } = useSymbolStats(symbol);
  const { data: sentimentHistory, isLoading: historyLoading } = useSentimentHistory(symbol, 7);
  const { data: snapshot, isLoading: snapshotLoading } = useLatestPsychologySnapshot(symbol);

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

  // Active signals from psychology snapshot
  const activeSignals = snapshot?.observed_state?.signals
    ? Object.entries(snapshot.observed_state.signals)
        .filter(([_, signal]) => signal.active)
        .map(([key]) => key.replace(/_/g, " "))
    : [];

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

  const loading = isLoading || statsLoading || historyLoading || snapshotLoading;

  if (loading && !children) {
    return (
      <div className="p-5 md:p-6" data-tour="intelligence-summary">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
          <div className="flex-1">
            <Skeleton className="h-6 w-2/3 mb-3" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-5 w-16" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 lg:gap-4">
            <Skeleton className="h-20 w-full lg:w-28" />
            <Skeleton className="h-20 w-full lg:w-28" />
            <Skeleton className="h-20 w-full lg:w-28" />
          </div>
        </div>
        <div className="mt-5 pt-5 border-t border-border/30">
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="p-5 md:p-6"
      data-tour="intelligence-summary"
    >
      {/* Header: Question + Score Tiles */}
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 lg:gap-6">
        {/* Left: Decision Question */}
        <div className="flex-1 min-w-0">
          {/* Decision Question */}
          <h2 className="text-lg md:text-xl font-semibold text-foreground leading-snug text-balance mb-3">
            What is the current psychological state of retail investors?
          </h2>
          {/* Badges Row */}
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
            {/* Regenerate Button - Admin only */}
            {isAdmin && onRegenerate && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={onRegenerate} 
                    disabled={isRegenerating || isLoading || isFetching} 
                    className="h-7 px-2 text-muted-foreground hover:text-foreground"
                  >
                    <RefreshCw className={cn("h-3.5 w-3.5", (isRegenerating || isFetching) && "animate-spin")} />
                    <span className="ml-1.5 text-xs">Regenerate</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Generate a fresh analysis</p>
                </TooltipContent>
              </Tooltip>
            )}
            {/* Lens Name Badge */}
            <Badge variant="outline" className="text-xs shrink-0">
              Summary
            </Badge>
          </div>

          {/* Active Signals Row */}
          {activeSignals.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
              className="flex items-center gap-3 flex-wrap mt-3 pt-3 border-t border-border/30"
            >
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
            </motion.div>
          )}
        </div>

        {/* Right: Score Tiles */}
        <div className="grid grid-cols-3 gap-2 w-full lg:flex lg:w-auto lg:items-stretch lg:gap-4 lg:shrink-0">
          {/* Sentiment Score */}
          <motion.div 
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="relative overflow-hidden px-3 py-2.5 lg:px-4 lg:py-3.5 rounded-xl lg:rounded-2xl lg:min-w-[120px] backdrop-blur-xl border border-border/50 bg-card/60 dark:bg-card/40"
          >
            <div className="relative mb-1 lg:mb-1.5">
              <span className="text-[10px] lg:text-xs text-muted-foreground font-medium">Sentiment Score</span>
            </div>
            <div className="relative flex items-center gap-1.5 lg:gap-2">
              <span className="text-xl lg:text-3xl font-display font-semibold text-foreground">
                {symbolStats?.sentiment ?? '--'}
              </span>
              {sentimentIsPositive ? (
                <TrendingUp className="h-4 w-4 lg:h-5 lg:w-5 text-bullish" />
              ) : (
                <TrendingDown className="h-4 w-4 lg:h-5 lg:w-5 text-bearish" />
              )}
            </div>
            <div className="relative flex items-center gap-1 mt-1 lg:mt-1.5">
              {sentimentIsPositive ? (
                <ArrowUpRight className="h-3 w-3 text-bullish" />
              ) : (
                <ArrowDownRight className="h-3 w-3 text-bearish" />
              )}
              <span className={cn("text-xs", sentimentIsPositive ? 'text-bullish' : 'text-bearish')}>
                {Math.abs(sentimentChange).toFixed(1)}%
              </span>
            </div>
          </motion.div>

          {/* Message Volume */}
          <motion.div 
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.15 }}
            className="relative overflow-hidden px-3 py-2.5 lg:px-4 lg:py-3.5 rounded-xl lg:rounded-2xl lg:min-w-[120px] backdrop-blur-xl border border-border/50 bg-card/60 dark:bg-card/40"
          >
            <div className="relative mb-1 lg:mb-1.5">
              <span className="text-[10px] lg:text-xs text-muted-foreground font-medium">Message Volume</span>
            </div>
            <div className="relative">
              <span className="text-xl lg:text-3xl font-display font-semibold text-foreground">
                {symbolStats?.volume ?? '--'}
              </span>
            </div>
            <div className="relative flex items-center gap-1 mt-1 lg:mt-1.5">
              {volumeIsPositive ? (
                <ArrowUpRight className="h-3 w-3 text-bullish" />
              ) : (
                <ArrowDownRight className="h-3 w-3 text-bearish" />
              )}
              <span className={cn("text-xs", volumeIsPositive ? 'text-bullish' : 'text-bearish')}>
                {Math.abs(volumeChange).toFixed(0)}% (24h)
              </span>
            </div>
          </motion.div>

          {/* 7D Trend */}
          <motion.div 
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            className="relative overflow-hidden px-3 py-2.5 lg:px-4 lg:py-3.5 rounded-xl lg:rounded-2xl lg:min-w-[120px] backdrop-blur-xl border border-border/50 bg-card/60 dark:bg-card/40"
          >
            <div className="relative mb-1 lg:mb-1.5">
              <span className="text-[10px] lg:text-xs text-muted-foreground font-medium">7D Trend</span>
            </div>
            <div className="relative flex items-center gap-2">
              <span className="text-xl lg:text-3xl font-display font-semibold text-foreground">
                {getTrendLabel()}
              </span>
              {getTrendIcon()}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Summary content */}
      {children && (
        <div className="mt-5 pt-5 border-t border-border/30">
          {isLoading || isRegenerating ? (
            <div className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-[95%]" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          ) : (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            >
              {children}
            </motion.div>
          )}
        </div>
      )}
    </motion.div>
  );
}
