import { Loader2, Download, CheckCircle2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface BackfillIndicatorProps {
  status: string | null;
  progress: number;
  isComplete?: boolean;
}

export function BackfillIndicator({ status, progress, isComplete }: BackfillIndicatorProps) {
  if (!status) return null;

  return (
    <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-primary/10 border border-primary/20 text-sm">
      {isComplete ? (
        <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />
      ) : (
        <Loader2 className="h-4 w-4 text-primary animate-spin flex-shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <Download className="h-3 w-3 text-primary" />
          <span className="text-xs text-muted-foreground truncate">{status}</span>
        </div>
        <Progress value={progress} className="h-1" />
      </div>
    </div>
  );
}

export function BackfillBadge({ isBackfilling }: { isBackfilling: boolean }) {
  if (!isBackfilling) return null;
  
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 text-xs">
      <Loader2 className="h-3 w-3 animate-spin" />
      Fetching data...
    </span>
  );
}
