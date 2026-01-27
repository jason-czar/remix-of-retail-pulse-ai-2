import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HelpCircle, TrendingUp, TrendingDown, Activity, Brain, BarChart3, Target, AlertTriangle, Gauge } from "lucide-react";
import { cn } from "@/lib/utils";

interface GlossaryEntry {
  term: string;
  shortDescription: string;
  fullDescription: string;
  calculation?: string;
  interpretation?: string;
  icon?: React.ElementType;
}

const CONFIDENCE_ENTRIES: GlossaryEntry[] = [
  {
    term: "High Confidence",
    shortDescription: "Strong, reliable signal",
    fullDescription: "Indicates 70%+ relevant data coverage with consistent patterns across multiple sources. Analysis is backed by high message volume, diverse author participation, and stable patterns over time.",
    calculation: "Based on message volume (70%+ relevant), 10+ historical episodes, or strong pattern alignment.",
    interpretation: "Signals can be treated as actionable insights for decision-making.",
    icon: TrendingUp,
  },
  {
    term: "Moderate Confidence",
    shortDescription: "Reasonable signal, verify externally",
    fullDescription: "Indicates 40-70% data coverage with some consistency. The signal is meaningful but may have gaps or mixed indicators.",
    calculation: "Based on 40-70% relevant messages, 5-9 historical episodes, or partial pattern matches.",
    interpretation: "Consider cross-referencing with other sources before acting on these signals.",
    icon: Activity,
  },
  {
    term: "Experimental",
    shortDescription: "Limited data, directional only",
    fullDescription: "Indicates less than 40% data coverage or fewer than 5 historical episodes. The signal should be treated as directional guidance only.",
    calculation: "Based on <40% relevant messages, <5 historical episodes, or weak pattern alignment.",
    interpretation: "Not recommended for actionable decisions. Use for early awareness only.",
    icon: AlertTriangle,
  },
];

const METRIC_ENTRIES: GlossaryEntry[] = [
  {
    term: "Sentiment Score",
    shortDescription: "Overall market mood (0-100)",
    fullDescription: "A composite score measuring the collective mood of retail investors based on social message analysis. Higher scores indicate bullish sentiment, lower scores indicate bearish sentiment.",
    calculation: "Weighted average of bullish/bearish message classifications, normalized to 0-100 scale.",
    interpretation: "50 = neutral, >60 = bullish bias, <40 = bearish bias. Extreme readings (>80 or <20) often precede reversals.",
    icon: Gauge,
  },
  {
    term: "NCS (Narrative Coherence Score)",
    shortDescription: "Message unity vs. fragmentation (0-100)",
    fullDescription: "Measures how unified or fragmented retail investor narratives are. High scores indicate strong consensus around a single theme; low scores indicate scattered, conflicting viewpoints.",
    calculation: "Inverse of narrative entropy weighted by emotion convergence and velocity stability.",
    interpretation: "High NCS (>70): stable, unified narrative. Low NCS (<40): high fragmentation, potential volatility risk.",
    icon: Target,
  },
  {
    term: "Fear/Greed Index",
    shortDescription: "Market psychology extremes (0-100)",
    fullDescription: "A composite indicator measuring whether retail sentiment leans toward extreme fear or greed. Derived from emotion analysis, message volume, and narrative patterns.",
    calculation: "Weighted combination of dominant emotions (fear, greed, FOMO, panic) across analyzed messages.",
    interpretation: "0-25: Extreme Fear (potential buy), 75-100: Extreme Greed (potential sell), 40-60: Neutral.",
    icon: Brain,
  },
  {
    term: "Message Volume",
    shortDescription: "Social activity level",
    fullDescription: "The total count of social messages analyzed within a given timeframe. Higher volumes generally increase confidence in analysis accuracy.",
    interpretation: "Compare to historical averages. Spikes often precede or accompany significant price moves.",
    icon: BarChart3,
  },
];

const SIGNAL_ENTRIES: GlossaryEntry[] = [
  {
    term: "Euphoria Risk",
    shortDescription: "Excessive optimism detected",
    fullDescription: "Signals when retail sentiment shows signs of irrational exuberance. Often characterized by dismissal of risks, FOMO-driven language, and price target escalation.",
    interpretation: "Consider reducing position size or taking profits. Historically associated with local tops.",
    icon: TrendingUp,
  },
  {
    term: "Capitulation",
    shortDescription: "Panic selling exhaustion",
    fullDescription: "Signals when bearish sentiment reaches extreme levels with panic-driven language. Indicates potential selling exhaustion.",
    interpretation: "May represent buying opportunity. Watch for sentiment stabilization as confirmation.",
    icon: TrendingDown,
  },
  {
    term: "Activist Risk",
    shortDescription: "Activist investor activity detected",
    fullDescription: "Signals when social chatter indicates potential activist investor involvement through keywords related to board changes, proxy fights, or strategic reviews.",
    interpretation: "Monitor for official filings. May create volatility and strategic uncertainty.",
    icon: AlertTriangle,
  },
  {
    term: "Momentum Shift",
    shortDescription: "Trend direction changing",
    fullDescription: "Signals when the dominant narrative or sentiment direction is reversing. Calculated from rate of change in sentiment and narrative concentrations.",
    interpretation: "Early indicator of potential trend change. Confirm with price action.",
    icon: Activity,
  },
];

