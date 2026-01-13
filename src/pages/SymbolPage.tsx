import { useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { SentimentChart } from "@/components/charts/SentimentChart";
import { NarrativeChart } from "@/components/charts/NarrativeChart";
import { EmotionChart } from "@/components/charts/EmotionChart";
import { VolumeChart } from "@/components/charts/VolumeChart";
import { SentimentHistoryChart } from "@/components/charts/SentimentHistoryChart";
import { NarrativeTrendsChart } from "@/components/charts/NarrativeTrendsChart";
import { EmotionTrendsChart } from "@/components/charts/EmotionTrendsChart";
import { EmotionMomentumChart } from "@/components/charts/EmotionMomentumChart";
import { AddToWatchlistButton } from "@/components/AddToWatchlistButton";
import { SymbolAlertDialog } from "@/components/SymbolAlertDialog";
import { useSymbolStats, useSymbolMessages, useSymbolSentiment } from "@/hooks/use-stocktwits";
import { 
  TrendingUp, 
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Bell,
  MessageSquare,
  Clock,
  ExternalLink
} from "lucide-react";

type TimeRange = '1H' | '6H' | '24H' | '7D' | '30D';
type HistoryTimeRange = '24H' | 'TODAY' | '1W' | '30D';

export default function SymbolPage() {
  const { symbol = "AAPL" } = useParams<{ symbol: string }>();
  const [timeRange, setTimeRange] = useState<TimeRange>('24H');
  const [historyTimeRange, setHistoryTimeRange] = useState<HistoryTimeRange>('1W');
  
  // Calculate history range parameters
  const historyParams = useMemo(() => {
    const now = new Date();
    switch (historyTimeRange) {
      case '24H':
        return { days: 1, periodType: 'hourly' as const, label: '24 hours' };
      case 'TODAY': {
        // Hours since midnight
        const hoursSinceMidnight = now.getHours() + (now.getMinutes() / 60);
        return { days: hoursSinceMidnight / 24, periodType: 'hourly' as const, label: 'today' };
      }
      case '1W':
        return { days: 7, periodType: 'daily' as const, label: '7 days' };
      case '30D':
        return { days: 30, periodType: 'daily' as const, label: '30 days' };
      default:
        return { days: 7, periodType: 'daily' as const, label: '7 days' };
    }
  }, [historyTimeRange]);
  
  // Calculate date range based on selection
  const { start, end } = useMemo(() => {
    const now = new Date();
    const ranges: Record<TimeRange, number> = {
      '1H': 1/24,
      '6H': 0.25,
      '24H': 1,
      '7D': 7,
      '30D': 30
    };
    const days = ranges[timeRange] || 7;
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    return {
      start: startDate.toISOString().split('T')[0],
      end: now.toISOString().split('T')[0]
    };
  }, [timeRange]);
  
  const { data: stats, isLoading: statsLoading } = useSymbolStats(symbol);
  const { data: messages = [], isLoading: messagesLoading } = useSymbolMessages(symbol, 10, start, end);
  const { data: sentimentData } = useSymbolSentiment(symbol);
  
  const data = stats || {
    symbol,
    name: symbol,
    sentiment: 50,
    sentimentChange: 0,
    trend: 'neutral' as const,
    volume: '0',
    volumeChange: 0,
    badges: [] as string[],
  };
  
  const summary = sentimentData?.summary || 
    `Analyzing retail sentiment for ${symbol}. Real-time data from StockTwits community discussions.`;
  
  const TrendIcon = data.trend === "bullish" ? TrendingUp : TrendingDown;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        {/* Symbol Header */}
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6 mb-8">
          {statsLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-48" />
              <Skeleton className="h-6 w-32" />
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-4xl font-display">${symbol}</h1>
                <Badge variant={data.trend}>{data.trend}</Badge>
                {data.badges.includes("trending") && (
                  <Badge variant="trending">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    Trending
                  </Badge>
                )}
                {data.badges.includes("surge") && (
                  <Badge variant="glow">Volume Surge</Badge>
                )}
              </div>
              <p className="text-lg text-muted-foreground">
                {data.name} • NASDAQ
              </p>
            </div>
          )}

          <div className="flex gap-3">
            <AddToWatchlistButton symbol={symbol} />
            <SymbolAlertDialog symbol={symbol} />
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {statsLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))
          ) : (
            <>
              <MetricCard
                label="Sentiment Score"
                value={data.sentiment}
                change={data.sentimentChange}
                icon={TrendIcon}
                trend={data.trend}
              />
              <MetricCard
                label="Message Volume"
                value={data.volume}
                change={data.volumeChange}
                suffix=" (24h)"
              />
              <MetricCard
                label="1H Change"
                value={`${data.sentimentChange > 0 ? "+" : ""}${data.sentimentChange}%`}
                trend={data.sentimentChange >= 0 ? "bullish" : "bearish"}
              />
              <MetricCard
                label="7D Trend"
                value={data.trend === 'bullish' ? 'Strengthening' : data.trend === 'bearish' ? 'Weakening' : 'Stable'}
                trend={data.trend}
              />
            </>
          )}
        </div>

        {/* AI Summary */}
        <Card className="p-6 mb-8 bg-gradient-card">
          <div className="flex items-start gap-4">
            <div className="p-2 rounded-lg bg-primary/10">
              <MessageSquare className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold mb-2">AI Sentiment Summary</h3>
              <p className="text-muted-foreground leading-relaxed">
                {summary}
              </p>
            </div>
          </div>
        </Card>

        {/* Charts Section */}
        <Tabs defaultValue="sentiment" className="mb-8">
          <TabsList className="mb-6">
            <TabsTrigger value="sentiment">Sentiment</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
            <TabsTrigger value="narratives">Narratives</TabsTrigger>
            <TabsTrigger value="emotions">Emotions</TabsTrigger>
            <TabsTrigger value="momentum">Momentum</TabsTrigger>
            <TabsTrigger value="volume">Volume</TabsTrigger>
          </TabsList>

          <TabsContent value="sentiment">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold">Sentiment Over Time</h3>
                <TimeRangeSelector value={timeRange} onChange={setTimeRange} />
              </div>
              <SentimentChart symbol={symbol} timeRange={timeRange} start={start} end={end} />
            </Card>
          </TabsContent>

          <TabsContent value="history">
            <div className="space-y-4">
              {/* Unified time range selector for all history charts */}
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Historical Analysis ({historyParams.label})</h3>
                <HistoryTimeRangeSelector value={historyTimeRange} onChange={setHistoryTimeRange} />
              </div>
              
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-6">Historical Sentiment</h3>
                <SentimentHistoryChart 
                  symbol={symbol} 
                  days={Math.ceil(historyParams.days)} 
                  periodType={historyParams.periodType}
                  showVolume 
                />
              </Card>
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-6">Narrative Trends</h3>
                <NarrativeTrendsChart 
                  symbol={symbol} 
                  days={Math.ceil(historyParams.days)} 
                  periodType={historyParams.periodType}
                />
              </Card>
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-6">Emotion Trends</h3>
                <EmotionTrendsChart 
                  symbol={symbol} 
                  days={Math.ceil(historyParams.days)} 
                  periodType={historyParams.periodType}
                />
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="narratives">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold">Top 10 Narratives</h3>
                <TimeRangeSelector value={timeRange} onChange={setTimeRange} />
              </div>
              <NarrativeChart symbol={symbol} timeRange={timeRange} start={start} end={end} />
            </Card>
          </TabsContent>

          <TabsContent value="emotions">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold">Emotion Trends</h3>
                <TimeRangeSelector value={timeRange} onChange={setTimeRange} />
              </div>
              <EmotionChart symbol={symbol} timeRange={timeRange} start={start} end={end} />
            </Card>
          </TabsContent>

          <TabsContent value="momentum">
            <Card className="p-6">
              <EmotionMomentumChart symbol={symbol} days={7} />
            </Card>
          </TabsContent>

          <TabsContent value="volume">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold">Message Volume</h3>
                <TimeRangeSelector value={timeRange} onChange={setTimeRange} />
              </div>
              <VolumeChart symbol={symbol} timeRange={timeRange} start={start} end={end} />
            </Card>
          </TabsContent>
        </Tabs>

        {/* Representative Messages */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold">Representative Messages</h3>
            <Link to={`/symbol/${symbol}/messages`}>
              <Button variant="ghost" size="sm">
                View All
                <ExternalLink className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </div>
          
          <div className="space-y-4">
            {messagesLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))
            ) : messages.length > 0 ? (
              messages.slice(0, 5).map((msg) => (
                <MessageCard key={msg.id} {...msg} />
              ))
            ) : (
              <p className="text-muted-foreground text-sm">No messages available for this symbol.</p>
            )}
          </div>
        </Card>
      </main>

      <Footer />
    </div>
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
  
  return (
    <Card className="p-4 bg-gradient-card">
      <div className="text-sm text-muted-foreground mb-1">{label}</div>
      <div className="flex items-center gap-2">
        <span className="text-2xl font-display">{value}</span>
        {Icon && (
          <Icon className={`h-5 w-5 ${
            trend === "bullish" ? "text-bullish" :
            trend === "bearish" ? "text-bearish" :
            "text-neutral"
          }`} />
        )}
      </div>
      {change !== undefined && (
        <div className={`flex items-center gap-1 text-sm mt-1 ${
          change >= 0 ? "text-bullish" : "text-bearish"
        }`}>
          <ChangeIcon className="h-4 w-4" />
          {Math.abs(change)}%{suffix}
        </div>
      )}
    </Card>
  );
}

