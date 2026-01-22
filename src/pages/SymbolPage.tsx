import { useState, useMemo, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useParams, Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { SentimentChart } from "@/components/charts/SentimentChart";
import { NarrativeChart } from "@/components/charts/NarrativeChart";
import { EmotionChart } from "@/components/charts/EmotionChart";

import { EmotionMomentumChart } from "@/components/charts/EmotionMomentumChart";
import { AddToWatchlistButton } from "@/components/AddToWatchlistButton";
import { SymbolAlertDialog } from "@/components/SymbolAlertDialog";
import { FillTodayGapsButton } from "@/components/FillTodayGapsButton";
import { DecisionLensSelector, DecisionLens, getLensDisplayName } from "@/components/DecisionLensSelector";
import { LensReadinessCard } from "@/components/LensReadinessCard";
import { PsychologyOverviewCard } from "@/components/PsychologyOverviewCard";
import { MessagesSidebar } from "@/components/layout/MessagesSidebar";
import { NarrativeImpactHistorySection } from "@/components/NarrativeImpactHistorySection";
import { NarrativeCoherenceCard } from "@/components/NarrativeCoherenceCard";
import { NCSTrendChart } from "@/components/NCSTrendChart";
import { HistoricalEpisodeMatcher } from "@/components/HistoricalEpisodeMatcher";
import { WelcomeTour } from "@/components/WelcomeTour";
import { useSymbolStats, useSymbolMessages } from "@/hooks/use-stocktwits";
import { useDecisionLensSummary } from "@/hooks/use-decision-lens-summary";
import { useQueryClient } from "@tanstack/react-query";
import { TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, Clock, Loader2, RefreshCw } from "lucide-react";
type TimeRange = '1H' | '6H' | '1D' | '24H' | '7D' | '30D';
export default function SymbolPage() {
  const {
    symbol: paramSymbol
  } = useParams<{
    symbol: string;
  }>();
  const location = useLocation();
  // Extract symbol from URL path as fallback (handles static routes like /symbol/AAPL)
  const symbol = paramSymbol || location.pathname.split('/')[2] || "AAPL";
  const [timeRange, setTimeRange] = useState<TimeRange>('1D');
  const [activeTab, setActiveTab] = useState<string>('narratives');
  const [decisionLens, setDecisionLens] = useState<DecisionLens>('summary');
  const queryClient = useQueryClient();

  // Calculate date range based on selection (timezone-aware)
  const {
    start,
    end
  } = useMemo(() => {
    const now = new Date();

    // Handle "1D" (Today) - from midnight in user's timezone to now
    if (timeRange === '1D') {
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      return {
        start: startOfDay.toISOString(),
        end: now.toISOString()
      };
    }
    const ranges: Record<TimeRange, number> = {
      '1H': 1 / 24,
      '6H': 0.25,
      '1D': 1,
      // fallback, handled above
      '24H': 1,
      '7D': 7,
      '30D': 30
    };
    const days = ranges[timeRange] || 7;
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    return {
      start: startDate.toISOString(),
      end: now.toISOString()
    };
  }, [timeRange]);
  const {
    data: stats,
    isLoading: statsLoading
  } = useSymbolStats(symbol);
  const {
    data: messages = [],
    isLoading: messagesLoading
  } = useSymbolMessages(symbol, 50, start, end);
  const {
    data: lensSummaryData,
    isLoading: lensSummaryLoading,
    isFetching: lensSummaryFetching,
    refetch: refetchLensSummary
  } = useDecisionLensSummary(symbol, decisionLens);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const handleRegenerate = async () => {
    setIsRegenerating(true);
    // Invalidate the cache to force a fresh fetch
    await queryClient.invalidateQueries({
      queryKey: ['decision-lens-summary', symbol, decisionLens]
    });
    await refetchLensSummary();
    setIsRegenerating(false);
  };
  const data = stats || {
    symbol,
    name: symbol,
    sentiment: 50,
    sentimentChange: 0,
    trend: 'neutral' as const,
    volume: '0',
    volumeChange: 0,
    badges: [] as string[]
  };
  const summary = lensSummaryData?.summary || `Analyzing ${getLensDisplayName(decisionLens)} for ${symbol}...`;
  const TrendIcon = data.trend === "bullish" ? TrendingUp : TrendingDown;
  
  return (
    <>
      <WelcomeTour />
      <div className="container mx-auto px-4 py-6 md:py-8">
        {/* Symbol Header - Mobile Optimized */}
        <div className="flex flex-row items-start justify-between gap-4 mb-4 md:mb-6 md:mt-[23px] mt-[15px]">
          {/* Left side: Symbol info */}
          <div className="flex-1">
            {statsLoading ? <div className="space-y-2">
                <Skeleton className="h-8 md:h-10 w-32 md:w-48" />
                <Skeleton className="h-5 md:h-6 w-24 md:w-32" />
              </div> : <div>
                <div className="flex items-center gap-2 md:gap-3 flex-wrap mb-2">
                  <h1 className="text-2xl md:text-4xl font-display">${symbol}</h1>
                  <Badge variant={data.trend}>{data.trend}</Badge>
                  {data.badges.includes("trending") && <Badge variant="trending">
                      <TrendingUp className="h-3 w-3 mr-1" />
                      Trending
                    </Badge>}
                  {data.badges.includes("surge") && <Badge variant="glow">Volume Surge</Badge>}
                </div>
                <p className="text-base md:text-lg text-muted-foreground">
                  {data.name} • NASDAQ
                </p>
              </div>}
          </div>

          {/* Right side: Action buttons - stacked on mobile, row on desktop */}
          <div className="flex flex-col lg:flex-row gap-2 lg:overflow-visible shrink-0">
            <FillTodayGapsButton symbol={symbol} onComplete={() => {
          queryClient.invalidateQueries({
            queryKey: ['narrative-history', symbol]
          });
          queryClient.invalidateQueries({
            queryKey: ['emotion-history', symbol]
          });
        }} />
            <AddToWatchlistButton symbol={symbol} />
            <SymbolAlertDialog symbol={symbol} />
          </div>
        </div>

        {/* Charts Section - Unified header with tabs and time range */}
        <Tabs defaultValue="narratives" className="mb-6 md:mb-8" onValueChange={v => setActiveTab(v)}>
          {/* Mobile: TimeRangeSelector above tabs */}
          {activeTab !== 'momentum' && <div className="flex justify-center mb-3 md:hidden">
              <TimeRangeSelector value={timeRange} onChange={setTimeRange} />
            </div>}

          {/* Unified header row: TabsList + TimeRangeSelector (desktop only) */}
          <div className="flex-col justify-between gap-3 mb-2 md:mb-3 px-0 flex md:flex-row">
            <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0 scrollbar-hide">
              <TabsList className="w-max md:w-auto">
                <TabsTrigger value="narratives" className="text-xs md:text-sm px-2.5 md:px-3">Narratives</TabsTrigger>
                <TabsTrigger value="emotions" className="text-xs md:text-sm px-2.5 md:px-3">Emotions</TabsTrigger>
                <TabsTrigger value="sentiment" className="text-xs md:text-sm px-2.5 md:px-3">Sentiment</TabsTrigger>
                <TabsTrigger value="momentum" className="text-xs md:text-sm px-2.5 md:px-3">Momentum</TabsTrigger>
              </TabsList>
            </div>
            {/* Desktop: TimeRangeSelector in header row */}
            {activeTab !== 'momentum' && <div className="hidden md:block">
                <TimeRangeSelector value={timeRange} onChange={setTimeRange} />
              </div>}
          </div>

          <TabsContent value="narratives" className="mt-0">
            <div className="-mx-4 md:mx-0">
              <NarrativeChart symbol={symbol} timeRange={timeRange} start={start} end={end} />
            </div>
          </TabsContent>

          <TabsContent value="emotions" className="mt-0">
            <div className="-mx-4 md:mx-0">
              <EmotionChart symbol={symbol} timeRange={timeRange} start={start} end={end} />
            </div>
          </TabsContent>

          <TabsContent value="sentiment" className="mt-0">
            <div className="-mx-4 md:mx-0">
              <SentimentChart symbol={symbol} timeRange={timeRange} start={start} end={end} />
            </div>
          </TabsContent>

          <TabsContent value="momentum" className="mt-0">
            <div className="-mx-4 md:mx-0">
              <EmotionMomentumChart symbol={symbol} days={7} />
            </div>
          </TabsContent>
        </Tabs>

        {/* Section divider */}
        <Separator className="my-6 md:my-8 glass-divider" />

        {/* Decision Lens Selector - Horizontal scroll on mobile */}
        <div className="-mx-4 px-4 overflow-x-auto scrollbar-hide md:mx-0 md:px-0 md:overflow-visible mb-[31px]">
          <DecisionLensSelector value={decisionLens} onChange={setDecisionLens} />
        </div>

        {/* AI Summary + Readiness Card Side-by-Side with lens transition animation */}
        <AnimatePresence mode="wait">
          <motion.div key={decisionLens} initial={{
        opacity: 0,
        y: 10
      }} animate={{
        opacity: 1,
        y: 0
      }} exit={{
        opacity: 0,
        y: -10
      }} transition={{
        duration: 0.25,
        ease: "easeOut"
      }} className={cn("grid grid-cols-1 gap-4 lg:gap-6", decisionLens === 'summary' ? "lg:grid-cols-[4fr_6fr]" : "lg:grid-cols-[7fr_13fr]")}>
            {/* Intelligence Summary Card */}
            <motion.div layout transition={{
          duration: 0.3,
          ease: "easeOut"
        }}>
              <Card className="p-4 md:p-5 glass-card flex flex-col">
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-sm md:text-base">Intelligence Summary</h3>
                    <Badge variant="outline" className="text-[10px] md:text-xs">
                      {getLensDisplayName(decisionLens)}
                    </Badge>
                  </div>
                  <Button variant="ghost" size="sm" onClick={handleRegenerate} disabled={isRegenerating || lensSummaryLoading || lensSummaryFetching} className="h-7 px-2 text-muted-foreground hover:text-foreground">
                    <RefreshCw className={cn("h-3.5 w-3.5", (isRegenerating || lensSummaryFetching) && "animate-spin")} />
                    <span className="sr-only">Regenerate</span>
                  </Button>
                </div>
                {lensSummaryLoading || isRegenerating ? <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                  </div> : <div className="flex-1">
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      <FormattedSummary text={summary} />
                    </p>
                  </div>}
              </Card>
            </motion.div>

            {/* Right side: Readiness Card (non-summary) or Psychology Overview (summary) */}
            <motion.div layout transition={{
          duration: 0.3,
          ease: "easeOut"
        }}>
              {decisionLens === 'summary' ? <PsychologyOverviewCard symbol={symbol} /> : <LensReadinessCard symbol={symbol} lens={decisionLens} />}
            </motion.div>
          </motion.div>
        </AnimatePresence>

        {/* Narrative Coherence Score */}
        <div className="mb-8 md:mb-12 mt-8 md:mt-10">
          <h3 className="text-lg font-semibold mb-4">Narrative Coherence</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
            <NarrativeCoherenceCard symbol={symbol} />
            <NCSTrendChart symbol={symbol} />
          </div>
        </div>

        {/* Historical Episode Matcher */}
        <div className="mb-8 md:mb-12">
          <HistoricalEpisodeMatcher symbol={symbol} />
        </div>

        {/* Narrative Impact History Section */}
        <div className="mb-8 md:mb-12">
          <NarrativeImpactHistorySection symbol={symbol} />
        </div>
      </div>
      
      {/* Right sidebar - rendered directly as part of page content */}
      <MessagesSidebar symbol={symbol} messages={messages} isLoading={messagesLoading} />
    </>
  );
}
function MetricCard({
  label,
  value,
  change,
  suffix = "",
  icon: Icon,
  trend
}: {
  label: string;
  value: string | number;
  change?: number;
  suffix?: string;
  icon?: React.ElementType;
  trend?: "bullish" | "bearish" | "neutral";
}) {
  const ChangeIcon = change && change >= 0 ? ArrowUpRight : ArrowDownRight;
  return <Card className="p-3 md:p-4 glass-card">
      <div className="text-xs md:text-sm text-muted-foreground mb-1">{label}</div>
      <div className="flex items-center gap-1.5 md:gap-2">
        <span className="text-lg md:text-2xl font-display">{value}</span>
        {Icon && <Icon className={`h-4 w-4 md:h-5 md:w-5 ${trend === "bullish" ? "text-bullish" : trend === "bearish" ? "text-bearish" : "text-neutral"}`} />}
      </div>
      {change !== undefined && <div className={`flex items-center gap-1 text-xs md:text-sm mt-1 ${change >= 0 ? "text-bullish" : "text-bearish"}`}>
          <ChangeIcon className="h-3 w-3 md:h-4 md:w-4" />
          {Math.abs(change)}%{suffix}
        </div>}
    </Card>;
}
function TimeRangeSelector({
  value,
  onChange
}: {
  value: TimeRange;
  onChange: (v: TimeRange) => void;
}) {
  const labels: Record<TimeRange, string> = {
    '1H': '1H',
    '6H': '6H',
    '1D': 'Today',
    '24H': '24H',
    '7D': '7D',
    '30D': '30D'
  };
  return <div className="inline-flex h-9 md:h-10 items-center justify-center rounded-full p-1 md:p-1.5 text-muted-foreground glass-tabs-list overflow-x-auto scrollbar-hide px-[4px] py-0 shadow-none">
      {(["1H", "6H", "1D", "24H", "7D", "30D"] as const).map(range => <button key={range} onClick={() => onChange(range)} className={cn("inline-flex items-center justify-center whitespace-nowrap md:px-3.5 text-xs md:text-sm font-medium rounded-full ring-offset-background transition-all duration-200 shrink-0 px-[11px] py-[4px] border-0", range === value ? "bg-background text-foreground shadow-md dark:glass-tabs-trigger-active" : "text-muted-foreground hover:text-foreground/80 hover:bg-white/5")}>
          {labels[range]}
        </button>)}
    </div>;
}

// Markdown-style text formatter supporting bold, italics, and bullet points
function FormattedSummary({
  text
}: {
  text: string;
}) {
  // Check if text contains bullet points (lines starting with - or •)
  const lines = text.split('\n');
  const hasBullets = lines.some(line => /^[\s]*[-•]\s/.test(line));
  if (hasBullets) {
    return <div className="space-y-1">
        {lines.map((line, lineIndex) => {
        const trimmedLine = line.trim();
        // Check if this is a bullet point
        if (/^[-•]\s/.test(trimmedLine)) {
          const bulletContent = trimmedLine.replace(/^[-•]\s/, '');
          return <div key={lineIndex} className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span><FormatInlineText text={bulletContent} /></span>
              </div>;
        }
        // Regular line
        if (trimmedLine) {
          return <span key={lineIndex}><FormatInlineText text={trimmedLine} /></span>;
        }
        return null;
      })}
      </div>;
  }
  return <FormatInlineText text={text} />;
}

// Handle inline formatting: **bold** and *italics*
function FormatInlineText({
  text
}: {
  text: string;
}) {
  // Combined regex to match **bold** or *italic* patterns
  // Match **bold** first, then *italic* (single asterisk not followed/preceded by another)
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return <>
      {parts.map((part, index) => {
      // Check if this part is bold (wrapped in **)
      if (part.startsWith('**') && part.endsWith('**')) {
        const boldText = part.slice(2, -2);
        return <strong key={index} className="font-semibold">{boldText}</strong>;
      }
      // Check if this part is italic (wrapped in single *)
      if (part.startsWith('*') && part.endsWith('*') && !part.startsWith('**')) {
        const italicText = part.slice(1, -1);
        return <em key={index} className="italic">{italicText}</em>;
      }
      return <span key={index}>{part}</span>;
    })}
    </>;
}