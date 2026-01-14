import { useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Brain,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  Flame,
  Heart,
  Zap,
  Target,
  Sparkles,
  Save,
  CheckCircle,
  Loader2,
} from "lucide-react";
import { useMarketPsychology, MarketPsychologyData } from "@/hooks/use-market-psychology";
import { useSavePsychologySnapshot, useLatestPsychologySnapshot } from "@/hooks/use-psychology-history";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { formatDistanceToNow } from "date-fns";

interface MarketPsychologyCardProps {
  symbols: string[];
  showSaveButton?: boolean;
}

const EMOTION_ICONS: Record<string, React.ElementType> = {
  FOMO: Flame,
  Greed: Target,
  Fear: AlertTriangle,
  Capitulation: Heart,
  Euphoria: Zap,
  Regret: Sparkles,
};

function FearGreedGauge({ value, label }: { value: number; label: string }) {
  // Color based on value: red (fear) to green (greed)
  const getColor = () => {
    if (value <= 20) return "bg-red-500";
    if (value <= 40) return "bg-orange-500";
    if (value <= 60) return "bg-yellow-500";
    if (value <= 80) return "bg-lime-500";
    return "bg-green-500";
  };

  const getTextColor = () => {
    if (value <= 20) return "text-red-500";
    if (value <= 40) return "text-orange-500";
    if (value <= 60) return "text-yellow-500";
    if (value <= 80) return "text-lime-500";
    return "text-green-500";
  };

  return (
    <div className="text-center">
      <div className="relative w-32 h-32 mx-auto mb-3">
        {/* Background circle */}
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            className="text-secondary"
          />
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            strokeDasharray={`${value * 2.83} 283`}
            strokeLinecap="round"
            className={getTextColor()}
          />
        </svg>
        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-3xl font-display font-bold ${getTextColor()}`}>{value}</span>
        </div>
      </div>
      <Badge 
        variant="outline" 
        className={`${getTextColor()} border-current`}
      >
        {label}
      </Badge>
    </div>
  );
}

function SignalCard({ 
  signal 
}: { 
  signal: MarketPsychologyData["signals"][0] 
}) {
  const Icon = signal.type === "bullish" ? TrendingUp : signal.type === "bearish" ? TrendingDown : Minus;
  const colorClass = signal.type === "bullish" 
    ? "bg-bullish/10 border-bullish/20 text-bullish" 
    : signal.type === "bearish" 
      ? "bg-bearish/10 border-bearish/20 text-bearish" 
      : "bg-muted";

  return (
    <div className={`p-3 rounded-lg border ${colorClass}`}>
      <div className="flex items-center gap-2 mb-1">
        <Icon className="h-4 w-4" />
        <span className="font-medium text-sm">{signal.label}</span>
        <span className="ml-auto text-xs opacity-70">{signal.confidence}%</span>
      </div>
      <p className="text-xs opacity-80">{signal.description}</p>
    </div>
  );
}

function EmotionBreakdown({ emotions }: { emotions: MarketPsychologyData["emotionBreakdown"] }) {
  const signalEmotions = emotions.filter((e) => 
    ["FOMO", "Greed", "Fear", "Capitulation", "Euphoria", "Regret"].includes(e.name)
  ).slice(0, 4);

  if (signalEmotions.length === 0) return null;

  return (
    <div className="space-y-2">
      <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
        Signal Emotions
      </h4>
      <div className="grid grid-cols-2 gap-2">
        {signalEmotions.map((emotion) => {
          const Icon = EMOTION_ICONS[emotion.name] || Brain;
          return (
            <div 
              key={emotion.name} 
              className="flex items-center gap-2 p-2 rounded bg-secondary/30"
            >
              <Icon className="h-3.5 w-3.5 text-accent" />
              <span className="text-xs flex-1">{emotion.name}</span>
              <span className="text-xs font-mono text-muted-foreground">{emotion.score}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SymbolMini({ 
  symbol, 
  dominantEmotion, 
  fearGreed 
}: { 
  symbol: string; 
  dominantEmotion: string; 
  fearGreed: number;
}) {
  const color = fearGreed < 40 ? "text-bearish" : fearGreed > 60 ? "text-bullish" : "text-muted-foreground";
  
  return (
    <Link 
      to={`/symbol/${symbol}`}
      className="flex items-center justify-between p-2 rounded hover:bg-secondary/50 transition-colors group"
    >
      <span className="font-mono text-sm font-medium group-hover:text-primary">${symbol}</span>
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">{dominantEmotion}</span>
        <span className={`text-xs font-mono ${color}`}>{fearGreed}</span>
      </div>
    </Link>
  );
}

export function MarketPsychologyCard({ symbols, showSaveButton = true }: MarketPsychologyCardProps) {
  const { user } = useAuth();
  const psychology = useMarketPsychology(symbols);
  const saveSnapshot = useSavePsychologySnapshot();
  const { data: latestSnapshot } = useLatestPsychologySnapshot();

  // Check if we have a recent snapshot (within last hour)
  const hasRecentSnapshot = latestSnapshot && 
    new Date().getTime() - new Date(latestSnapshot.recorded_at).getTime() < 60 * 60 * 1000;

  const handleSaveSnapshot = async () => {
    if (!psychology.hasData) return;
    await saveSnapshot.mutateAsync({ ...psychology, symbols });
  };

  if (psychology.isLoading) {
    return (
      <Card className="p-6 glass-card">
        <div className="flex items-center gap-2 mb-6">
          <Brain className="h-5 w-5 text-accent" />
          <h3 className="text-lg font-semibold">Market Psychology</h3>
        </div>
        <div className="space-y-4">
          <Skeleton className="h-32 w-32 rounded-full mx-auto" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      </Card>
    );
  }

  if (!psychology.hasData || symbols.length === 0) {
    return (
      <Card className="p-6 glass-card">
        <div className="flex items-center gap-2 mb-6">
          <Brain className="h-5 w-5 text-accent" />
          <h3 className="text-lg font-semibold">Market Psychology</h3>
        </div>
        <div className="text-center py-8">
          <Brain className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">
            Add symbols to your watchlist to see market psychology
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 glass-card">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-accent" />
          <h3 className="text-lg font-semibold">Market Psychology</h3>
        </div>
        <div className="flex items-center gap-2">
          {showSaveButton && user && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSaveSnapshot}
              disabled={saveSnapshot.isPending || hasRecentSnapshot}
              className="h-7 px-2"
            >
              {saveSnapshot.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : hasRecentSnapshot ? (
                <CheckCircle className="h-3.5 w-3.5 text-bullish" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
            </Button>
          )}
          <Badge variant="secondary" className="text-xs">
            {symbols.length} symbol{symbols.length !== 1 ? "s" : ""}
          </Badge>
        </div>
      </div>

      {/* Last saved indicator */}
      {latestSnapshot && (
        <p className="text-xs text-muted-foreground text-center mb-4">
          Last saved {formatDistanceToNow(new Date(latestSnapshot.recorded_at), { addSuffix: true })}
        </p>
      )}

      {/* Fear/Greed Gauge */}
      <FearGreedGauge 
        value={psychology.fearGreedIndex} 
        label={psychology.fearGreedLabel} 
      />

      {/* Signals */}
      {psychology.signals.length > 0 && (
        <div className="mt-6 space-y-2">
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Active Signals
          </h4>
          <div className="space-y-2">
            {psychology.signals.map((signal, idx) => (
              <SignalCard key={idx} signal={signal} />
            ))}
          </div>
        </div>
      )}

      {/* Emotion Breakdown */}
      <div className="mt-6">
        <EmotionBreakdown emotions={psychology.emotionBreakdown} />
      </div>

      {/* Symbol Breakdown */}
      {psychology.symbolBreakdown.length > 0 && (
        <div className="mt-6 space-y-2">
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            By Symbol
          </h4>
          <div className="max-h-40 overflow-y-auto space-y-1">
            {psychology.symbolBreakdown.map((item) => (
              <SymbolMini key={item.symbol} {...item} />
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
