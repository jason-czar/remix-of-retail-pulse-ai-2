import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AddToWatchlistButton } from "@/components/AddToWatchlistButton";
import { useTrending } from "@/hooks/use-stocktwits";
import { cn } from "@/lib/utils";
import { 
  TrendingUp, 
  TrendingDown, 
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Flame,
  BarChart3
} from "lucide-react";

type SortField = "rank" | "sentiment" | "volume" | "change";
type SortDirection = "asc" | "desc";
type TrendFilter = "all" | "bullish" | "bearish" | "neutral";

const TREND_FILTERS: readonly TrendFilter[] = ['all', 'bullish', 'bearish', 'neutral'];
const FILTER_LABELS: Record<TrendFilter, string> = {
  all: 'All',
  bullish: 'Bullish',
  bearish: 'Bearish',
  neutral: 'Neutral'
};

export default function TrendingPage() {
  const { data: trending = [], isLoading, error } = useTrending();
  const [sortField, setSortField] = useState<SortField>("rank");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [trendFilter, setTrendFilter] = useState<TrendFilter>("all");
  const [visibleCount, setVisibleCount] = useState(20);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection(field === "rank" ? "asc" : "desc");
    }
  };

  const filteredAndSorted = useMemo(() => {
    let result = [...trending];

    // Filter by trend
    if (trendFilter !== "all") {
      result = result.filter((item) => item.trend === trendFilter);
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case "rank":
          comparison = trending.indexOf(a) - trending.indexOf(b);
          break;
        case "sentiment":
          comparison = a.sentiment - b.sentiment;
          break;
        case "volume":
          comparison = a.volume - b.volume;
          break;
        case "change":
          comparison = (a.change || 0) - (b.change || 0);
          break;
      }
      return sortDirection === "asc" ? comparison : -comparison;
    });

    return result;
  }, [trending, sortField, sortDirection, trendFilter]);

  const visibleItems = filteredAndSorted.slice(0, visibleCount);
  const hasMore = visibleCount < filteredAndSorted.length;

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="h-4 w-4 text-muted-foreground" />;
    return sortDirection === "asc" 
      ? <ArrowUp className="h-4 w-4 text-primary" /> 
      : <ArrowDown className="h-4 w-4 text-primary" />;
  };

  const formatVolume = (volume: number): string => {
    if (volume >= 1000000) return `${(volume / 1000000).toFixed(1)}M`;
    if (volume >= 1000) return `${(volume / 1000).toFixed(0)}K`;
    return volume.toString();
  };

  return (
    <>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-display mb-2 flex items-center gap-3">
              <Flame className="h-8 w-8 text-chart-5" />
              Trending Symbols
            </h1>
            <p className="text-muted-foreground">
              Real-time trending stocks based on social sentiment and message volume
            </p>
          </div>

          <Badge variant="glow" className="w-fit">
            <div className="w-2 h-2 bg-bullish rounded-full mr-2 animate-pulse" />
            Live Updates
          </Badge>
        </div>

        {/* Filters - Liquid Glass Style */}
        <div className="flex flex-wrap items-center gap-4 mb-6">
          <div className={cn(
            "relative inline-flex items-center justify-center gap-1.5 rounded-2xl py-2 px-3 overflow-x-auto scrollbar-hide",
            "bg-white/45 dark:bg-[hsl(0_0%_15%/0.45)]",
            "backdrop-blur-[20px] backdrop-saturate-[140%]",
            "border border-black/[0.04] dark:border-white/[0.06]",
            "shadow-[0_1px_2px_rgba(0,0,0,0.02)]",
            "dark:shadow-none"
          )}>
            {TREND_FILTERS.map(filter => (
              <button
                key={filter}
                onClick={() => setTrendFilter(filter)}
                className={cn(
                  "inline-flex items-center justify-center whitespace-nowrap px-4 py-1.5 text-sm font-medium rounded-full ring-offset-background transition-all duration-200 shrink-0",
                  filter === trendFilter
                    ? [
                        "bg-white text-foreground",
                        "shadow-[0_2px_8px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.04),inset_0_1px_0_rgba(255,255,255,0.9)]",
                        "border border-black/[0.06]",
                        "dark:bg-white/[0.12] dark:text-foreground",
                        "dark:shadow-[0_2px_8px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.1)]",
                        "dark:border-white/[0.12]"
                      ]
                    : [
                        "text-muted-foreground hover:text-foreground/80 hover:bg-black/[0.03] dark:hover:bg-white/[0.06]",
                        filter === 'bullish' && "text-bullish hover:text-bullish",
                        filter === 'bearish' && "text-bearish hover:text-bearish"
                      ]
                )}
              >
                {FILTER_LABELS[filter]}
              </button>
            ))}
          </div>

          <div className="text-sm text-muted-foreground ml-auto">
            Showing {visibleItems.length} of {filteredAndSorted.length} symbols
          </div>
        </div>

        {/* Table - Liquid Glass Card */}
        <div className={cn(
          "rounded-2xl overflow-hidden",
          "bg-white/60 dark:bg-[hsl(0_0%_12%/0.55)]",
          "backdrop-blur-[28px] backdrop-saturate-[140%]",
          "border border-black/[0.08] dark:border-white/[0.06]",
          "shadow-[0_8px_32px_rgba(0,0,0,0.04),0_2px_8px_rgba(0,0,0,0.02)]",
          "dark:shadow-[0_8px_32px_rgba(0,0,0,0.2)]"
        )}>
          <Table>
            <TableHeader>
              <TableRow className="border-b border-black/[0.06] dark:border-white/[0.06] hover:bg-transparent">
                <TableHead className="w-16">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="gap-1 -ml-3 hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
                    onClick={() => handleSort("rank")}
                  >
                    Rank
                    <SortIcon field="rank" />
                  </Button>
                </TableHead>
                <TableHead>Symbol</TableHead>
                <TableHead>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="gap-1 -ml-3 hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
                    onClick={() => handleSort("sentiment")}
                  >
                    Sentiment
                    <SortIcon field="sentiment" />
                  </Button>
                </TableHead>
                <TableHead>Trend</TableHead>
                <TableHead>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="gap-1 -ml-3 hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
                    onClick={() => handleSort("change")}
                  >
                    Change
                    <SortIcon field="change" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="gap-1 -ml-3 hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
                    onClick={() => handleSort("volume")}
                  >
                    <BarChart3 className="h-4 w-4 mr-1" />
                    Volume
                    <SortIcon field="volume" />
                  </Button>
                </TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 10 }).map((_, i) => (
                  <TableRow key={i} className="border-b border-black/[0.04] dark:border-white/[0.04]">
                    <TableCell><Skeleton className="h-6 w-8" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-24 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : error ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Failed to load trending data. Please try again later.
                  </TableCell>
                </TableRow>
              ) : visibleItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="p-0">
                    <EmptyState
                      icon={trendFilter === "bullish" ? TrendingUp : trendFilter === "bearish" ? TrendingDown : Flame}
                      title={
                        trendFilter === "bullish"
                          ? "No Bullish Momentum Right Now"
                          : trendFilter === "bearish"
                          ? "No Bearish Pressure Detected"
                          : trendFilter === "neutral"
                          ? "No Neutral Sentiment Currently"
                          : "No Trending Symbols"
                      }
                      description={
                        trendFilter === "bullish"
                          ? "Markets shift quickly. Try checking back later or view all trending symbols to spot emerging opportunities."
                          : trendFilter === "bearish"
                          ? "Bearish sentiment is subdued at the moment. View all symbols to see the current market landscape."
                          : trendFilter === "neutral"
                          ? "Most symbols are showing directional bias. Check bullish or bearish filters for active trends."
                          : "Trending data is loading. If this persists, try refreshing the page."
                      }
                      action={
                        trendFilter !== "all" ? (
                          <Button variant="outline" size="sm" onClick={() => setTrendFilter("all")}>
                            View All Symbols
                          </Button>
                        ) : null
                      }
                      compact
                    />
                  </TableCell>
                </TableRow>
              ) : (
                visibleItems.map((item, index) => {
                  const originalRank = trending.indexOf(item) + 1;
                  const TrendIcon = item.trend === "bullish" ? TrendingUp : TrendingDown;
                  const change = item.change || 0;

                  return (
                    <TableRow 
                      key={item.symbol} 
                      className="group border-b border-black/[0.04] dark:border-white/[0.04] hover:bg-black/[0.02] dark:hover:bg-white/[0.03] transition-colors"
                    >
                      <TableCell className="font-mono text-muted-foreground">
                        #{originalRank}
                      </TableCell>
                      <TableCell>
                        <Link 
                          to={`/symbol/${item.symbol}`}
                          className="flex items-center gap-2 group-hover:text-primary transition-colors"
                        >
                          <span className="font-mono font-semibold">${item.symbol}</span>
                          {item.name && (
                            <span className="text-sm text-muted-foreground hidden md:inline">
                              {item.name}
                            </span>
                          )}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{item.sentiment}</span>
                          <div className="w-16 h-2 bg-black/[0.06] dark:bg-white/[0.08] rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                item.trend === "bullish"
                                  ? "bg-gradient-bullish"
                                  : item.trend === "bearish"
                                  ? "bg-gradient-bearish"
                                  : "bg-neutral"
                              }`}
                              style={{ width: `${item.sentiment}%` }}
                            />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={item.trend} className="gap-1">
                          <TrendIcon className="h-3 w-3" />
                          {item.trend}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`flex items-center gap-1 ${
                            change >= 0 ? "text-bullish" : "text-bearish"
                          }`}
                        >
                          {change >= 0 ? (
                            <ArrowUp className="h-3 w-3" />
                          ) : (
                            <ArrowDown className="h-3 w-3" />
                          )}
                          {Math.abs(change).toFixed(1)}%
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatVolume(item.volume)} msgs
                      </TableCell>
                      <TableCell className="text-right">
                        <AddToWatchlistButton symbol={item.symbol} />
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>

          {hasMore && (
            <div className="p-4 border-t border-black/[0.06] dark:border-white/[0.06]">
              <Button
                variant="outline"
                className={cn(
                  "w-full",
                  "bg-white/50 dark:bg-white/[0.06]",
                  "border-black/[0.08] dark:border-white/[0.08]",
                  "hover:bg-black/[0.04] dark:hover:bg-white/[0.08]"
                )}
                onClick={() => setVisibleCount((prev) => prev + 20)}
              >
                Load More ({filteredAndSorted.length - visibleCount} remaining)
              </Button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
