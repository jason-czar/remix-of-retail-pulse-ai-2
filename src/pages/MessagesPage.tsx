import { useState, useMemo } from "react";
import { useParams, Link, useLocation } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useSymbolMessages, useSymbolStats } from "@/hooks/use-stocktwits";
import { 
  ArrowLeft,
  Clock,
  MessageSquare,
  CalendarIcon,
  Filter,
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw
} from "lucide-react";
import { format, subDays } from "date-fns";
import type { DateRange } from "react-day-picker";

type SentimentFilter = "all" | "bullish" | "bearish" | "neutral";

export default function MessagesPage() {
  const { symbol: paramSymbol } = useParams<{ symbol: string }>();
  const location = useLocation();
  // Extract symbol from URL path as fallback (handles static routes like /symbol/AAPL)
  const symbol = paramSymbol || location.pathname.split('/')[2] || "AAPL";
  const [sentimentFilter, setSentimentFilter] = useState<SentimentFilter>("all");
  const [visibleCount, setVisibleCount] = useState(20);
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 7),
    to: new Date(),
  });

  // Calculate start/end from date range
  const start = dateRange?.from ? format(dateRange.from, "yyyy-MM-dd") : undefined;
  const end = dateRange?.to ? format(dateRange.to, "yyyy-MM-dd") : undefined;

  const { data: messages = [], isLoading, error, refetch } = useSymbolMessages(symbol, 10000, start, end);
  const { data: stats } = useSymbolStats(symbol);

  // Filter messages by sentiment
  const filteredMessages = useMemo(() => {
    if (sentimentFilter === "all") return messages;
    return messages.filter((msg) => msg.sentiment === sentimentFilter);
  }, [messages, sentimentFilter]);

  const visibleMessages = filteredMessages.slice(0, visibleCount);
  const hasMore = visibleCount < filteredMessages.length;

  // Count by sentiment
  const sentimentCounts = useMemo(() => {
    return {
      all: messages.length,
      bullish: messages.filter((m) => m.sentiment === "bullish").length,
      bearish: messages.filter((m) => m.sentiment === "bearish").length,
      neutral: messages.filter((m) => m.sentiment === "neutral").length,
    };
  }, [messages]);

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case "bullish":
        return <TrendingUp className="h-4 w-4" />;
      case "bearish":
        return <TrendingDown className="h-4 w-4" />;
      default:
        return <Minus className="h-4 w-4" />;
    }
  };

  return (
    <>
      <div className="container mx-auto px-4 py-8">
        {/* Back Navigation */}
        <Link
          to={`/symbol/${symbol}`}
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to ${symbol}
        </Link>

        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-display mb-2 flex items-center gap-3">
              <MessageSquare className="h-8 w-8 text-primary" />
              ${symbol} Messages
            </h1>
            <p className="text-muted-foreground">
              {stats?.name || symbol} • Real-time community discussions
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Date Range Picker */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <CalendarIcon className="h-4 w-4" />
                  {dateRange?.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, "MMM d")} - {format(dateRange.to, "MMM d")}
                      </>
                    ) : (
                      format(dateRange.from, "MMM d, yyyy")
                    )
                  ) : (
                    "Select dates"
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={dateRange?.from}
                  selected={dateRange}
                  onSelect={setDateRange}
                  numberOfMonths={2}
                />
                <div className="p-3 border-t border-border flex gap-2">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setDateRange({ from: subDays(new Date(), 1), to: new Date() })}
                  >
                    24h
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setDateRange({ from: subDays(new Date(), 7), to: new Date() })}
                  >
                    7D
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setDateRange({ from: subDays(new Date(), 30), to: new Date() })}
                  >
                    30D
                  </Button>
                </div>
              </PopoverContent>
            </Popover>

            <Button 
              variant="outline" 
              size="icon"
              onClick={() => refetch()}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card className="p-4 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Filter className="h-4 w-4" />
              Filter by sentiment:
            </div>
            
            <Tabs 
              value={sentimentFilter} 
              onValueChange={(v) => {
                setSentimentFilter(v as SentimentFilter);
                setVisibleCount(20); // Reset pagination on filter change
              }}
            >
              <TabsList>
                <TabsTrigger value="all" className="gap-2">
                  All
                  <Badge variant="secondary" className="text-xs">{sentimentCounts.all}</Badge>
                </TabsTrigger>
                <TabsTrigger value="bullish" className="gap-2 text-bullish data-[state=active]:text-bullish">
                  <TrendingUp className="h-3 w-3" />
                  Bullish
                  <Badge variant="secondary" className="text-xs">{sentimentCounts.bullish}</Badge>
                </TabsTrigger>
                <TabsTrigger value="bearish" className="gap-2 text-bearish data-[state=active]:text-bearish">
                  <TrendingDown className="h-3 w-3" />
                  Bearish
                  <Badge variant="secondary" className="text-xs">{sentimentCounts.bearish}</Badge>
                </TabsTrigger>
                <TabsTrigger value="neutral" className="gap-2">
                  <Minus className="h-3 w-3" />
                  Neutral
                  <Badge variant="secondary" className="text-xs">{sentimentCounts.neutral}</Badge>
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="ml-auto text-sm text-muted-foreground">
              Showing {visibleMessages.length} of {filteredMessages.length} messages
            </div>
          </div>
        </Card>

        {/* Messages Feed */}
        <div className="space-y-4">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <Card key={i} className="p-4">
                <div className="flex items-start gap-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-4 w-48" />
                  </div>
                </div>
              </Card>
            ))
          ) : error ? (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground mb-4">Failed to load messages</p>
              <Button variant="outline" onClick={() => refetch()}>
                Try Again
              </Button>
            </Card>
          ) : visibleMessages.length === 0 ? (
            <Card className="p-8 text-center">
              <MessageSquare className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground">
                {sentimentFilter === "all" 
                  ? "No messages found for this date range"
                  : `No ${sentimentFilter} messages found`
                }
              </p>
            </Card>
          ) : (
            visibleMessages.map((message) => (
              <div key={message.id} className="p-4 glass-list-item">
                <div className="flex items-start gap-4">
                  {/* Avatar */}
                  <div className="flex-shrink-0">
                    {message.userAvatar ? (
                      <img 
                        src={message.userAvatar} 
                        alt={message.user}
                        className="h-10 w-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-primary font-semibold">
                          {message.user.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className="font-semibold">@{message.user}</span>
                      {message.userName && (
                        <span className="text-sm text-muted-foreground">
                          {message.userName}
                        </span>
                      )}
                      <Badge 
                        variant={message.sentiment}
                        className="gap-1"
                      >
                        {getSentimentIcon(message.sentiment)}
                        {message.sentiment}
                      </Badge>
                      <span className="text-sm text-muted-foreground flex items-center gap-1 ml-auto">
                        <Clock className="h-3 w-3" />
                        {message.time}
                      </span>
                    </div>

                    <p className="text-sm mb-3 whitespace-pre-wrap break-words">
                      {message.content}
                    </p>

                    {/* Emotions & Symbols */}
                    <div className="flex flex-wrap gap-2">
                      {message.emotions.length > 0 && message.emotions.map((emotion) => (
                        <Badge 
                          key={emotion} 
                          variant="outline" 
                          className="text-xs capitalize"
                        >
                          {emotion}
                        </Badge>
                      ))}
                      {message.symbols && message.symbols.length > 1 && (
                        <div className="flex gap-1 ml-auto">
                          {message.symbols.filter(s => s !== symbol).slice(0, 3).map((sym) => (
                            <Link key={sym} to={`/symbol/${sym}`}>
                              <Badge variant="secondary" className="text-xs font-mono hover:bg-primary/20">
                                ${sym}
                              </Badge>
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Load More */}
        {hasMore && (
          <div className="mt-6 text-center">
            <Button
              variant="outline"
              onClick={() => setVisibleCount((prev) => prev + 20)}
              className="w-full max-w-xs"
            >
              Load More ({filteredMessages.length - visibleCount} remaining)
            </Button>
          </div>
        )}
      </div>
    </>
  );
}
