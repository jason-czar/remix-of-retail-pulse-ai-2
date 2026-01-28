import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useLatestPsychologySnapshot } from "@/hooks/use-psychology-snapshot";
import { AlertTriangle, CheckCircle2, TrendingDown, TrendingUp, Minus, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { useSentimentHistory } from "@/hooks/use-sentiment-history";

interface SummaryInsightsCardProps {
  symbol: string;
}

// Helper to format volume numbers
function formatVolume(volume: number): string {
  if (volume >= 1000000) return `${(volume / 1000000).toFixed(1)}M`;
  if (volume >= 1000) return `${(volume / 1000).toFixed(1)}K`;
  return volume.toString();
}

export function SummaryInsightsCard({ symbol }: SummaryInsightsCardProps) {
  const { data: snapshot, isLoading } = useLatestPsychologySnapshot(symbol);
  const { data: sentimentHistory } = useSentimentHistory(symbol, 7);

  if (isLoading) {
    return (
      <div className="py-0 px-8 md:px-16 lg:px-24">
        <Separator className="mb-6 opacity-50" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-4">
          <Skeleton className="h-40 w-full rounded-2xl" />
          <Skeleton className="h-40 w-full rounded-2xl" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-24 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!snapshot) {
    return null;
  }

  const { interpretation, observed_state, data_confidence } = snapshot;
  const summary = interpretation.snapshot_summary;

  // Extract active signals as "Key Concerns"
  const activeSignals = Object.entries(observed_state.signals)
    .filter(([_, signal]) => signal.active)
    .map(([key]) => key.replace(/_/g, " "));

  // Extract top risks from emotions and narratives
  const topRisks: string[] = [];
  if (summary.primary_risk) {
    topRisks.push(summary.primary_risk);
  }
  // Add high-intensity bearish emotions as concerns
  const bearishEmotions = observed_state.emotions
    .filter(e => e.polarity === 'bearish' && e.intensity > 0.4)
    .slice(0, 2)
    .map(e => `High ${e.emotion.toLowerCase()} sentiment detected`);
  topRisks.push(...bearishEmotions);

  // Build recommended actions from observed state
  const recommendedActions: string[] = [];
  if (summary.action_bias) {
    recommendedActions.push(`Current bias: ${summary.action_bias}`);
  }
  // Add momentum-based recommendations
  const momentum = observed_state.momentum;
  if (momentum.overall_sentiment_velocity > 0.3) {
    recommendedActions.push("Monitor accelerating positive sentiment momentum");
  } else if (momentum.overall_sentiment_velocity < -0.3) {
    recommendedActions.push("Watch for continued sentiment deterioration");
  }
  // Add concentration-based insight
  if (observed_state.concentration.bull_bear_polarization > 0.6) {
    recommendedActions.push("High polarization - expect increased volatility");
  }

  // Get blocking narratives (bearish)
  const blockingNarratives = observed_state.narratives
    .filter(n => n.sentiment_skew < -0.2)
    .slice(0, 3)
    .map(n => n.label);

  // Get supportive narratives (bullish)
  const supportiveNarratives = observed_state.narratives
    .filter(n => n.sentiment_skew > 0.2)
    .slice(0, 3)
    .map(n => n.label);

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

  // Combine active signals and risks for key concerns
  const keyConcerns = [...activeSignals.map(s => `Active signal: ${s}`), ...topRisks].slice(0, 3);

  const hasTopCards = keyConcerns.length > 0 || recommendedActions.length > 0;
  const hasBottomCards = blockingNarratives.length > 0 || supportiveNarratives.length > 0;

  return (
    <div className="h-full py-0 px-8 md:px-16 lg:px-24">
      {/* Top Row: Key Concerns and Recommended Actions */}
      {hasTopCards && (
        <>
          <Separator className="mb-6 opacity-50" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-4 items-stretch">
            {/* Key Concerns Card */}
            {keyConcerns.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="relative overflow-hidden rounded-2xl p-5 pb-6
                  bg-card/60 dark:bg-card/40
                  border border-border/50
                  backdrop-blur-xl"
              >
                <div className="absolute top-4 right-4 flex items-center justify-center w-8 h-8 rounded-xl bg-muted">
                  <AlertTriangle className="h-4 w-4 text-warning" />
                </div>
                <div className="relative flex items-center justify-center mb-4">
                  <span className="text-base font-semibold tracking-tight">Key Concerns</span>
                </div>
                <ul className="relative space-y-3 px-3">
                  {keyConcerns.map((concern, idx) => (
                    <li
                      key={idx}
                      className="text-[15px] text-foreground/80 dark:text-foreground/75 pl-5 relative before:absolute before:left-0 before:top-[9px] before:w-2 before:h-2 before:bg-warning/70 before:rounded-full capitalize"
                    >
                      {concern}
                    </li>
                  ))}
                </ul>
              </motion.div>
            )}

            {/* Recommended Actions Card */}
            {recommendedActions.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: "easeOut", delay: 0.1 }}
                className="relative overflow-hidden rounded-2xl p-5 pb-6
                  bg-card/60 dark:bg-card/40
                  border border-border/50
                  backdrop-blur-xl"
              >
                <div className="absolute top-4 right-4 flex items-center justify-center w-8 h-8 rounded-xl bg-muted">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                </div>
                <div className="relative flex items-center justify-center mb-4">
                  <span className="text-base font-semibold tracking-tight">Market Signals</span>
                </div>
                <ul className="relative space-y-3 px-3">
                  {recommendedActions.map((action, idx) => (
                    <li
                      key={idx}
                      className="text-[15px] text-foreground/80 dark:text-foreground/75 pl-5 relative before:absolute before:left-0 before:top-[9px] before:w-2 before:h-2 before:bg-primary/70 before:rounded-full"
                    >
                      {action}
                    </li>
                  ))}
                </ul>
              </motion.div>
            )}
          </div>
        </>
      )}

      {/* Bottom Row: Blocking and Supportive Narratives */}
      {hasBottomCards && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-0">
          {/* Blocking Narratives */}
          {blockingNarratives.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: "easeOut", delay: 0.15 }}
              className="relative overflow-hidden rounded-2xl p-5 pb-6
                bg-card/60 dark:bg-card/40
                border border-border/50
                backdrop-blur-xl"
            >
              <div className="absolute top-4 right-4 flex items-center justify-center w-8 h-8 rounded-xl bg-muted">
                <TrendingDown className="h-4 w-4 text-bearish" />
              </div>
              <div className="relative flex items-center justify-center mb-4">
                <span className="text-base font-semibold tracking-tight">Bearish Narratives</span>
              </div>
              <div className="relative flex flex-wrap justify-center gap-2">
                {blockingNarratives.map((narrative, idx) => (
                  <Badge
                    key={idx}
                    variant="outline"
                    className="text-xs border-border text-bearish px-2.5 py-1 rounded-lg"
                  >
                    {narrative}
                  </Badge>
                ))}
              </div>
            </motion.div>
          )}

          {/* Supportive Narratives */}
          {supportiveNarratives.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: "easeOut", delay: 0.2 }}
              className="relative overflow-hidden rounded-2xl p-5 pb-6
                bg-card/60 dark:bg-card/40
                border border-border/50
                backdrop-blur-xl"
            >
              <div className="absolute top-4 right-4 flex items-center justify-center w-8 h-8 rounded-xl bg-muted">
                <TrendingUp className="h-4 w-4 text-bullish" />
              </div>
              <div className="relative flex items-center justify-center mb-4">
                <span className="text-base font-semibold tracking-tight">Bullish Narratives</span>
              </div>
              <div className="relative flex flex-wrap justify-center gap-2">
                {supportiveNarratives.map((narrative, idx) => (
                  <Badge
                    key={idx}
                    variant="outline"
                    className="text-xs border-border text-bullish px-2.5 py-1 rounded-lg"
                  >
                    {narrative}
                  </Badge>
                ))}
              </div>
            </motion.div>
          )}
        </div>
      )}

      {/* Quick Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-5">
        {/* Dominant Emotion */}
        {summary.dominant_emotion && (
          <motion.div
            className="glass-tile p-4 flex flex-col"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.25 }}
          >
            <span className="text-xs text-muted-foreground mb-1.5">Dominant Emotion</span>
            <p className="text-sm font-medium capitalize">{summary.dominant_emotion}</p>
          </motion.div>
        )}

        {/* Confidence */}
        <motion.div
          className="glass-tile p-4 flex flex-col"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
        >
          <span className="text-xs text-muted-foreground mb-1.5">Data Confidence</span>
          <p className="text-sm font-medium">{Math.round(data_confidence.score * 100)}%</p>
        </motion.div>

        {/* Polarization */}
        <motion.div
          className="glass-tile p-4 flex flex-col"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.35 }}
        >
          <span className="text-xs text-muted-foreground mb-1.5">Polarization</span>
          <p className="text-sm font-medium">
            {Math.round(observed_state.concentration.bull_bear_polarization * 100)}%
          </p>
        </motion.div>

        {/* 7D Trend */}
        <motion.div
          className="glass-tile p-4 flex flex-col"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.4 }}
        >
          <span className="text-xs text-muted-foreground mb-1.5">7D Trend</span>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{getTrendLabel()}</span>
            {getTrendIcon()}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
