import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SearchCommand } from "@/components/SearchCommand";
import { WatchlistManager } from "@/components/WatchlistManager";
import { 
  TrendingUp, 
  TrendingDown,
  Search,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  Bell,
  Star,
  Plus
} from "lucide-react";
import { Link } from "react-router-dom";
import { useTrending } from "@/hooks/use-stocktwits";
import { useDefaultWatchlist } from "@/hooks/use-watchlist";

// Mock alerts data (will be replaced with real alerts later)
const alerts = [
  { symbol: "NVDA", type: "Sentiment Surge", message: "Sentiment up 15% in last hour", time: "5 min ago", severity: "high" },
  { symbol: "TSLA", type: "Sentiment Flip", message: "Flipped from bullish to bearish", time: "23 min ago", severity: "medium" },
  { symbol: "AAPL", type: "Volume Spike", message: "3x baseline message volume", time: "1 hour ago", severity: "low" },
];

export default function Dashboard() {
  const [searchOpen, setSearchOpen] = useState(false);
  const [watchlistManagerOpen, setWatchlistManagerOpen] = useState(false);
  const { data: trending = [], isLoading: trendingLoading } = useTrending();
  const { data: watchlist, isLoading: watchlistLoading } = useDefaultWatchlist();

  // Get symbols from user's watchlist
  const watchlistSymbols = watchlist?.symbols || [];

  // Map watchlist symbols to display data using trending info
  const watchlistData = watchlistSymbols.map(symbol => {
    const trendingItem = trending.find(t => t.symbol === symbol);
    return {
      symbol,
      name: trendingItem?.name || symbol,
      sentiment: trendingItem?.sentiment || 50,
      change: trendingItem?.change || 0,
      trend: (trendingItem?.trend || 'neutral') as 'bullish' | 'bearish' | 'neutral',
    };
  });

  const isLoading = trendingLoading || watchlistLoading;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-display mb-2">Dashboard</h1>
            <p className="text-muted-foreground">Real-time sentiment intelligence overview</p>
          </div>
          
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              className="w-64 justify-start text-muted-foreground"
              onClick={() => setSearchOpen(true)}
            >
              <Search className="h-4 w-4 mr-2" />
              Search symbols...
              <kbd className="ml-auto pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                <span className="text-xs">⌘</span>K
              </kbd>
            </Button>
            <SearchCommand open={searchOpen} onOpenChange={setSearchOpen} />
            <Button variant="outline">
              <BarChart3 className="h-4 w-4 mr-2" />
              Analytics
            </Button>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Watchlist */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Star className="h-5 w-5 text-chart-5" />
                  Your Watchlist
                </h2>
                <Button variant="ghost" size="sm" onClick={() => setWatchlistManagerOpen(true)}>Manage</Button>
              </div>
              <WatchlistManager open={watchlistManagerOpen} onOpenChange={setWatchlistManagerOpen} />
              
              <div className="space-y-3">
                {isLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))
                ) : watchlistData.length === 0 ? (
                  <div className="text-center py-8">
                    <Star className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-muted-foreground mb-4">Your watchlist is empty</p>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setSearchOpen(true)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add symbols
                    </Button>
                  </div>
                ) : (
                  watchlistData.map((item) => (
                    <WatchlistItem key={item.symbol} {...item} />
                  ))
                )}
              </div>
            </Card>

            {/* Market Overview */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold">Market Sentiment Overview</h2>
                <Badge variant="glow">
                  <div className="w-2 h-2 bg-bullish rounded-full mr-2 animate-pulse" />
                  Live
                </Badge>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <OverviewCard 
                  label="Overall Market" 
                  value={62} 
                  trend="bullish" 
                  change={3.2}
                />
                <OverviewCard 
                  label="Tech Sector" 
                  value={71} 
                  trend="bullish" 
                  change={8.5}
                />
                <OverviewCard 
                  label="Meme Stocks" 
                  value={48} 
                  trend="neutral" 
                  change={-1.2}
                />
                <OverviewCard 
                  label="Crypto-Related" 
                  value={55} 
                  trend="bullish" 
                  change={5.7}
                />
              </div>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Alerts */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Bell className="h-5 w-5 text-primary" />
                  Recent Alerts
                </h2>
                <Button variant="ghost" size="sm">View All</Button>
              </div>
              
              <div className="space-y-4">
                {alerts.map((alert, idx) => (
                  <AlertItem key={idx} {...alert} />
                ))}
              </div>
            </Card>

            {/* Trending Now */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-bullish" />
                  Trending Now
                </h2>
                <Link to="/trending">
                  <Button variant="ghost" size="sm">See All</Button>
                </Link>
              </div>
              
              <div className="space-y-3">
                {trendingLoading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))
                ) : trending.length > 0 ? (
                  trending.slice(0, 4).map((item) => (
                    <TrendingItem 
                      key={item.symbol} 
                      symbol={item.symbol}
                      sentiment={item.sentiment}
                      volume={formatVolume(item.volume)}
                      trend={item.trend}
                    />
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No trending data available</p>
                )}
              </div>
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

function formatVolume(volume: number): string {
  if (volume >= 1000000) return `${(volume / 1000000).toFixed(1)}M`;
  if (volume >= 1000) return `${(volume / 1000).toFixed(0)}K`;
  return volume.toString();
}

function WatchlistItem({
  symbol, 
  name, 
  sentiment, 
  change, 
  trend 
}: {
  symbol: string;
  name: string;
  sentiment: number;
  change: number;
  trend: "bullish" | "bearish" | "neutral";
}) {
  const TrendIcon = trend === "bullish" ? TrendingUp : TrendingDown;
  const ChangeIcon = change >= 0 ? ArrowUpRight : ArrowDownRight;
  
  return (
    <Link 
      to={`/symbol/${symbol}`}
      className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors group"
    >
      <div className="flex items-center gap-4">
        <div>
          <div className="font-mono font-semibold group-hover:text-primary transition-colors">
            ${symbol}
          </div>
          <div className="text-sm text-muted-foreground">{name}</div>
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        <div className="text-right">
          <div className="flex items-center gap-2">
            <span className="font-semibold">{sentiment}</span>
            <TrendIcon className={`h-4 w-4 ${
              trend === "bullish" ? "text-bullish" : "text-bearish"
            }`} />
          </div>
          <div className={`text-sm flex items-center gap-1 ${
            change >= 0 ? "text-bullish" : "text-bearish"
          }`}>
            <ChangeIcon className="h-3 w-3" />
            {Math.abs(change)}%
          </div>
        </div>
        
        <div className="w-16 h-2 bg-secondary rounded-full overflow-hidden">
          <div 
            className={`h-full rounded-full ${
              trend === "bullish" ? "bg-gradient-bullish" : "bg-gradient-bearish"
            }`}
            style={{ width: `${sentiment}%` }}
          />
        </div>
      </div>
    </Link>
  );
}

function OverviewCard({
  label,
  value,
  trend,
  change
}: {
  label: string;
  value: number;
  trend: "bullish" | "bearish" | "neutral";
  change: number;
}) {
  const ChangeIcon = change >= 0 ? ArrowUpRight : ArrowDownRight;
  
  return (
    <div className="p-4 rounded-lg bg-secondary/30">
      <div className="text-sm text-muted-foreground mb-2">{label}</div>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-2xl font-display">{value}</span>
        <Badge variant={trend} className="text-xs">{trend}</Badge>
      </div>
      <div className={`text-sm flex items-center gap-1 ${
        change >= 0 ? "text-bullish" : "text-bearish"
      }`}>
        <ChangeIcon className="h-3 w-3" />
        {Math.abs(change)}% (24h)
      </div>
    </div>
  );
}

function AlertItem({
  symbol,
  type,
  message,
  time,
  severity
}: {
  symbol: string;
  type: string;
  message: string;
  time: string;
  severity: string;
}) {
  return (
    <div className="p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors cursor-pointer">
      <div className="flex items-center justify-between mb-1">
        <span className="font-mono font-semibold">${symbol}</span>
        <span className="text-xs text-muted-foreground">{time}</span>
      </div>
      <div className="text-sm font-medium text-primary mb-1">{type}</div>
      <div className="text-sm text-muted-foreground">{message}</div>
    </div>
  );
}

function TrendingItem({
  symbol,
  sentiment,
  volume,
  trend
}: {
  symbol: string;
  sentiment: number;
  volume: string;
  trend: "bullish" | "bearish" | "neutral";
}) {
  const TrendIcon = trend === "bullish" ? TrendingUp : TrendingDown;
  
  return (
    <Link 
      to={`/symbol/${symbol}`}
      className="flex items-center justify-between p-2 rounded-lg hover:bg-secondary/30 transition-colors group"
    >
      <div className="flex items-center gap-3">
        <TrendIcon className={`h-4 w-4 ${
          trend === "bullish" ? "text-bullish" : "text-bearish"
        }`} />
        <span className="font-mono font-semibold group-hover:text-primary transition-colors">
          ${symbol}
        </span>
      </div>
      <div className="flex items-center gap-4">
        <span className="text-sm">{sentiment}</span>
        <span className="text-xs text-muted-foreground">{volume} msgs</span>
      </div>
    </Link>
  );
}
