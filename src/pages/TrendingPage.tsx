import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AddToWatchlistButton } from "@/components/AddToWatchlistButton";
import { useTrending } from "@/hooks/use-stocktwits";
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

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-4 mb-6">
          <Tabs value={trendFilter} onValueChange={(v) => setTrendFilter(v as TrendFilter)}>
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="bullish" className="text-bullish data-[state=active]:text-bullish">
                Bullish
              </TabsTrigger>
              <TabsTrigger value="bearish" className="text-bearish data-[state=active]:text-bearish">
                Bearish
              </TabsTrigger>
              <TabsTrigger value="neutral">Neutral</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="text-sm text-muted-foreground ml-auto">
            Showing {visibleItems.length} of {filteredAndSorted.length} symbols
          </div>
        </div>

        {/* Table */}
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="gap-1 -ml-3"
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
                    className="gap-1 -ml-3"
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
                    className="gap-1 -ml-3"
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
                    className="gap-1 -ml-3"
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
                  <TableRow key={i}>
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
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No trending symbols found matching your filter.
                  </TableCell>
                </TableRow>
              ) : (
                visibleItems.map((item, index) => {
                  const originalRank = trending.indexOf(item) + 1;
                  const TrendIcon = item.trend === "bullish" ? TrendingUp : TrendingDown;
                  const change = item.change || 0;

                  return (
                    <TableRow key={item.symbol} className="group">
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
                          <div className="w-16 h-2 bg-secondary rounded-full overflow-hidden">
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
            <div className="p-4 border-t border-border">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setVisibleCount((prev) => prev + 20)}
              >
                Load More ({filteredAndSorted.length - visibleCount} remaining)
              </Button>
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
