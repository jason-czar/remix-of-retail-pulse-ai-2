import { useState, useMemo } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  MessageSquare,
  Brain,
  ArrowUpRight,
  ArrowDownRight,
  ArrowLeft,
  Star
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useDefaultWatchlist } from "@/hooks/use-watchlist";
import { useMarketOverview } from "@/hooks/use-market-overview";
import { usePsychologyHistory } from "@/hooks/use-psychology-history";
import { SentimentHistoryChart } from "@/components/charts/SentimentHistoryChart";
import { PsychologyHistoryChart } from "@/components/charts/PsychologyHistoryChart";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { format, subDays } from "date-fns";
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Line,
  Area,
  Rectangle,
} from "recharts";

export default function AnalyticsPage() {
  const navigate = useNavigate();
  const [timeRange, setTimeRange] = useState<"7" | "14" | "30">("30");
  const days = parseInt(timeRange);
  
  const { data: watchlist, isLoading: watchlistLoading } = useDefaultWatchlist();
  const { overall, sectors, isLoading: marketLoading } = useMarketOverview();
  const { data: psychologyHistory, isLoading: psychologyLoading } = usePsychologyHistory(days);
  
  const watchlistSymbols = watchlist?.symbols || [];

  // Fetch aggregated sentiment history for all watchlist symbols
  const { data: aggregatedSentiment, isLoading: sentimentLoading } = useQuery({
    queryKey: ["aggregated-sentiment", watchlistSymbols.join(","), days],
    queryFn: async () => {
      if (watchlistSymbols.length === 0) return null;
      
      const startDate = subDays(new Date(), days);
      
      const { data, error } = await supabase
        .from("sentiment_history")
        .select("*")
        .in("symbol", watchlistSymbols)
        .gte("recorded_at", startDate.toISOString())
        .order("recorded_at", { ascending: true });
      
      if (error) throw error;
      return data || [];
    },
    enabled: watchlistSymbols.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch aggregated volume history
  const { data: volumeHistory, isLoading: volumeLoading } = useQuery({
    queryKey: ["aggregated-volume", watchlistSymbols.join(","), days],
    queryFn: async () => {
      if (watchlistSymbols.length === 0) return null;
      
      const startDate = subDays(new Date(), days);
      
      const { data, error } = await supabase
        .from("volume_history")
        .select("*")
        .in("symbol", watchlistSymbols)
        .gte("recorded_at", startDate.toISOString())
        .order("recorded_at", { ascending: true });
      
      if (error) throw error;
      return data || [];
    },
    enabled: watchlistSymbols.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  // Aggregate sentiment data by date
  const aggregatedSentimentData = useMemo(() => {
    if (!aggregatedSentiment || aggregatedSentiment.length === 0) return [];
    
    const byDate: Record<string, { 
      scores: number[]; 
      volumes: number[];
      bullish: number;
      bearish: number;
      neutral: number;
    }> = {};
    
    aggregatedSentiment.forEach((point: any) => {
      const date = format(new Date(point.recorded_at), "yyyy-MM-dd");
      if (!byDate[date]) {
        byDate[date] = { scores: [], volumes: [], bullish: 0, bearish: 0, neutral: 0 };
      }
      byDate[date].scores.push(point.sentiment_score);
      byDate[date].volumes.push(point.message_volume || 0);
      byDate[date].bullish += point.bullish_count || 0;
      byDate[date].bearish += point.bearish_count || 0;
      byDate[date].neutral += point.neutral_count || 0;
    });
    
    return Object.entries(byDate)
      .map(([date, data]) => ({
        date: format(new Date(date), "MMM d"),
        sortKey: date,
        avgSentiment: Math.round(data.scores.reduce((a, b) => a + b, 0) / data.scores.length),
        totalVolume: data.volumes.reduce((a, b) => a + b, 0),
        bullish: data.bullish,
        bearish: data.bearish,
        neutral: data.neutral,
        symbolCount: data.scores.length,
      }))
      .sort((a, b) => a.sortKey.localeCompare(b.sortKey));
  }, [aggregatedSentiment]);

  // Aggregate volume data by date
  const aggregatedVolumeData = useMemo(() => {
    if (!volumeHistory || volumeHistory.length === 0) return [];
    
    const byDate: Record<string, number[]> = {};
    
    volumeHistory.forEach((point: any) => {
      const date = format(new Date(point.recorded_at), "yyyy-MM-dd");
      if (!byDate[date]) {
        byDate[date] = [];
      }
      byDate[date].push(point.message_count || 0);
    });
    
    return Object.entries(byDate)
      .map(([date, volumes]) => ({
        date: format(new Date(date), "MMM d"),
        sortKey: date,
        totalVolume: volumes.reduce((a, b) => a + b, 0),
        avgVolume: Math.round(volumes.reduce((a, b) => a + b, 0) / volumes.length),
      }))
      .sort((a, b) => a.sortKey.localeCompare(b.sortKey));
  }, [volumeHistory]);

  // Calculate summary stats
  const summaryStats = useMemo(() => {
    const sentimentStats = {
      avgSentiment: 0,
      totalVolume: 0,
      volatility: 0,
      trend: "neutral" as "bullish" | "bearish" | "neutral",
      change: 0,
    };
    
    if (aggregatedSentimentData.length > 0) {
      const scores = aggregatedSentimentData.map(d => d.avgSentiment);
      sentimentStats.avgSentiment = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
      sentimentStats.totalVolume = aggregatedSentimentData.reduce((a, b) => a + b.totalVolume, 0);
      
      // Calculate volatility
      const mean = sentimentStats.avgSentiment;
      const variance = scores.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / scores.length;
      sentimentStats.volatility = Math.round(Math.sqrt(variance) * 10) / 10;
      
      // Calculate trend
      if (aggregatedSentimentData.length >= 2) {
        const recent = aggregatedSentimentData.slice(-Math.ceil(aggregatedSentimentData.length / 3));
        const older = aggregatedSentimentData.slice(0, Math.ceil(aggregatedSentimentData.length / 3));
        
        const recentAvg = recent.reduce((a, b) => a + b.avgSentiment, 0) / recent.length;
        const olderAvg = older.reduce((a, b) => a + b.avgSentiment, 0) / older.length;
        
        sentimentStats.change = Math.round((recentAvg - olderAvg) * 10) / 10;
        sentimentStats.trend = recentAvg > olderAvg + 3 ? "bullish" : recentAvg < olderAvg - 3 ? "bearish" : "neutral";
      }
    }
    
    return sentimentStats;
  }, [aggregatedSentimentData]);

  // Psychology trends from history
  const psychologyStats = useMemo(() => {
    if (!psychologyHistory || psychologyHistory.length === 0) {
      return { avgFearGreed: 50, dominantSignal: null, signalFrequency: {} };
    }
    
    const avgFearGreed = Math.round(
      psychologyHistory.reduce((a, b) => a + b.fear_greed_index, 0) / psychologyHistory.length
    );
    
    // Count signal frequencies
    const signalCounts: Record<string, number> = {};
    psychologyHistory.forEach(snapshot => {
      if (snapshot.dominant_signal) {
        signalCounts[snapshot.dominant_signal] = (signalCounts[snapshot.dominant_signal] || 0) + 1;
      }
    });
    
    const dominantSignal = Object.entries(signalCounts)
      .sort((a, b) => b[1] - a[1])[0]?.[0] || null;
    
    return { avgFearGreed, dominantSignal, signalFrequency: signalCounts };
  }, [psychologyHistory]);

  const isLoading = watchlistLoading || marketLoading || sentimentLoading || volumeLoading || psychologyLoading;

  return (
    <div className="min-h-screen bg-background dark:bg-transparent">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-display mb-2 flex items-center gap-3">
                <BarChart3 className="h-8 w-8 text-primary" />
                Analytics
              </h1>
              <p className="text-muted-foreground">
                Aggregated sentiment intelligence across your watchlist
              </p>
            </div>
          </div>
          
          <div className="flex gap-3">
            <Tabs value={timeRange} onValueChange={(v) => setTimeRange(v as "7" | "14" | "30")}>
              <TabsList className="glass-card">
                <TabsTrigger value="7">7D</TabsTrigger>
                <TabsTrigger value="14">14D</TabsTrigger>
                <TabsTrigger value="30">30D</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        {watchlistSymbols.length === 0 ? (
          <Card className="p-12 glass-card text-center">
            <Star className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">No Watchlist Symbols</h2>
            <p className="text-muted-foreground mb-6">
              Add symbols to your watchlist to see aggregated analytics
            </p>
            <Link to="/dashboard">
              <Button>Go to Dashboard</Button>
            </Link>
          </Card>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <SummaryCard
                icon={Activity}
                label="Avg Sentiment"
                value={summaryStats.avgSentiment}
                subtext={`${watchlistSymbols.length} symbols tracked`}
                trend={summaryStats.trend}
                isLoading={isLoading}
              />
              <SummaryCard
                icon={MessageSquare}
                label="Total Volume"
                value={formatNumber(summaryStats.totalVolume)}
                subtext={`Last ${days} days`}
                isLoading={isLoading}
              />
              <SummaryCard
                icon={TrendingUp}
                label="Volatility"
                value={summaryStats.volatility.toFixed(1)}
                subtext={summaryStats.volatility > 15 ? "High" : summaryStats.volatility > 8 ? "Medium" : "Low"}
                isLoading={isLoading}
              />
              <SummaryCard
                icon={Brain}
                label="Avg Fear/Greed"
                value={psychologyStats.avgFearGreed}
                subtext={psychologyStats.dominantSignal || "No signals"}
                isLoading={isLoading}
              />
            </div>

            {/* Main Charts */}
            <div className="grid lg:grid-cols-2 gap-6 mb-8">
              {/* Aggregated Sentiment Chart */}
              <Card className="p-6 glass-card">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <Activity className="h-5 w-5 text-primary" />
                    Watchlist Sentiment Trend
                  </h2>
                  <Badge variant="outline" className="text-xs">
                    {aggregatedSentimentData.length} days
                  </Badge>
                </div>
                
                {isLoading ? (
                  <Skeleton className="h-[300px] w-full" />
                ) : aggregatedSentimentData.length === 0 ? (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    No sentiment data available
                  </div>
                ) : (
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={aggregatedSentimentData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="sentimentAreaGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                        <XAxis
                          dataKey="date"
                          stroke="hsl(var(--muted-foreground))"
                          fontSize={11}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis
                          domain={[0, 100]}
                          stroke="hsl(var(--muted-foreground))"
                          fontSize={11}
                          tickLine={false}
                          axisLine={false}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px",
                            padding: "12px",
                          }}
                          formatter={(value: any, name: string) => {
                            if (name === "avgSentiment") return [value, "Avg Sentiment"];
                            return [value, name];
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="avgSentiment"
                          stroke="hsl(var(--primary))"
                          fill="url(#sentimentAreaGradient)"
                          strokeWidth={2}
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </Card>

              {/* Volume Distribution Chart */}
              <Card className="p-6 glass-card">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-primary" />
                    Message Volume
                  </h2>
                  <Badge variant="outline" className="text-xs">
                    {formatNumber(summaryStats.totalVolume)} total
                  </Badge>
                </div>
                
                {isLoading ? (
                  <Skeleton className="h-[300px] w-full" />
                ) : aggregatedSentimentData.length === 0 ? (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    No volume data available
                  </div>
                ) : (
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={aggregatedSentimentData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="volumeBarGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="hsl(var(--chart-2))" stopOpacity={0.8} />
                            <stop offset="100%" stopColor="hsl(var(--chart-2))" stopOpacity={0.3} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                        <XAxis
                          dataKey="date"
                          stroke="hsl(var(--muted-foreground))"
                          fontSize={11}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis
                          stroke="hsl(var(--muted-foreground))"
                          fontSize={11}
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(v) => formatNumber(v)}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px",
                            padding: "12px",
                          }}
                          formatter={(value: any) => [formatNumber(value), "Volume"]}
                        />
                        <Bar
                          dataKey="totalVolume"
                          fill="url(#volumeBarGradient)"
                          radius={[4, 4, 0, 0]}
                          shape={(props: any) => {
                            const { x, y, width, height, fill, radius } = props;
                            if (!height || height <= 0) return null;
                            return (
                              <g>
                                <Rectangle
                                  x={x}
                                  y={y}
                                  width={width}
                                  height={height}
                                  fill={fill}
                                  fillOpacity={0.7}
                                  stroke="hsl(var(--chart-2))"
                                  strokeOpacity={0.4}
                                  strokeWidth={0.5}
                                  radius={radius}
                                />
                                <Rectangle
                                  x={x + 1}
                                  y={y + 1}
                                  width={Math.max(0, width - 2)}
                                  height={Math.max(0, Math.min(height * 0.12, 4))}
                                  fill="white"
                                  fillOpacity={0.15}
                                  radius={[4, 4, 0, 0]}
                                />
                              </g>
                            );
                          }}
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </Card>
            </div>

            {/* Sector & Psychology */}
            <div className="grid lg:grid-cols-3 gap-6 mb-8">
              {/* Sector Breakdown */}
              <Card className="p-6 glass-card">
                <h2 className="text-lg font-semibold mb-6">Market Sectors</h2>
                <div className="space-y-4">
                  {marketLoading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))
                  ) : (
                    <>
                      <SectorItem
                        label={overall.label}
                        value={overall.value}
                        trend={overall.trend}
                        change={overall.change}
                        isPrimary
                      />
                      {sectors.map((sector) => (
                        <SectorItem
                          key={sector.label}
                          label={sector.label}
                          value={sector.value}
                          trend={sector.trend}
                          change={sector.change}
                        />
                      ))}
                    </>
                  )}
                </div>
              </Card>

              {/* Psychology History */}
              <Card className="p-6 glass-card lg:col-span-2">
                <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
                  <Brain className="h-5 w-5 text-primary" />
                  Psychology Trends
                </h2>
                <PsychologyHistoryChart days={days} />
              </Card>
            </div>

            {/* Symbol Breakdown */}
            <Card className="p-6 glass-card">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold">Symbol Performance</h2>
                <Badge variant="secondary">{watchlistSymbols.length} symbols</Badge>
              </div>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {watchlistSymbols.map((symbol) => (
                  <SymbolCard key={symbol} symbol={symbol} days={days} />
                ))}
              </div>
            </Card>
          </>
        )}
      </main>

      <Footer />
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  subtext,
  trend,
  isLoading,
}: {
  icon: any;
  label: string;
  value: string | number;
  subtext: string;
  trend?: "bullish" | "bearish" | "neutral";
  isLoading?: boolean;
}) {
  if (isLoading) {
    return <Skeleton className="h-28 w-full" />;
  }

  return (
    <Card className="p-4 glass-card">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="h-4 w-4 text-primary" />
        <span className="text-sm text-muted-foreground">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-2xl font-display">{value}</span>
        {trend && (
          <Badge variant={trend} className="text-xs">
            {trend}
          </Badge>
        )}
      </div>
      <div className="text-xs text-muted-foreground mt-1">{subtext}</div>
    </Card>
  );
}

function SectorItem({
  label,
  value,
  trend,
  change,
  isPrimary,
}: {
  label: string;
  value: number;
  trend: "bullish" | "bearish" | "neutral";
  change: number;
  isPrimary?: boolean;
}) {
  const ChangeIcon = change >= 0 ? ArrowUpRight : ArrowDownRight;
  
  return (
    <div className={`p-3 rounded-lg ${isPrimary ? "bg-primary/10 border border-primary/20" : "bg-secondary/40"}`}>
      <div className="flex items-center justify-between mb-1">
        <span className={`text-sm ${isPrimary ? "font-semibold" : ""}`}>{label}</span>
        <Badge variant={trend} className="text-xs">{trend}</Badge>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-lg font-semibold">{value}</span>
        <span className={`text-sm flex items-center gap-1 ${change >= 0 ? "text-bullish" : "text-bearish"}`}>
          <ChangeIcon className="h-3 w-3" />
          {Math.abs(change)}%
        </span>
      </div>
    </div>
  );
}

function SymbolCard({ symbol, days }: { symbol: string; days: number }) {
  const { data, isLoading } = useQuery({
    queryKey: ["symbol-sentiment-summary", symbol, days],
    queryFn: async () => {
      const startDate = subDays(new Date(), days);
      
      const { data, error } = await supabase
        .from("sentiment_history")
        .select("sentiment_score, message_volume")
        .eq("symbol", symbol)
        .gte("recorded_at", startDate.toISOString())
        .order("recorded_at", { ascending: false })
        .limit(30);
      
      if (error) throw error;
      
      if (!data || data.length === 0) {
        return { avgSentiment: 50, totalVolume: 0, dataPoints: 0 };
      }
      
      const avgSentiment = Math.round(
        data.reduce((a, b) => a + b.sentiment_score, 0) / data.length
      );
      const totalVolume = data.reduce((a, b) => a + (b.message_volume || 0), 0);
      
      return { avgSentiment, totalVolume, dataPoints: data.length };
    },
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return <Skeleton className="h-20 w-full" />;
  }

  const trend = (data?.avgSentiment ?? 50) > 55 ? "bullish" : (data?.avgSentiment ?? 50) < 45 ? "bearish" : "neutral";
  const TrendIcon = trend === "bullish" ? TrendingUp : trend === "bearish" ? TrendingDown : Activity;

  return (
    <Link to={`/symbol/${symbol}`}>
      <div className="p-4 glass-list-item group">
        <div className="flex items-center justify-between mb-2">
          <span className="font-mono font-semibold group-hover:text-primary transition-colors">
            ${symbol}
          </span>
          <TrendIcon className={`h-4 w-4 ${trend === "bullish" ? "text-bullish" : trend === "bearish" ? "text-bearish" : "text-muted-foreground"}`} />
        </div>
        <div className="flex items-center justify-between text-sm">
          <div>
            <span className="font-semibold">{data?.avgSentiment ?? 50}</span>
            <span className="text-muted-foreground ml-1">sentiment</span>
          </div>
          <span className="text-muted-foreground text-xs">
            {formatNumber(data?.totalVolume ?? 0)} msgs
          </span>
        </div>
      </div>
    </Link>
  );
}

function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}
