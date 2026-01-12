import { useState, useEffect } from "react";
import { Sparkles, MessageSquare, Brain, Database } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface AIAnalysisLoaderProps {
  symbol: string;
  analysisType: "narratives" | "emotions";
}

const phases = [
  { 
    icon: Database, 
    label: "Checking cache...",
    duration: 800 
  },
  { 
    icon: MessageSquare, 
    label: "Fetching messages...",
    duration: 2000 
  },
  { 
    icon: Brain, 
    label: "AI analyzing content...",
    duration: 4000 
  },
  { 
    icon: Sparkles, 
    label: "Generating insights...",
    duration: 1500 
  },
];

export function AIAnalysisLoader({ symbol, analysisType }: AIAnalysisLoaderProps) {
  const [currentPhase, setCurrentPhase] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let totalElapsed = 0;
    const totalDuration = phases.reduce((sum, p) => sum + p.duration, 0);
    
    const interval = setInterval(() => {
      totalElapsed += 100;
      const newProgress = Math.min(95, (totalElapsed / totalDuration) * 100);
      setProgress(newProgress);
      
      // Determine current phase
      let elapsed = 0;
      for (let i = 0; i < phases.length; i++) {
        elapsed += phases[i].duration;
        if (totalElapsed <= elapsed) {
          setCurrentPhase(i);
          break;
        }
      }
    }, 100);

    return () => clearInterval(interval);
  }, []);

  const CurrentIcon = phases[currentPhase]?.icon || Sparkles;
  const currentLabel = phases[currentPhase]?.label || "Processing...";

  return (
    <div className="h-[500px] w-full flex flex-col items-center justify-center gap-6">
      <div className="relative">
        <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse" />
        <div className="relative bg-card border border-border rounded-full p-4">
          <CurrentIcon className="h-8 w-8 text-primary animate-pulse" />
        </div>
      </div>
      
      <div className="flex flex-col items-center gap-2 text-center">
        <h3 className="text-lg font-medium text-foreground">
          Analyzing {analysisType === "emotions" ? "Emotions" : "Narratives"}
        </h3>
        <p className="text-sm text-muted-foreground">
          {currentLabel}
        </p>
      </div>
      
      <div className="w-64 space-y-2">
        <Progress value={progress} className="h-2" />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{symbol}</span>
          <span>{Math.round(progress)}%</span>
        </div>
      </div>
      
      {/* Phase indicators */}
      <div className="flex items-center gap-2 mt-4">
        {phases.map((phase, index) => {
          const PhaseIcon = phase.icon;
          const isActive = index === currentPhase;
          const isComplete = index < currentPhase;
          
          return (
            <div
              key={index}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs transition-all ${
                isActive
                  ? "bg-primary/20 text-primary border border-primary/30"
                  : isComplete
                    ? "bg-muted text-muted-foreground"
                    : "bg-card/50 text-muted-foreground/50"
              }`}
            >
              <PhaseIcon className={`h-3 w-3 ${isActive ? "animate-pulse" : ""}`} />
              {isActive && <span>{phase.label.replace("...", "")}</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
