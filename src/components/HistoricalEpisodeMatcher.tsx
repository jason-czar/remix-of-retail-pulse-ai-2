import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useHistoricalEpisodeMatcher, SimilarEpisode } from "@/hooks/use-historical-episode-matcher";
import { ConfidenceBadge, getConfidenceLevel } from "@/components/ui/ConfidenceBadge";
import { format } from "date-fns";
import { History, TrendingUp, TrendingDown, Minus, ChevronDown, ChevronUp, Calendar, Target, Activity, AlertTriangle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
interface HistoricalEpisodeMatcherProps {
  symbol: string;
}
function getOutcomeColor(change: number | undefined): string {
  if (change === undefined) return "text-muted-foreground";
  if (change > 2) return "text-bullish";
  if (change < -2) return "text-bearish";
  return "text-muted-foreground";
}
function getOutcomeIcon(change: number | undefined) {
  if (change === undefined) return Minus;
  if (change > 2) return TrendingUp;
  if (change < -2) return TrendingDown;
  return Minus;
}
function EpisodeCard({
  episode,
  index
}: {
  episode: SimilarEpisode;
  index: number;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const confidenceLevel = getConfidenceLevel(episode.similarity_score / 100);
  const OutcomeIcon5d = getOutcomeIcon(episode.price_change_after_5d);
  const OutcomeIcon10d = getOutcomeIcon(episode.price_change_after_10d);
  return <Card className="p-4 glass-card hover:bg-secondary/50 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-primary/10 text-primary text-xs font-bold">
            #{index + 1}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">
                {format(new Date(episode.snapshot.snapshot_start), "MMM d, yyyy")}
              </span>
              <Badge variant="outline" className="text-[10px]">
                {episode.days_ago}d ago
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {episode.similarity_score}% match
            </p>
          </div>
        </div>
        <ConfidenceBadge level={confidenceLevel} context="match" tooltipContent={`${episode.matching_narratives.length} matching narratives, ${episode.matching_emotions.length} matching emotions`} />
      </div>
      
      {/* Matching narratives */}
      <div className="mb-3">
        <div className="text-[10px] text-muted-foreground mb-1.5">Matching Narratives</div>
        <div className="flex flex-wrap gap-1">
          {episode.matching_narratives.slice(0, 3).map((narrative, idx) => <Badge key={idx} variant="outline" className="text-[10px] bg-primary/5 border-primary/30 text-primary">
              {narrative.replace(/_/g, " ")}
            </Badge>)}
          {episode.matching_narratives.length > 3 && <Badge variant="outline" className="text-[10px]">
              +{episode.matching_narratives.length - 3}
            </Badge>}
          {episode.matching_narratives.length === 0 && <span className="text-[10px] text-muted-foreground italic">Similar pattern, different labels</span>}
        </div>
      </div>
      
      {/* Outcomes (if available) */}
      {(episode.price_change_after_5d !== undefined || episode.price_change_after_10d !== undefined) && <div className="flex gap-4 mb-3">
          {episode.price_change_after_5d !== undefined && <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className={cn("flex items-center gap-1", getOutcomeColor(episode.price_change_after_5d))}>
                    <OutcomeIcon5d className="h-3 w-3" />
                    <span className="text-xs font-medium">
                      {episode.price_change_after_5d > 0 ? "+" : ""}{episode.price_change_after_5d}%
                    </span>
                    <span className="text-[10px] text-muted-foreground">5D</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">Price change 5 days after this episode</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>}
          {episode.price_change_after_10d !== undefined && <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className={cn("flex items-center gap-1", getOutcomeColor(episode.price_change_after_10d))}>
                    <OutcomeIcon10d className="h-3 w-3" />
                    <span className="text-xs font-medium">
                      {episode.price_change_after_10d > 0 ? "+" : ""}{episode.price_change_after_10d}%
                    </span>
                    <span className="text-[10px] text-muted-foreground">10D</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">Price change 10 days after this episode</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>}
        </div>}
      
      {/* Expand/collapse for details */}
      <Button variant="ghost" size="sm" onClick={() => setIsExpanded(!isExpanded)} className="w-full text-xs text-muted-foreground hover:text-foreground">
        {isExpanded ? <>
            <ChevronUp className="h-3 w-3 mr-1" />
            Hide Details
          </> : <>
            <ChevronDown className="h-3 w-3 mr-1" />
            View Context
          </>}
      </Button>
      
      <AnimatePresence>
        {isExpanded && <motion.div initial={{
        height: 0,
        opacity: 0
      }} animate={{
        height: "auto",
        opacity: 1
      }} exit={{
        height: 0,
        opacity: 0
      }} transition={{
        duration: 0.2
      }} className="overflow-hidden">
            <div className="pt-3 border-t border-border/30 mt-2 space-y-3">
              {/* Matching emotions */}
              {episode.matching_emotions.length > 0 && <div>
                  <div className="text-[10px] text-muted-foreground mb-1">Matching Emotions</div>
                  <div className="flex flex-wrap gap-1">
                    {episode.matching_emotions.map((emotion, idx) => <Badge key={idx} variant="outline" className="text-[10px]">
                        {emotion}
                      </Badge>)}
                  </div>
                </div>}
              
              {/* Episode summary if available */}
              {episode.snapshot.interpretation?.snapshot_summary?.one_liner && <div>
                  <div className="text-[10px] text-muted-foreground mb-1">Episode Context</div>
                  <p className="text-xs text-muted-foreground italic">
                    "{episode.snapshot.interpretation.snapshot_summary.one_liner}"
                  </p>
                </div>}
              
              {/* Data quality */}
              <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                <span>{episode.snapshot.message_count} messages</span>
                <span>{episode.snapshot.unique_authors} authors</span>
              </div>
            </div>
          </motion.div>}
      </AnimatePresence>
    </Card>;
}
export function HistoricalEpisodeMatcher({
  symbol
}: HistoricalEpisodeMatcherProps) {
  const [showAll, setShowAll] = useState(false);
  const {
    data: episodes,
    isLoading,
    error
  } = useHistoricalEpisodeMatcher({
    symbol,
    lookbackDays: 90,
    minSimilarity: 40,
    maxResults: 10
  });
  if (isLoading) {
    return <Card className="p-4 md:p-5 glass-card">
        <div className="flex items-center gap-3 mb-4">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <div>
            <Skeleton className="h-5 w-48 mb-1" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
      </Card>;
  }
  if (error) {
    return null;
  }
  if (!episodes || episodes.length === 0) {
    return <Card className="p-4 md:p-5 glass-card">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-lg bg-muted">
            <History className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <h3 className="font-semibold text-sm md:text-base">Similar Historical Episodes</h3>
            <p className="text-xs text-muted-foreground">No matching episodes found in the last 90 days</p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          As more psychology snapshots are recorded, similar historical patterns will appear here.
        </p>
      </Card>;
  }
  const displayedEpisodes = showAll ? episodes : episodes.slice(0, 3);

  // Calculate aggregate outcomes for episodes with price data
  const episodesWithOutcomes = episodes.filter(e => e.price_change_after_10d !== undefined);
  const avgOutcome10d = episodesWithOutcomes.length > 0 ? episodesWithOutcomes.reduce((sum, e) => sum + (e.price_change_after_10d || 0), 0) / episodesWithOutcomes.length : null;
  const positiveCount = episodesWithOutcomes.filter(e => (e.price_change_after_10d || 0) > 0).length;
  return <Card className="p-4 md:p-5 glass-card">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          
          <div>
            <h3 className="font-semibold text-sm md:text-base">Similar Historical Episodes</h3>
            <p className="text-xs text-muted-foreground">
              {episodes.length} matching patterns found in past 90 days
            </p>
          </div>
        </div>
        {episodesWithOutcomes.length >= 3 && avgOutcome10d !== null && <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className={cn("text-right", avgOutcome10d > 0 ? "text-bullish" : avgOutcome10d < 0 ? "text-bearish" : "text-muted-foreground")}>
                  <div className="text-lg font-display">
                    {avgOutcome10d > 0 ? "+" : ""}{avgOutcome10d.toFixed(1)}%
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    avg 10D ({positiveCount}/{episodesWithOutcomes.length} positive)
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs max-w-xs">
                  Average 10-day price change following similar episodes. 
                  This is descriptive historical data, not a prediction.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>}
      </div>
      
      {/* Disclaimer */}
      <div className="flex items-start gap-2 mb-4 p-2 rounded-lg bg-amber-500/5 border border-amber-500/20">
        <AlertTriangle className="h-3.5 w-3.5 text-amber-500 mt-0.5 shrink-0" />
        <p className="text-[10px] text-amber-400">
          Historical patterns are descriptive only. Past behavior does not predict future outcomes.
        </p>
      </div>
      
      {/* Episode cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {displayedEpisodes.map((episode, idx) => <EpisodeCard key={episode.snapshot.id} episode={episode} index={idx} />)}
      </div>
      
      {/* Show more/less */}
      {episodes.length > 3 && <div className="mt-4 text-center">
          <Button variant="ghost" size="sm" onClick={() => setShowAll(!showAll)} className="text-xs">
            {showAll ? `Show Less` : `Show ${episodes.length - 3} More`}
          </Button>
        </div>}
    </Card>;
}