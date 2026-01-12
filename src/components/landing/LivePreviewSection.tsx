import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { 
  TrendingUp, 
  TrendingDown, 
  Minus,
  ArrowUpRight,
  ArrowDownRight
} from "lucide-react";

// Mock trending data
const trendingSymbols = [
  { 
    symbol: "NVDA", 
    name: "NVIDIA Corp", 
    sentiment: 78, 
    change: 12.5, 
    volume: "245K",
    trend: "bullish" as const
  },
  { 
    symbol: "TSLA", 
    name: "Tesla Inc", 
    sentiment: 45, 
    change: -8.2, 
    volume: "189K",
    trend: "bearish" as const
  },
  { 
    symbol: "AAPL", 
    name: "Apple Inc", 
    sentiment: 62, 
    change: 3.1, 
    volume: "156K",
    trend: "bullish" as const
  },
  { 
    symbol: "SPY", 
    name: "S&P 500 ETF", 
    sentiment: 51, 
    change: 0.5, 
    volume: "312K",
    trend: "neutral" as const
  },
  { 
    symbol: "AMD", 
    name: "AMD Inc", 
    sentiment: 71, 
    change: 15.3, 
    volume: "178K",
    trend: "bullish" as const
  },
  { 
    symbol: "META", 
    name: "Meta Platforms", 
    sentiment: 68, 
    change: 7.8, 
    volume: "134K",
    trend: "bullish" as const
  },
];

export function LivePreviewSection() {
  return (
    <section className="py-24 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-glow opacity-50" />
      
      <div className="container mx-auto px-4 relative">
        <div className="text-center mb-12">
          <Badge variant="outline" className="mb-4">
            <div className="w-2 h-2 bg-bullish rounded-full mr-2 animate-pulse" />
            Live Data
          </Badge>
          <h2 className="text-3xl md:text-4xl font-display mb-4">
            Trending Right Now
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Real-time sentiment scores from the most active symbols on StockTwits
          </p>
        </div>

        {/* Trending Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto">
          {trendingSymbols.map((item, index) => (
            <TrendingCard key={item.symbol} {...item} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}

function TrendingCard({ 
  symbol, 
  name, 
  sentiment, 
  change, 
  volume,
  trend,
  index 
}: {
  symbol: string;
  name: string;
  sentiment: number;
  change: number;
  volume: string;
  trend: "bullish" | "bearish" | "neutral";
  index: number;
}) {
  const TrendIcon = trend === "bullish" ? TrendingUp : trend === "bearish" ? TrendingDown : Minus;
  const ChangeIcon = change >= 0 ? ArrowUpRight : ArrowDownRight;
  
  return (
    <Card 
      className="p-4 bg-gradient-card hover:shadow-glow transition-all hover:-translate-y-1 cursor-pointer group"
      style={{ animationDelay: `${index * 100}ms` }}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono font-semibold text-lg group-hover:text-primary transition-colors">
              ${symbol}
            </span>
            <Badge variant={trend}>{trend}</Badge>
          </div>
          <span className="text-sm text-muted-foreground">{name}</span>
        </div>
        <TrendIcon className={`h-5 w-5 ${
          trend === "bullish" ? "text-bullish" : 
          trend === "bearish" ? "text-bearish" : 
          "text-neutral"
        }`} />
      </div>
      
      <div className="flex items-end justify-between">
        <div>
          <div className="text-2xl font-display">{sentiment}</div>
          <div className="text-xs text-muted-foreground">Sentiment Score</div>
        </div>
        <div className="text-right">
          <div className={`flex items-center gap-1 text-sm font-medium ${
            change >= 0 ? "text-bullish" : "text-bearish"
          }`}>
            <ChangeIcon className="h-4 w-4" />
            {Math.abs(change)}%
          </div>
          <div className="text-xs text-muted-foreground">{volume} msgs</div>
        </div>
      </div>
      
      {/* Mini sentiment bar */}
      <div className="mt-3 h-1.5 bg-secondary rounded-full overflow-hidden">
        <div 
          className={`h-full rounded-full transition-all ${
            trend === "bullish" ? "bg-gradient-bullish" :
            trend === "bearish" ? "bg-gradient-bearish" :
            "bg-neutral"
          }`}
          style={{ width: `${sentiment}%` }}
        />
      </div>
    </Card>
  );
}
