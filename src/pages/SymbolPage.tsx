import { useParams, Link } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SentimentChart } from "@/components/charts/SentimentChart";
import { NarrativeChart } from "@/components/charts/NarrativeChart";
import { EmotionChart } from "@/components/charts/EmotionChart";
import { VolumeChart } from "@/components/charts/VolumeChart";
import { 
  TrendingUp, 
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Bell,
  Star,
  MessageSquare,
  Clock,
  ExternalLink
} from "lucide-react";

// Mock data for demo
const symbolData = {
  AAPL: {
    name: "Apple Inc",
    exchange: "NASDAQ",
    sentiment: 67,
    sentimentChange: 5.2,
    trend: "bullish" as const,
    volume: "156K",
    volumeChange: 23,
    badges: ["trending", "high-volume"],
    summary: "Strong bullish momentum driven by Vision Pro launch expectations and positive earnings sentiment. Retail traders expressing high conviction on long-term AI integration plays."
  },
  NVDA: {
    name: "NVIDIA Corp",
    exchange: "NASDAQ",
    sentiment: 78,
    sentimentChange: 12.5,
    trend: "bullish" as const,
    volume: "245K",
    volumeChange: 45,
    badges: ["trending", "surge"],
    summary: "Exceptional bullish sentiment on AI infrastructure demand. Narratives centered around data center growth and competitive moat in GPU market."
  },
  TSLA: {
    name: "Tesla Inc",
    exchange: "NASDAQ",
    sentiment: 45,
    sentimentChange: -8.2,
    trend: "bearish" as const,
    volume: "189K",
    volumeChange: 12,
    badges: ["volatile"],
    summary: "Mixed sentiment with bearish tilt due to margin concerns. Robotaxi and FSD narratives providing some support but overall cautious outlook."
  }
};

const mockMessages = [
  {
    id: 1,
    user: "TechTrader_Mike",
    content: "$AAPL Vision Pro could be a game changer. Not just a product, it's a platform play. Loading up on calls 🚀",
    sentiment: "bullish",
    emotions: ["excitement", "conviction"],
    time: "2 min ago"
  },
  {
    id: 2,
    user: "ValueHunter",
    content: "PE ratio looking stretched here but the services revenue is compelling. Holding my shares.",
    sentiment: "neutral",
    emotions: ["certainty"],
    time: "5 min ago"
  },
  {
    id: 3,
    user: "MacroMaven",
    content: "China concerns overblown. iPhone market share actually growing in key segments. This dip is a gift.",
    sentiment: "bullish",
    emotions: ["conviction", "hopefulness"],
    time: "8 min ago"
  }
];

export default function SymbolPage() {
  const { symbol = "AAPL" } = useParams<{ symbol: string }>();
  const data = symbolData[symbol as keyof typeof symbolData] || symbolData.AAPL;
  const TrendIcon = data.trend === "bullish" ? TrendingUp : TrendingDown;
  const ChangeIcon = data.sentimentChange >= 0 ? ArrowUpRight : ArrowDownRight;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        {/* Symbol Header */}
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6 mb-8">
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
              {data.name} • {data.exchange}
            </p>
          </div>

          <div className="flex gap-3">
            <Button variant="outline">
              <Star className="h-4 w-4 mr-2" />
              Add to Watchlist
            </Button>
            <Button variant="outline">
              <Bell className="h-4 w-4 mr-2" />
              Set Alert
            </Button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
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
            value="Strengthening"
            trend="bullish"
          />
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
                {data.summary}
              </p>
            </div>
          </div>
        </Card>

        {/* Charts Section */}
        <Tabs defaultValue="sentiment" className="mb-8">
          <TabsList className="mb-6">
            <TabsTrigger value="sentiment">Sentiment</TabsTrigger>
            <TabsTrigger value="narratives">Narratives</TabsTrigger>
            <TabsTrigger value="emotions">Emotions</TabsTrigger>
            <TabsTrigger value="volume">Volume</TabsTrigger>
          </TabsList>

          <TabsContent value="sentiment">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold">Sentiment Over Time</h3>
                <TimeRangeSelector />
              </div>
              <SentimentChart symbol={symbol} />
            </Card>
          </TabsContent>

          <TabsContent value="narratives">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold">Top 10 Narratives</h3>
                <TimeRangeSelector />
              </div>
              <NarrativeChart symbol={symbol} />
            </Card>
          </TabsContent>

          <TabsContent value="emotions">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold">Emotion Trends</h3>
                <TimeRangeSelector />
              </div>
              <EmotionChart symbol={symbol} />
            </Card>
          </TabsContent>

          <TabsContent value="volume">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold">Message Volume</h3>
                <TimeRangeSelector />
              </div>
              <VolumeChart symbol={symbol} />
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
            {mockMessages.map((msg) => (
              <MessageCard key={msg.id} {...msg} />
            ))}
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

function TimeRangeSelector() {
  return (
    <div className="flex gap-1">
      {["1H", "6H", "24H", "7D", "30D"].map((range) => (
        <Button
          key={range}
          variant={range === "24H" ? "default" : "ghost"}
          size="sm"
          className="px-3"
        >
          {range}
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