function GlossarySection({ entries, title }: { entries: GlossaryEntry[]; title: string }) {
  const [expandedTerm, setExpandedTerm] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      {entries.map((entry) => {
        const isExpanded = expandedTerm === entry.term;
        const Icon = entry.icon;
        
        return (
          <div
            key={entry.term}
            className={cn(
              "p-4 rounded-xl border transition-all duration-200 cursor-pointer",
              "bg-secondary/30 border-border/50 hover:bg-secondary/50",
              isExpanded && "bg-secondary/60"
            )}
            onClick={() => setExpandedTerm(isExpanded ? null : entry.term)}
          >
            <div className="flex items-start gap-3">
              {Icon && (
                <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
                  <Icon className="h-4 w-4" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-medium text-sm">{entry.term}</h4>
                </div>
                <p className="text-xs text-muted-foreground">{entry.shortDescription}</p>
                
                {isExpanded && (
                  <div className="mt-3 pt-3 border-t border-border/50 space-y-2 animate-fade-in">
                    <p className="text-sm text-foreground/90">{entry.fullDescription}</p>
                    
                    {entry.calculation && (
                      <div className="text-xs">
                        <span className="font-medium text-muted-foreground">How it's calculated: </span>
                        <span className="text-foreground/80">{entry.calculation}</span>
                      </div>
                    )}
                    
                    {entry.interpretation && (
                      <div className="text-xs">
                        <span className="font-medium text-muted-foreground">Interpretation: </span>
                        <span className="text-foreground/80">{entry.interpretation}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

interface MetricsGlossaryProps {
  trigger?: React.ReactNode;
  defaultOpen?: boolean;
}

export function MetricsGlossary({ trigger, defaultOpen = false }: MetricsGlossaryProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full hover:bg-black/[0.05] dark:hover:bg-white/[0.08]"
          >
            <HelpCircle className="h-5 w-5" />
            <span className="sr-only">Metrics Glossary</span>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] p-0 glass-card overflow-hidden">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <HelpCircle className="h-5 w-5 text-primary" />
            Metrics Glossary
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Reference guide for understanding confidence levels, metrics, and signals
          </p>
        </DialogHeader>
        
        <Tabs defaultValue="confidence" className="w-full">
          <div className="px-6 pt-4">
            <TabsList className="w-full grid grid-cols-3 bg-secondary/50">
              <TabsTrigger value="confidence" className="text-xs">
                Confidence
              </TabsTrigger>
              <TabsTrigger value="metrics" className="text-xs">
                Metrics
              </TabsTrigger>
              <TabsTrigger value="signals" className="text-xs">
                Signals
              </TabsTrigger>
            </TabsList>
          </div>
          
          <ScrollArea className="h-[55vh] px-6 py-4">
            <TabsContent value="confidence" className="mt-0">
              <div className="mb-4">
                <p className="text-sm text-muted-foreground">
                  Confidence levels indicate how much data supports each analysis. They help you gauge 
                  the reliability of insights before making decisions.
                </p>
              </div>
              <GlossarySection entries={CONFIDENCE_ENTRIES} title="Confidence Levels" />
            </TabsContent>
            
            <TabsContent value="metrics" className="mt-0">
              <div className="mb-4">
                <p className="text-sm text-muted-foreground">
                  Core metrics derived from social sentiment analysis. Each measures a different 
                  dimension of retail investor behavior.
                </p>
              </div>
              <GlossarySection entries={METRIC_ENTRIES} title="Key Metrics" />
            </TabsContent>
            
            <TabsContent value="signals" className="mt-0">
              <div className="mb-4">
                <p className="text-sm text-muted-foreground">
                  Signals are pattern-based alerts triggered when specific behavioral conditions are detected 
                  in social sentiment data.
                </p>
              </div>
              <GlossarySection entries={SIGNAL_ENTRIES} title="Market Signals" />
            </TabsContent>
          </ScrollArea>
        </Tabs>
        
        <div className="p-4 border-t border-border/50 bg-secondary/20">
          <p className="text-[10px] text-muted-foreground text-center">
            All metrics describe observed retail sentiment patterns. They do not constitute financial advice 
            and should be used alongside other research.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