function TimeRangeSelector({ value, onChange }: { value: TimeRange; onChange: (v: TimeRange) => void }) {
  return (
    <div className="flex gap-1">
      {(["1H", "6H", "24H", "7D", "30D"] as const).map((range) => (
        <Button
          key={range}
          variant={range === value ? "default" : "ghost"}
          size="sm"
          className="px-3"
          onClick={() => onChange(range)}
        >
          {range}
        </Button>
      ))}
    </div>
  );
}

function HistoryTimeRangeSelector({ value, onChange }: { value: HistoryTimeRange; onChange: (v: HistoryTimeRange) => void }) {
  const labels: Record<HistoryTimeRange, string> = {
    '24H': '24H',
    'TODAY': 'Today',
    '1W': '1 Week',
    '30D': '30 Days',
  };
  
  return (
    <div className="flex gap-1">
      {(["24H", "TODAY", "1W", "30D"] as const).map((range) => (
        <Button
          key={range}
          variant={range === value ? "default" : "ghost"}
          size="sm"
          className="px-3"
          onClick={() => onChange(range)}
        >
          {labels[range]}
        </Button>
      ))}
    </div>
  );
}

function MessageCard({
  user,
  content,
  sentiment,
  emotions,
  time
}: {
  user: string;
  content: string;
  sentiment: string;
  emotions: string[];
  time: string;
}) {
  return (
    <div className="p-4 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="font-medium">@{user}</span>
          <Badge variant={sentiment === "bullish" ? "bullish" : sentiment === "bearish" ? "bearish" : "neutral"} className="text-xs">
            {sentiment}
          </Badge>
        </div>
        <span className="text-sm text-muted-foreground flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {time}
        </span>
      </div>
      <p className="text-sm mb-2">{content}</p>
      <div className="flex gap-2">
        {emotions.map((emotion) => (
          <Badge key={emotion} variant="outline" className="text-xs capitalize">
            {emotion}
          </Badge>
        ))}
      </div>
    </div>
  );
}