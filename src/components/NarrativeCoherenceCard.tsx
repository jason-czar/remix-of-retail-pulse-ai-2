import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import { useLatestPsychologySnapshot } from "@/hooks/use-psychology-snapshot";
import { ConfidenceBadge, getConfidenceLevel, ConfidenceDrivers } from "@/components/ui/ConfidenceBadge";
import { 
  Activity, 
  Target, 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown,
  Minus,
  Info 
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NarrativeCoherenceCardProps {
  symbol: string;
}

interface NarrativeCoherence {
  score: number;
  entropy: number;
  emotion_convergence: number;
  velocity_stability: number;
  dominant_narrative_share: number;
  risk_level: "low" | "moderate" | "high";
  risk_drivers: string[];
}

function getRiskColor(level: "low" | "moderate" | "high"): string {
  switch (level) {
    case "low": return "text-bullish";
    case "moderate": return "text-amber-500";
    case "high": return "text-bearish";
  }
}

function getRiskBg(level: "low" | "moderate" | "high"): string {
  switch (level) {
    case "low": return "bg-bullish";
    case "moderate": return "bg-amber-500";
    case "high": return "bg-bearish";
  }
}

function getScoreLabel(score: number): string {
  if (score >= 70) return "Strong Alignment";
  if (score >= 50) return "Moderate Alignment";
  if (score >= 30) return "Mixed Signals";
  return "High Divergence";
}

function getScoreDescription(score: number): string {
  if (score >= 70) return "Retail messaging is focused and consistent. Lower volatility risk.";
  if (score >= 50) return "Some narrative divergence present. Monitor for shifts.";
  if (score >= 30) return "Multiple competing narratives. Higher communication risk.";
  return "Scattered attention across conflicting themes. Elevated volatility risk.";
}

// Compute NCS from observed_state if not present
function computeCoherenceFromState(observedState: any): NarrativeCoherence | null {
  if (!observedState?.narratives?.length) return null;
  
  const narratives = observedState.narratives;
  const emotions = observedState.emotions || [];
  
  // 1. Calculate entropy (Shannon entropy normalized 0-1)
  // Lower entropy = more concentrated = better coherence
  const totalPrevalence = narratives.reduce((sum: number, n: any) => sum + (n.prevalence_pct || 0), 0);
  let entropy = 0;
  if (totalPrevalence > 0) {
    for (const n of narratives) {
      const p = (n.prevalence_pct || 0) / totalPrevalence;
      if (p > 0) entropy -= p * Math.log2(p);
    }
    // Normalize by max possible entropy (log2 of count)
    const maxEntropy = Math.log2(narratives.length);
    entropy = maxEntropy > 0 ? entropy / maxEntropy : 0;
  }
  
  // 2. Emotion convergence - are emotions aligned in polarity?
  const bullishEmotions = emotions.filter((e: any) => e.polarity === "bullish").length;
  const bearishEmotions = emotions.filter((e: any) => e.polarity === "bearish").length;
  const totalPolarized = bullishEmotions + bearishEmotions;
  const emotionConvergence = totalPolarized > 0 
    ? Math.abs(bullishEmotions - bearishEmotions) / totalPolarized 
    : 0.5;
  
  // 3. Velocity stability - are narratives changing erratically?
  const velocityMagnitudes = narratives.map((n: any) => n.velocity?.magnitude || 0);
  const avgVelocity = velocityMagnitudes.reduce((a: number, b: number) => a + b, 0) / velocityMagnitudes.length;
  const velocityStability = Math.max(0, 1 - avgVelocity); // Lower velocity = more stable
  
  // 4. Dominant narrative share
  const dominantShare = narratives[0]?.prevalence_pct || 0;
  
  // Composite score (0-100)
  // Weight: 30% inverse entropy, 25% emotion convergence, 25% velocity stability, 20% dominant share
  const score = Math.round(
    (1 - entropy) * 30 +
    emotionConvergence * 25 +
    velocityStability * 25 +
    (dominantShare / 100) * 20
  );
  
  // Determine risk level and drivers
  const riskDrivers: string[] = [];
  let riskLevel: "low" | "moderate" | "high" = "low";
  
  if (entropy > 0.7) riskDrivers.push("Scattered narrative attention");
  if (emotionConvergence < 0.3) riskDrivers.push("Conflicting emotional signals");
  if (velocityStability < 0.4) riskDrivers.push("Rapid narrative shifts");
  if (dominantShare < 20) riskDrivers.push("No dominant narrative");
  
  if (riskDrivers.length >= 3 || score < 30) riskLevel = "high";
  else if (riskDrivers.length >= 1 || score < 50) riskLevel = "moderate";
  
  return {
    score,
    entropy: Math.round(entropy * 100) / 100,
    emotion_convergence: Math.round(emotionConvergence * 100) / 100,
    velocity_stability: Math.round(velocityStability * 100) / 100,
    dominant_narrative_share: dominantShare,
    risk_level: riskLevel,
    risk_drivers: riskDrivers,
  };
}

export function NarrativeCoherenceCard({ symbol }: NarrativeCoherenceCardProps) {
  const { data: snapshot, isLoading, error } = useLatestPsychologySnapshot(symbol);
  
  if (isLoading) {
    return (
      <Card className="p-4 glass-card">
        <div className="flex items-center gap-3 mb-4">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <div className="flex-1">
            <Skeleton className="h-5 w-40 mb-1" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
        <Skeleton className="h-3 w-full mb-4" />
        <div className="grid grid-cols-3 gap-3">
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </div>
      </Card>
    );
  }
  
  if (error || !snapshot) {
    return null;
  }
  
  // Prefer server-computed NCS, fallback to client-side calculation
  const serverCoherence = (snapshot.observed_state as any)?.coherence as NarrativeCoherence | undefined;
  const clientCoherence = serverCoherence ? null : computeCoherenceFromState(snapshot.observed_state);
  const coherence = serverCoherence || clientCoherence;
  const isServerComputed = !!serverCoherence;
  
  if (!coherence) return null;
  
  const confidenceLevel = getConfidenceLevel(snapshot.data_confidence.score);
  
  return (
    <Card className="p-4 md:p-5 glass-card h-full flex flex-col">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-semibold text-sm md:text-base">Narrative Coherence</h3>
          <div className="flex items-center gap-1.5">
            <p className="text-xs text-muted-foreground">{getScoreLabel(coherence.score)}</p>
            {!isServerComputed && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 border-muted-foreground/30">
                      Estimated
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">Computed client-side (legacy snapshot)</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={cn("text-2xl font-display", getRiskColor(coherence.risk_level))}>
            {coherence.score}
          </span>
          <ConfidenceBadge level={confidenceLevel} context="coherence" />
        </div>
      </div>
      
      {/* Score bar */}
      <div className="mb-4">
        <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary">
          <div 
            className={cn("h-full transition-all duration-500", getRiskBg(coherence.risk_level))}
            style={{ width: `${coherence.score}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground mt-2">{getScoreDescription(coherence.score)}</p>
      </div>
      
      {/* Component metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="p-3 rounded-lg bg-secondary/30">
                <div className="text-[10px] text-muted-foreground mb-1">Focus</div>
                <div className="text-sm font-medium">{Math.round((1 - coherence.entropy) * 100)}%</div>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">How concentrated attention is on key narratives (inverse of entropy)</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="p-3 rounded-lg bg-secondary/30">
                <div className="text-[10px] text-muted-foreground mb-1">Emotion Alignment</div>
                <div className="text-sm font-medium">{Math.round(coherence.emotion_convergence * 100)}%</div>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">Whether emotions are aligned (bullish vs bearish consensus)</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="p-3 rounded-lg bg-secondary/30">
                <div className="text-[10px] text-muted-foreground mb-1">Stability</div>
                <div className="text-sm font-medium">{Math.round(coherence.velocity_stability * 100)}%</div>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">How stable narratives are (low velocity = stable)</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="p-3 rounded-lg bg-secondary/30">
                <div className="text-[10px] text-muted-foreground mb-1">Top Narrative</div>
                <div className="text-sm font-medium">{coherence.dominant_narrative_share.toFixed(0)}%</div>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">Share of attention on the dominant narrative</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      
      {/* Risk drivers */}
      {coherence.risk_drivers.length > 0 && (
        <div className="pt-3 border-t border-border/30">
          <div className="flex items-center gap-1.5 mb-2">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
            <span className="text-xs font-medium text-amber-500">Risk Drivers</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {coherence.risk_drivers.map((driver, idx) => (
              <Badge key={idx} variant="outline" className="text-[10px] border-amber-500/30 text-amber-400 bg-amber-500/5">
                {driver}
              </Badge>
            ))}
          </div>
        </div>
      )}
      
      {/* Confidence drivers - pushed to bottom */}
      <div className="pt-3 mt-auto border-t border-border/30">
        <ConfidenceDrivers drivers={snapshot.data_confidence.drivers} />
      </div>
    </Card>
  );
}
