import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Loader2, 
  Shield, 
  Database, 
  RefreshCw, 
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Info
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

interface BackfillResult {
  success: boolean;
  action: string;
  symbol?: string;
  dateRange?: { start: string; end: string };
  totalDates?: number;
  created?: number;
  skipped_existing?: number;
  skipped_insufficient?: number;
  failed?: number;
  errors?: string[];
  // For recompute
  snapshotsFound?: number;
  updated?: number;
  wouldUpdate?: number;
  dryRun?: boolean;
}

export default function AdminDataControls() {
  const { user } = useAuth();
  const isAdmin = user?.email === "admin@czar.ing";

  // Backfill state
  const [backfillSymbol, setBackfillSymbol] = useState("");
  const [backfillStartDate, setBackfillStartDate] = useState("");
  const [backfillEndDate, setBackfillEndDate] = useState("");
  const [computeNcs, setComputeNcs] = useState(true);
  const [skipInsufficientData, setSkipInsufficientData] = useState(true);
  const [backfillLoading, setBackfillLoading] = useState(false);
  const [backfillResult, setBackfillResult] = useState<BackfillResult | null>(null);

  // Recompute state
  const [recomputeSymbol, setRecomputeSymbol] = useState("");
  const [recomputeStartDate, setRecomputeStartDate] = useState("");
  const [recomputeEndDate, setRecomputeEndDate] = useState("");
  const [dryRun, setDryRun] = useState(true);
  const [recomputeLoading, setRecomputeLoading] = useState(false);
  const [recomputeResult, setRecomputeResult] = useState<BackfillResult | null>(null);

  if (!isAdmin) {
    return null;
  }

  const handleBackfill = async () => {
    if (!backfillSymbol || !backfillStartDate || !backfillEndDate) {
      toast.error("Please fill in all required fields");
      return;
    }

    setBackfillLoading(true);
    setBackfillResult(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error("Not authenticated");
      }

      const response = await supabase.functions.invoke("admin-backfill-psychology", {
        body: {
          action: "backfill",
          symbol: backfillSymbol.toUpperCase(),
          startDate: backfillStartDate,
          endDate: backfillEndDate,
          computeNcs,
          skipInsufficientData,
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      setBackfillResult(response.data as BackfillResult);
      
      if (response.data.created > 0) {
        toast.success(`Created ${response.data.created} snapshots`);
      } else {
        toast.info("No new snapshots created");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Backfill failed";
      toast.error(message);
    } finally {
      setBackfillLoading(false);
    }
  };

  const handleRecompute = async () => {
    if (!recomputeSymbol || !recomputeStartDate || !recomputeEndDate) {
      toast.error("Please fill in all required fields");
      return;
    }

    setRecomputeLoading(true);
    setRecomputeResult(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error("Not authenticated");
      }

      const response = await supabase.functions.invoke("admin-backfill-psychology", {
        body: {
          action: "recompute_ncs",
          symbol: recomputeSymbol.toUpperCase(),
          startDate: recomputeStartDate,
          endDate: recomputeEndDate,
          dryRun,
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      setRecomputeResult(response.data as BackfillResult);
      
      if (dryRun) {
        toast.info(`Dry run: ${response.data.wouldUpdate} snapshots would be updated`);
      } else if (response.data.updated > 0) {
        toast.success(`Updated ${response.data.updated} snapshots`);
      } else {
        toast.info("No snapshots updated");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Recompute failed";
      toast.error(message);
    } finally {
      setRecomputeLoading(false);
    }
  };

  // Set default dates (last 30 days)
  const setDefaultDates = (setStart: (v: string) => void, setEnd: (v: string) => void) => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);
    setStart(start.toISOString().split("T")[0]);
    setEnd(end.toISOString().split("T")[0]);
  };

  return (
    <Card className="p-6 glass-card border-chart-5/30">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-chart-5/10">
          <Shield className="h-5 w-5 text-chart-5" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Admin Data Controls</h2>
          <p className="text-sm text-muted-foreground">
            Backfill historical psychology snapshots and recompute NCS
          </p>
        </div>
        <Badge variant="outline" className="ml-auto border-chart-5/50 text-chart-5">
          Admin Only
        </Badge>
      </div>

      {/* Section 1: Snapshot Backfill */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Database className="h-4 w-4 text-primary" />
          <h3 className="font-medium">Snapshot Backfill</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Symbol</Label>
            <Input
              value={backfillSymbol}
              onChange={(e) => setBackfillSymbol(e.target.value.toUpperCase())}
              placeholder="AAPL"
              className="bg-secondary/50 uppercase"
            />
          </div>
          <div className="space-y-2">
            <Label>Start Date</Label>
            <Input
              type="date"
              value={backfillStartDate}
              onChange={(e) => setBackfillStartDate(e.target.value)}
              className="bg-secondary/50"
            />
          </div>
          <div className="space-y-2">
            <Label>End Date</Label>
            <Input
              type="date"
              value={backfillEndDate}
              onChange={(e) => setBackfillEndDate(e.target.value)}
              className="bg-secondary/50"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-6">
          <div className="flex items-center gap-2">
            <Switch
              id="compute-ncs"
              checked={computeNcs}
              onCheckedChange={setComputeNcs}
            />
            <Label htmlFor="compute-ncs" className="text-sm cursor-pointer">
              Compute NCS
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="skip-insufficient"
              checked={skipInsufficientData}
              onCheckedChange={setSkipInsufficientData}
            />
            <Label htmlFor="skip-insufficient" className="text-sm cursor-pointer">
              Skip days with insufficient data
            </Label>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={handleBackfill}
            disabled={backfillLoading || !backfillSymbol || !backfillStartDate || !backfillEndDate}
            variant="hero"
          >
            {backfillLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Backfilling...
              </>
            ) : (
              <>
                <Database className="h-4 w-4 mr-2" />
                Run Backfill
              </>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={() => setDefaultDates(setBackfillStartDate, setBackfillEndDate)}
          >
            Last 30 Days
          </Button>
        </div>

        {/* Backfill Result */}
        {backfillResult && (
          <div className="p-4 rounded-lg bg-secondary/30 space-y-2">
            <div className="flex items-center gap-2">
              {backfillResult.created && backfillResult.created > 0 ? (
                <CheckCircle2 className="h-4 w-4 text-bullish" />
              ) : (
                <Info className="h-4 w-4 text-muted-foreground" />
              )}
              <span className="font-medium">Backfill Complete</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">Total dates:</span>{" "}
                <span className="font-mono">{backfillResult.totalDates}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Created:</span>{" "}
                <span className="font-mono text-bullish">{backfillResult.created}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Skipped (existing):</span>{" "}
                <span className="font-mono">{backfillResult.skipped_existing}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Skipped (insufficient):</span>{" "}
                <span className="font-mono">{backfillResult.skipped_insufficient}</span>
              </div>
            </div>
            {backfillResult.failed && backfillResult.failed > 0 && (
              <div className="mt-2">
                <div className="flex items-center gap-1 text-bearish text-sm">
                  <XCircle className="h-3 w-3" />
                  <span>Failed: {backfillResult.failed}</span>
                </div>
                {backfillResult.errors && backfillResult.errors.length > 0 && (
                  <div className="mt-1 text-xs text-muted-foreground max-h-20 overflow-y-auto">
                    {backfillResult.errors.slice(0, 5).map((err, i) => (
                      <div key={i}>{err}</div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <Separator className="my-6" />

      {/* Section 2: Recompute NCS */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4 text-primary" />
          <h3 className="font-medium">Recompute NCS (Safe Mode)</h3>
        </div>
        
        <div className="p-3 rounded-lg bg-chart-5/5 border border-chart-5/20">
          <div className="flex gap-2">
            <AlertTriangle className="h-4 w-4 text-chart-5 shrink-0 mt-0.5" />
            <p className="text-sm text-muted-foreground">
              This updates <code className="text-xs bg-secondary px-1 rounded">observed_state.coherence</code> on existing snapshots only. 
              No new snapshots are created.
            </p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Symbol</Label>
            <Input
              value={recomputeSymbol}
              onChange={(e) => setRecomputeSymbol(e.target.value.toUpperCase())}
              placeholder="AAPL"
              className="bg-secondary/50 uppercase"
            />
          </div>
          <div className="space-y-2">
            <Label>Start Date</Label>
            <Input
              type="date"
              value={recomputeStartDate}
              onChange={(e) => setRecomputeStartDate(e.target.value)}
              className="bg-secondary/50"
            />
          </div>
          <div className="space-y-2">
            <Label>End Date</Label>
            <Input
              type="date"
              value={recomputeEndDate}
              onChange={(e) => setRecomputeEndDate(e.target.value)}
              className="bg-secondary/50"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Switch
            id="dry-run"
            checked={dryRun}
            onCheckedChange={setDryRun}
          />
          <Label htmlFor="dry-run" className="text-sm cursor-pointer">
            Dry run (preview only, no changes)
          </Label>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={handleRecompute}
            disabled={recomputeLoading || !recomputeSymbol || !recomputeStartDate || !recomputeEndDate}
            variant={dryRun ? "outline" : "hero"}
          >
            {recomputeLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {dryRun ? "Checking..." : "Recomputing..."}
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                {dryRun ? "Preview Changes" : "Recompute Coherence"}
              </>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={() => setDefaultDates(setRecomputeStartDate, setRecomputeEndDate)}
          >
            Last 30 Days
          </Button>
        </div>

        {/* Recompute Result */}
        {recomputeResult && (
          <div className="p-4 rounded-lg bg-secondary/30 space-y-2">
            <div className="flex items-center gap-2">
              {recomputeResult.dryRun ? (
                <Info className="h-4 w-4 text-primary" />
              ) : recomputeResult.updated && recomputeResult.updated > 0 ? (
                <CheckCircle2 className="h-4 w-4 text-bullish" />
              ) : (
                <Info className="h-4 w-4 text-muted-foreground" />
              )}
              <span className="font-medium">
                {recomputeResult.dryRun ? "Dry Run Preview" : "Recompute Complete"}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">Snapshots found:</span>{" "}
                <span className="font-mono">{recomputeResult.snapshotsFound}</span>
              </div>
              <div>
                <span className="text-muted-foreground">
                  {recomputeResult.dryRun ? "Would update:" : "Updated:"}
                </span>{" "}
                <span className="font-mono text-bullish">
                  {recomputeResult.dryRun ? recomputeResult.wouldUpdate : recomputeResult.updated}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
