import { useState, useMemo, useRef, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import { useParams, Link, useLocation, useSearchParams } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { SentimentChart } from "@/components/charts/SentimentChart";
import { NarrativeChart } from "@/components/charts/NarrativeChart";
import { EmotionChart } from "@/components/charts/EmotionChart";
import { EmotionMomentumChart } from "@/components/charts/EmotionMomentumChart";
import { AddToWatchlistButton } from "@/components/AddToWatchlistButton";
import { SymbolAlertDialog } from "@/components/SymbolAlertDialog";
import { FillTodayGapsButton } from "@/components/FillTodayGapsButton";
import { DecisionLensSelector, DecisionLens, LensValue, getLensDisplayName, getLensDecisionQuestion, isDefaultLens } from "@/components/DecisionLensSelector";
import { CustomLens } from "@/hooks/use-custom-lenses";
import { ConfidenceBadge } from "@/components/ui/ConfidenceBadge";
import { LensReadinessCard } from "@/components/LensReadinessCard";
import { DecisionQuestionHeader } from "@/components/DecisionQuestionHeader";
import { CustomLensReadinessCard } from "@/components/CustomLensReadinessCard";
import { PsychologyOverviewCard, ContinueToLensButton } from "@/components/PsychologyOverviewCard";
import { SummaryInsightsCard } from "@/components/SummaryInsightsCard";
import { MessagesSidebar } from "@/components/layout/MessagesSidebar";
import { NarrativeImpactHistorySection } from "@/components/NarrativeImpactHistorySection";
import { NarrativeCoherenceCard } from "@/components/NarrativeCoherenceCard";
import { NCSTrendChart } from "@/components/NCSTrendChart";
import { HistoricalEpisodeMatcher } from "@/components/HistoricalEpisodeMatcher";
import { WelcomeTour } from "@/components/WelcomeTour";
import { useSymbolStats, useSymbolMessages } from "@/hooks/use-stocktwits";
import { useDecisionLensSummary } from "@/hooks/use-decision-lens-summary";
import { useQueryClient } from "@tanstack/react-query";
import { TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, Clock, Loader2, RefreshCw, ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useAskDeriveStreet } from "@/contexts/AskDeriveStreetContext";
import { AskDeriveStreetBar } from "@/components/ask/AskDeriveStreetBar";
import { AskDeriveStreetPanel } from "@/components/ask/AskDeriveStreetPanel";
type TimeRange = '1H' | '6H' | '1D' | '24H' | '7D' | '30D';
export default function SymbolPage() {
  return <SymbolPageContent />;
}
function SymbolPageContent() {
  const {
    symbol: paramSymbol
  } = useParams<{
    symbol: string;
  }>();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  // Extract symbol from URL path as fallback (handles static routes like /symbol/AAPL)
  const symbol = paramSymbol || location.pathname.split('/')[2] || "AAPL";

  // Initialize Ask context with symbol
  const {
    setSymbol,
    setIntelligenceContext
  } = useAskDeriveStreet();

  // Sync symbol to Ask context
  useEffect(() => {
    setSymbol(symbol);
  }, [symbol, setSymbol]);
  const validTabs = ['narratives', 'emotions', 'sentiment', 'momentum'];
  const initialTab = searchParams.get('chart') || 'narratives';
  const [activeTab, setActiveTabState] = useState<string>(validTabs.includes(initialTab) ? initialTab : 'narratives');

  // Wrapper to update URL when chart tab changes
  const setActiveTab = (tab: string) => {
    setActiveTabState(tab);
    setSearchParams(prev => {
      const newParams = new URLSearchParams(prev);
      if (tab === 'narratives') {
        newParams.delete('chart');
      } else {
        newParams.set('chart', tab);
      }
      return newParams;
    }, {
      replace: true
    });
  };

  // Initialize time range from URL query param or default to '1D'
  const validTimeRanges: TimeRange[] = ['1H', '6H', '1D', '24H', '7D', '30D'];
  const initialTimeRange = searchParams.get('range') as TimeRange || '1D';
  const [timeRange, setTimeRangeState] = useState<TimeRange>(validTimeRanges.includes(initialTimeRange) ? initialTimeRange : '1D');

  // Wrapper to update URL when time range changes
  const setTimeRange = (range: TimeRange) => {
    setTimeRangeState(range);
    setSearchParams(prev => {
      const newParams = new URLSearchParams(prev);
      if (range === '1D') {
        newParams.delete('range');
      } else {
        newParams.set('range', range);
      }
      return newParams;
    }, {
      replace: true
    });
  };

  // Initialize decision lens from URL query param or default to 'summary'
  const initialLens = searchParams.get('lens') || 'summary';
  const [decisionLens, setDecisionLens] = useState<LensValue>(initialLens);
  const [activeCustomLens, setActiveCustomLens] = useState<CustomLens | null>(null);
  const queryClient = useQueryClient();

  // Sync decision lens state when URL query param changes externally
  useEffect(() => {
    const urlLens = searchParams.get('lens') || 'summary';
    if (urlLens !== decisionLens) {
      setDecisionLens(urlLens);
      // Reset custom lens when switching via URL (custom lenses need full context)
      if (!urlLens.startsWith('custom-')) {
        setActiveCustomLens(null);
      }
    }
  }, [searchParams]);

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

  // Handle lens change with custom lens support and URL persistence
  const handleLensChange = (lens: LensValue, customLens?: CustomLens) => {
    setDecisionLens(lens);
    setActiveCustomLens(customLens || null);

    // Update URL query param
    setSearchParams(prev => {
      const newParams = new URLSearchParams(prev);
      if (lens === 'summary') {
        newParams.delete('lens');
      } else {
        newParams.set('lens', lens);
      }
      return newParams;
    }, {
      replace: true
    });
  };
  const {
    data: lensSummaryData,
    isLoading: lensSummaryLoading,
    isFetching: lensSummaryFetching,
    refetch: refetchLensSummary
  } = useDecisionLensSummary(symbol, decisionLens, activeCustomLens);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const {
    user
  } = useAuth();
  const isAdmin = user?.email === 'admin@czar.ing';
  const handleRegenerate = async () => {
    setIsRegenerating(true);
    // Invalidate the cache to force a fresh fetch
    const cacheKey = activeCustomLens ? activeCustomLens.id : decisionLens;
    await queryClient.invalidateQueries({
      queryKey: ['decision-lens-summary', symbol, cacheKey]
    });
    await refetchLensSummary();
    setIsRegenerating(false);
  };

  // Sync intelligence context to Ask panel
  useEffect(() => {
    if (lensSummaryData?.summary) {
      setIntelligenceContext({
        lensSummary: lensSummaryData.summary,
        lensConfidence: lensSummaryData.confidence,
        activeLens: getLensDisplayName(decisionLens, activeCustomLens || undefined),
        dataTimestamp: new Date().toISOString()
      });
    }
  }, [lensSummaryData, decisionLens, activeCustomLens, setIntelligenceContext]);
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
  const summary = lensSummaryData?.summary || `Analyzing ${getLensDisplayName(decisionLens, activeCustomLens || undefined)} for ${symbol}...`;
  const TrendIcon = data.trend === "bullish" ? TrendingUp : TrendingDown;
  return <>
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
                  <h1 className="text-2xl md:text-4xl font-display">{symbol}</h1>
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

        {/* Decision Lens Selector - Sticky below header */}
        <div className="sticky top-14 z-30 -mx-4 px-4 overflow-x-auto scrollbar-hide md:mx-0 md:px-0 md:overflow-visible mb-4 md:mb-6 py-0" data-tour="decision-lens">
          <DecisionLensSelector value={decisionLens} onChange={handleLensChange} />
        </div>

        {/* Charts Section - Only visible when Summary lens is selected */}
        <AnimatePresence mode="wait">
          {decisionLens === 'summary' && <motion.div key="charts-section" initial={{
          opacity: 0,
          y: -10
        }} animate={{
          opacity: 1,
          y: 0
        }} exit={{
          opacity: 0,
          y: -10
        }} transition={{
          duration: 0.2,
          ease: "easeOut"
        }}>
              <Tabs value={activeTab} className="mb-6 md:mb-8 overflow-visible " onValueChange={setActiveTab} data-tour="chart-tabs">
                {/* Chart content first */}
                <TabsContent value="narratives" className="mt-0 mb-1.5 md:mb-2">
                  <div className="-mx-4 md:mx-0">
                    <NarrativeChart symbol={symbol} timeRange={timeRange} start={start} end={end} />
                  </div>
                </TabsContent>

                <TabsContent value="emotions" className="mt-0 mb-1.5 md:mb-2">
                  <div className="-mx-4 md:mx-0">
                    <EmotionChart symbol={symbol} timeRange={timeRange} start={start} end={end} />
                  </div>
                </TabsContent>

                <TabsContent value="sentiment" className="mt-0 mb-1.5 md:mb-2">
                  <div className="-mx-4 md:mx-0">
                    <SentimentChart symbol={symbol} timeRange={timeRange} start={start} end={end} />
                  </div>
                </TabsContent>

                <TabsContent value="momentum" className="mt-0 mb-1.5 md:mb-2">
                  <div className="-mx-4 md:mx-0">
                    <EmotionMomentumChart symbol={symbol} days={7} />
                  </div>
                </TabsContent>

                {/* Selectors below charts */}
                {/* Mobile: TimeRangeSelector above tabs */}
                {activeTab !== 'momentum' && <div className="flex justify-center mb-1.5 md:hidden">
                    <TimeRangeSelector value={timeRange} onChange={setTimeRange} />
                  </div>}

                {/* Unified row: TabsList + TimeRangeSelector */}
                <div className="flex-col justify-between gap-3 px-0 flex md:flex-row mt-4 md:mt-6">
                  <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0 scrollbar-hide">
                    <TabsList className="w-max md:w-auto">
                      <TabsTrigger value="narratives" className="text-xs">Narratives</TabsTrigger>
                      <TabsTrigger value="emotions" className="text-xs">Emotions</TabsTrigger>
                      <TabsTrigger value="sentiment" className="text-xs">Sentiment</TabsTrigger>
                      <TabsTrigger value="momentum" className="text-xs">Momentum</TabsTrigger>
                    </TabsList>
                  </div>
                  {/* Desktop: TimeRangeSelector in row */}
                  {activeTab !== 'momentum' && <div className="hidden md:block">
                      <TimeRangeSelector value={timeRange} onChange={setTimeRange} />
                    </div>}
                </div>
              </Tabs>
            </motion.div>}
        </AnimatePresence>

        {/* Section divider - animated with charts */}
        <AnimatePresence>
          {decisionLens === 'summary' && <motion.div initial={{
          opacity: 0
        }} animate={{
          opacity: 1
        }} exit={{
          opacity: 0
        }} transition={{
          duration: 0.2,
          ease: "easeOut"
        }}>
              <Separator className="my-6 md:my-8 glass-divider" />
            </motion.div>}
        </AnimatePresence>

        {/* Decision Question Header with integrated Intelligence Summary */}
        <AnimatePresence mode="wait">
          {decisionLens !== 'summary' && <motion.div key={`header-${decisionLens}`} initial={{
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
        }} className="mb-4 lg:mb-6">
              <DecisionQuestionHeader symbol={symbol} lens={decisionLens} customLens={activeCustomLens} confidence={lensSummaryData?.confidence} relevantCount={lensSummaryData?.relevantCount} messageCount={lensSummaryData?.messageCount} isLoading={lensSummaryLoading}>
                {/* Summary content integrated into the card */}
                <div>
                  {lensSummaryLoading || isRegenerating ? <div className="space-y-3">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-[95%]" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-3/4" />
                    </div> : <motion.div initial={{
                opacity: 0
              }} animate={{
                opacity: 1
              }} transition={{
                duration: 0.4,
                ease: "easeOut"
              }}>
                      <p className="text-sm md:text-base text-foreground/80 leading-[1.7] tracking-[-0.01em] inline">
                        <FormattedSummary text={summary} />
                      </p>
                      {isAdmin && <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" onClick={handleRegenerate} disabled={isRegenerating || lensSummaryLoading || lensSummaryFetching} className="inline-flex ml-2 h-7 w-7 text-muted-foreground hover:text-foreground align-middle">
                              <RefreshCw className={cn("h-3.5 w-3.5", (isRegenerating || lensSummaryFetching) && "animate-spin")} />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Generate a fresh analysis</p>
                          </TooltipContent>
                        </Tooltip>}
                    </motion.div>}
                </div>
              </DecisionQuestionHeader>
            </motion.div>}
        </AnimatePresence>

        {/* Summary lens - New unified layout with SummaryInsightsCard */}
        <AnimatePresence mode="wait">
          {decisionLens === 'summary' && <motion.div key={decisionLens} initial={{
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
        }} className="space-y-4 lg:space-y-6">
              <SummaryInsightsCard symbol={symbol} confidence={lensSummaryData?.confidence} relevantCount={lensSummaryData?.relevantCount} messageCount={lensSummaryData?.messageCount} isLoading={lensSummaryLoading} isRegenerating={isRegenerating} isFetching={lensSummaryFetching} isAdmin={isAdmin} onRegenerate={handleRegenerate}>
                <p className="text-sm md:text-base text-foreground/80 leading-[1.7] tracking-[-0.01em]">
                  <FormattedSummary text={summary} />
                </p>
              </SummaryInsightsCard>

              {/* Psychology Overview Card - without metric tiles since they're in the header */}
              <motion.div layout transition={{
            duration: 0.3,
            ease: "easeOut"
          }} className="mt-8 md:mt-[50px]">
                <PsychologyOverviewCard symbol={symbol} hideMetricTiles />
              </motion.div>

              {/* Continue to Decision Lens Navigation */}
              <motion.div layout transition={{
            duration: 0.3,
            ease: "easeOut"
          }} className="mt-4 md:mt-6">
                <ContinueToLensButton />
              </motion.div>
            </motion.div>}
        </AnimatePresence>

        {/* Readiness Card for non-summary lenses */}
        <AnimatePresence mode="wait">
          {decisionLens !== 'summary' && <motion.div key={`readiness-${decisionLens}`} initial={{
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
          ease: "easeOut",
          delay: 0.1
        }}>
              {activeCustomLens ? <CustomLensReadinessCard customLens={activeCustomLens} summaryData={lensSummaryData} isLoading={lensSummaryLoading} symbol={symbol} onRefresh={() => refetchLensSummary()} /> : <LensReadinessCard symbol={symbol} lens={decisionLens as DecisionLens} />}
            </motion.div>}
        </AnimatePresence>

        {/* Narrative Coherence Score */}
        <Collapsible defaultOpen={false} className="mb-8 md:mb-12 mt-12 md:mt-16">
          <CollapsibleTrigger className={cn(
            "flex items-center gap-2 w-full group px-4 py-3 rounded-xl",
            "bg-white/45 dark:bg-white/[0.04]",
            "backdrop-blur-[12px]",
            "border border-black/[0.04] dark:border-white/[0.04]",
            "transition-all duration-200",
            "hover:bg-white/60 dark:hover:bg-white/[0.06]"
          )}>
            <h3 className="text-lg font-semibold">Narrative Coherence</h3>
            <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-4">
            <motion.div initial={{
            opacity: 0,
            y: -10
          }} animate={{
            opacity: 1,
            y: 0
          }} transition={{
            duration: 0.25,
            ease: "easeOut"
          }}>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
                <NarrativeCoherenceCard symbol={symbol} />
                <NCSTrendChart symbol={symbol} />
              </div>
            </motion.div>
          </CollapsibleContent>
        </Collapsible>

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
      
      {/* Ask DeriveStreet - Bottom bar and panel */}
      <AskDeriveStreetBar />
      <AskDeriveStreetPanel />
    </>;
}
// Liquid Glass styling constants
const glassCardClasses = cn(
  "rounded-2xl p-3 md:p-4",
  "bg-white/60 dark:bg-[hsl(0_0%_12%/0.55)]",
  "backdrop-blur-[28px] backdrop-saturate-[140%]",
  "border border-black/[0.08] dark:border-white/[0.06]",
  "shadow-[0_8px_32px_rgba(0,0,0,0.04),0_2px_8px_rgba(0,0,0,0.02)]"
);

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
  return <div className={glassCardClasses}>
      <div className="text-xs md:text-sm text-muted-foreground mb-1">{label}</div>
      <div className="flex items-center gap-1.5 md:gap-2">
        <span className="text-lg md:text-2xl font-display">{value}</span>
        {Icon && <Icon className={`h-4 w-4 md:h-5 md:w-5 ${trend === "bullish" ? "text-bullish" : trend === "bearish" ? "text-bearish" : "text-neutral"}`} />}
      </div>
      {change !== undefined && <div className={`flex items-center gap-1 text-xs md:text-sm mt-1 ${change >= 0 ? "text-bullish" : "text-bearish"}`}>
          <ChangeIcon className="h-3 w-3 md:h-4 md:w-4" />
          {Math.abs(change)}%{suffix}
        </div>}
    </div>;
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
  return <div className={cn("relative inline-flex items-center justify-center gap-1.5 rounded-2xl py-2 px-3 overflow-x-auto scrollbar-hide",
  // Liquid Glass styling - subtle and seamless
  "bg-white/80 dark:bg-[hsl(0_0%_15%/0.45)]", "backdrop-blur-[20px] backdrop-saturate-[140%]", "border border-black/[0.04] dark:border-white/[0.06]",
  // Minimal shadow - just enough depth without boxy appearance
  "shadow-[0_1px_2px_rgba(0,0,0,0.02)]", "dark:shadow-none")}>
      {(["1H", "6H", "1D", "24H", "7D", "30D"] as const).map(range => <button key={range} onClick={() => onChange(range)} className={cn("inline-flex items-center justify-center whitespace-nowrap px-4 py-1.5 text-xs font-medium rounded-full ring-offset-background transition-all duration-200 shrink-0", range === value ? [
    // Light mode: frosted white with subtle depth
    "bg-white text-foreground", "shadow-[0_2px_8px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.04),inset_0_1px_0_rgba(255,255,255,0.9)]", "border border-black/[0.06]",
    // Dark mode: subtle glass elevation
    "dark:bg-white/[0.12] dark:text-foreground", "dark:shadow-[0_2px_8px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.1)]", "dark:border-white/[0.12]"] : "text-muted-foreground hover:text-foreground/80 hover:bg-black/[0.03] dark:hover:bg-white/[0.06]")}>
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