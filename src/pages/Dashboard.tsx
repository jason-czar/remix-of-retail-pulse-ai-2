import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SearchCommand } from "@/components/SearchCommand";
import { WatchlistManager } from "@/components/WatchlistManager";
import { MarketPsychologyCard } from "@/components/MarketPsychologyCard";
import { PsychologyHistoryChart } from "@/components/charts/PsychologyHistoryChart";
import { TrendingUp, TrendingDown, Search, ArrowUpRight, ArrowDownRight, BarChart3, Bell, Star, Plus, AlertCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { useTrending } from "@/hooks/use-stocktwits";
import { useDefaultWatchlist } from "@/hooks/use-watchlist";
import { useAlerts, Alert } from "@/hooks/use-alerts";
import { useMarketOverview } from "@/hooks/use-market-overview";
import { formatDistanceToNow } from "date-fns";
import { getAlertTypeLabel, getAlertTypeIcon, isEmotionAlert } from "@/lib/alert-types";
export default function Dashboard() {
  const [searchOpen, setSearchOpen] = useState(false);
  const [watchlistManagerOpen, setWatchlistManagerOpen] = useState(false);
  const {
    data: trending = [],
    isLoading: trendingLoading
  } = useTrending();
  const {
    data: watchlist,
    isLoading: watchlistLoading
  } = useDefaultWatchlist();
  const {
    data: alerts = [],
    isLoading: alertsLoading
  } = useAlerts();
  const {
    overall,
    sectors,
    isLoading: marketLoading
  } = useMarketOverview();

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
      trend: (trendingItem?.trend || 'neutral') as 'bullish' | 'bearish' | 'neutral'
    };
  });
  const isLoading = trendingLoading || watchlistLoading;
  return <div className="min-h-screen bg-background">
      
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-display mb-2">Dashboard</h1>
            <p className="text-muted-foreground">Real-time sentiment intelligence overview</p>
          </div>
          
          <div className="flex gap-3">
            <Button variant="outline" className="w-64 justify-start text-muted-foreground" onClick={() => setSearchOpen(true)}>
              <Search className="h-4 w-4 mr-2" />
              Search symbols...
              <kbd className="ml-auto pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                <span className="text-xs">⌘</span>K
              </kbd>
            </Button>
            <SearchCommand open={searchOpen} onOpenChange={setSearchOpen} />
            <Link to="/analytics">
              <Button variant="outline">
                <BarChart3 className="h-4 w-4 mr-2" />
                Analytics
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Watchlist */}
            <Card className="p-6 glass-card">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  
                  Your Watchlist
                </h2>
                <Button variant="ghost" size="sm" onClick={() => setWatchlistManagerOpen(true)}>Manage</Button>
              </div>
              <WatchlistManager open={watchlistManagerOpen} onOpenChange={setWatchlistManagerOpen} />
              
              <div className="space-y-3">
                {isLoading ? Array.from({
                length: 3
              }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />) : watchlistData.length === 0 ? <div className="text-center py-8">
                    <Star className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-muted-foreground mb-4">Your watchlist is empty</p>
                    <Button variant="outline" size="sm" onClick={() => setSearchOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add symbols
                    </Button>
                  </div> : watchlistData.map(item => <WatchlistItem key={item.symbol} {...item} />)}
              </div>
            </Card>

            {/* Market Overview */}
            <Card className="p-6 glass-card">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold">Market Sentiment Overview</h2>
                <Badge variant="glow">
                  <div className="w-2 h-2 bg-bullish rounded-full mr-2 animate-pulse" />
                  Live
                </Badge>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {marketLoading ? Array.from({
                length: 4
              }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />) : <>
                    <OverviewCard label={overall.label} value={overall.value} trend={overall.trend} change={overall.change} />
                    {sectors.slice(0, 3).map(sector => <OverviewCard key={sector.label} label={sector.label} value={sector.value} trend={sector.trend} change={sector.change} />)}
                  </>}
              </div>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Market Psychology */}
            <MarketPsychologyCard symbols={watchlistSymbols} />

            {/* Psychology History Chart */}
            <PsychologyHistoryChart days={30} />

            {/* Alerts */}
            <Card className="p-6 glass-card">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Bell className="h-5 w-5 text-primary" />
                  Recent Alerts
                  {alerts.length > 0 && <Badge variant="secondary" className="text-xs">
                      {alerts.filter(a => a.is_active).length}
                    </Badge>}
                </h2>
                <Link to="/settings">
                  <Button variant="ghost" size="sm">View All</Button>
                </Link>
              </div>
              
              <div className="space-y-4">
                {alertsLoading ? Array.from({
                length: 3
              }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />) : alerts.length === 0 ? <div className="text-center py-6">
                    <AlertCircle className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No alerts set up yet</p>
                    <Link to="/settings">
                      <Button variant="link" size="sm" className="mt-2">
                        Create your first alert
                      </Button>
                    </Link>
                  </div> : alerts.slice(0, 3).map(alert => <RealAlertItem key={alert.id} alert={alert} />)}
              </div>
            </Card>

            {/* Trending Now */}
            <Card className="p-6 glass-card">
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
                {trendingLoading ? Array.from({
                length: 4
              }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />) : trending.length > 0 ? trending.slice(0, 4).map(item => <TrendingItem key={item.symbol} symbol={item.symbol} sentiment={item.sentiment} volume={formatVolume(item.volume)} trend={item.trend} />) : <p className="text-sm text-muted-foreground">No trending data available</p>}
              </div>
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>;
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
  return <Link to={`/symbol/${symbol}`} className="flex items-center justify-between p-3 glass-list-item group">
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
            <TrendIcon className={`h-4 w-4 ${trend === "bullish" ? "text-bullish" : "text-bearish"}`} />
          </div>
          <div className={`text-sm flex items-center gap-1 ${change >= 0 ? "text-bullish" : "text-bearish"}`}>
            <ChangeIcon className="h-3 w-3" />
            {Math.abs(change)}%
          </div>
        </div>
        
        <div className="w-16 h-2 bg-secondary rounded-full overflow-hidden">
          <div className={`h-full rounded-full ${trend === "bullish" ? "bg-gradient-bullish" : "bg-gradient-bearish"}`} style={{
          width: `${sentiment}%`
        }} />
        </div>
      </div>
    </Link>;
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
  return <Card className="p-4 bg-secondary/40 dark:bg-white/[0.04] backdrop-blur-sm rounded-lg border border-border/30 dark:border-white/[0.06]">
      <div className="text-sm text-muted-foreground mb-2">{label}</div>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-2xl font-display">{value}</span>
        <Badge variant={trend} className="text-xs">{trend}</Badge>
      </div>
      <div className={`text-sm flex items-center gap-1 ${change >= 0 ? "text-bullish" : "text-bearish"}`}>
        <ChangeIcon className="h-3 w-3" />
        {Math.abs(change)}% (24h)
      </div>
    </Card>;
}
function RealAlertItem({
  alert
}: {
  alert: Alert;
}) {
  const typeLabel = getAlertTypeLabel(alert.alert_type);
  const isEmotion = isEmotionAlert(alert.alert_type);
  const Icon = getAlertTypeIcon(alert.alert_type);
  const timeAgo = formatDistanceToNow(new Date(alert.created_at), {
    addSuffix: true
  });
  const getMessage = () => {
    if (alert.threshold) {
      return `Threshold: ${alert.threshold}%`;
    }
    return "No threshold set";
  };
  return <Link to={`/symbol/${alert.symbol}`} className="block p-3 glass-list-item">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded ${isEmotion ? "bg-accent/20 text-accent" : "bg-primary/20 text-primary"}`}>
            <Icon className="h-3 w-3" />
          </div>
          <span className="font-mono font-semibold">${alert.symbol}</span>
        </div>
        <div className="flex items-center gap-2">
          {!alert.is_active && <Badge variant="secondary" className="text-xs">Paused</Badge>}
          <span className="text-xs text-muted-foreground">{timeAgo}</span>
        </div>
      </div>
      <div className={`text-sm font-medium mb-1 ${isEmotion ? "text-accent" : "text-primary"}`}>
        {typeLabel}
      </div>
      <div className="text-sm text-muted-foreground">{getMessage()}</div>
    </Link>;
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
  return <Link to={`/symbol/${symbol}`} className="flex items-center justify-between p-2 glass-list-item group">
      <div className="flex items-center gap-3">
        <TrendIcon className={`h-4 w-4 ${trend === "bullish" ? "text-bullish" : "text-bearish"}`} />
        <span className="font-mono font-semibold group-hover:text-primary transition-colors">
          ${symbol}
        </span>
      </div>
      <div className="flex items-center gap-4">
        <span className="text-sm">{sentiment}</span>
        <span className="text-xs text-muted-foreground">{volume} msgs</span>
      </div>
    </Link>;
}