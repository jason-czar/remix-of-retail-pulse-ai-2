import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { 
  PlayCircle, 
  Loader2, 
  CheckCircle, 
  AlertCircle,
  Clock,
  Zap
} from "lucide-react";
import { toast } from "sonner";

interface SnapshotResult {
  success: boolean;
  periodType?: string;
  narrativeRecords?: number;
  emotionRecords?: number;
  symbols?: number;
  errors?: string[];
  message?: string;
  error?: string;
}

export default function ManualSnapshotTrigger() {
  const [isRunning, setIsRunning] = useState(false);
  const [lastResult, setLastResult] = useState<SnapshotResult | null>(null);
  const [lastRunTime, setLastRunTime] = useState<Date | null>(null);

  const runSnapshot = async (periodType: "hourly" | "daily") => {
    setIsRunning(true);
    setLastResult(null);

    try {
      const { data, error } = await supabase.functions.invoke(
        "record-narrative-emotion-snapshot",
        {
          body: { periodType, forceRun: true },
        }
      );

      if (error) {
        throw error;
      }

      setLastResult(data as SnapshotResult);
      setLastRunTime(new Date());

      if (data?.success) {
        toast.success(
          `Snapshot complete! Recorded ${data.narrativeRecords || 0} narratives and ${data.emotionRecords || 0} emotion snapshots for ${data.symbols || 0} symbols.`
        );
      } else if (data?.message) {
        toast.info(data.message);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setLastResult({ success: false, error: errorMessage });
      toast.error(`Snapshot failed: ${errorMessage}`);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Manual Snapshot Trigger
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Run narrative and emotion analysis snapshots on demand for all watchlist symbols
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-4 mb-6">
        <Button
          variant="outline"
          onClick={() => runSnapshot("hourly")}
          disabled={isRunning}
          className="flex items-center gap-2"
        >
          {isRunning ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <PlayCircle className="h-4 w-4" />
          )}
          Run Hourly Snapshot
        </Button>

        <Button
          variant="hero"
          onClick={() => runSnapshot("daily")}
          disabled={isRunning}
          className="flex items-center gap-2"
        >
          {isRunning ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <PlayCircle className="h-4 w-4" />
          )}
          Run Daily Snapshot
        </Button>
      </div>

      {isRunning && (
        <div className="p-4 rounded-lg bg-primary/10 border border-primary/20 mb-4">
          <div className="flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <div>
              <p className="font-medium text-primary">Running snapshot...</p>
              <p className="text-sm text-muted-foreground">
                This may take a few minutes depending on the number of symbols in your watchlists.
              </p>
            </div>
          </div>
        </div>
      )}

      {lastResult && !isRunning && (
        <div
          className={`p-4 rounded-lg border ${
            lastResult.success
              ? "bg-emerald-500/10 border-emerald-500/30"
              : "bg-destructive/10 border-destructive/30"
          }`}
        >
          <div className="flex items-start gap-3">
            {lastResult.success ? (
              <CheckCircle className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            )}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <p className="font-medium">
                  {lastResult.success ? "Snapshot Complete" : "Snapshot Failed"}
                </p>
                {lastResult.periodType && (
                  <Badge variant="outline" className="text-xs capitalize">
                    {lastResult.periodType}
                  </Badge>
                )}
              </div>

              {lastResult.success && (
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Symbols:</span>
                    <span className="ml-2 font-mono">{lastResult.symbols || 0}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Narratives:</span>
                    <span className="ml-2 font-mono">{lastResult.narrativeRecords || 0}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Emotions:</span>
                    <span className="ml-2 font-mono">{lastResult.emotionRecords || 0}</span>
                  </div>
                </div>
              )}

              {lastResult.error && (
                <p className="text-sm text-destructive mt-1">{lastResult.error}</p>
              )}

              {lastResult.errors && lastResult.errors.length > 0 && (
                <div className="mt-2 text-xs text-muted-foreground">
                  <p className="font-medium mb-1">Warnings:</p>
                  <ul className="list-disc list-inside space-y-0.5">
                    {lastResult.errors.slice(0, 5).map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                    {lastResult.errors.length > 5 && (
                      <li>...and {lastResult.errors.length - 5} more</li>
                    )}
                  </ul>
                </div>
              )}

              {lastRunTime && (
                <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>Last run: {lastRunTime.toLocaleTimeString()}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="mt-4 p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground">
        <p>
          <strong>Note:</strong> Snapshots analyze all symbols from your watchlists and save
          the results to the cache and history tables. Hourly snapshots are normally run
          automatically every hour. Daily snapshots run at midnight ET.
        </p>
      </div>
    </Card>
  );
}
