import { useState, useEffect } from "react";
import { format, startOfDay, isWeekend } from "date-fns";
import { Zap, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface FillTodayGapsButtonProps {
  symbol: string;
  onComplete?: () => void;
}

// Extended trading hours: 5 AM to 6 PM (matching chart boundaries)
const START_HOUR = 5;
const END_HOUR = 18;

export function FillTodayGapsButton({ symbol, onComplete }: FillTodayGapsButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [missingHours, setMissingHours] = useState<number[]>([]);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");

  // Check for missing hourly snapshots on mount and after fills
  useEffect(() => {
    checkTodayGaps();
  }, [symbol]);

  const checkTodayGaps = async () => {
    setIsChecking(true);
    
    try {
      const now = new Date();
      const today = startOfDay(now);
      const currentHour = now.getHours();
      
      // If it's a weekend, no gaps to fill
      if (isWeekend(now)) {
        setMissingHours([]);
        setIsChecking(false);
        return;
      }

      // Determine which hours should have data (from START_HOUR to current hour, capped at END_HOUR)
      const expectedHours: number[] = [];
      const endCheckHour = Math.min(currentHour, END_HOUR);
      
      for (let hour = START_HOUR; hour <= endCheckHour; hour++) {
        expectedHours.push(hour);
      }

      // If we're before market hours, no expected data
      if (expectedHours.length === 0) {
        setMissingHours([]);
        setIsChecking(false);
        return;
      }

      // Query for today's narrative history records
      const todayStart = today.toISOString();
      const todayEnd = new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString();

      const { data: historyData, error } = await supabase
        .from("narrative_history")
        .select("recorded_at")
        .eq("symbol", symbol.toUpperCase())
        .eq("period_type", "hourly")
        .gte("recorded_at", todayStart)
        .lt("recorded_at", todayEnd);

      if (error) {
        console.error("Error checking today's gaps:", error);
        setMissingHours([]);
        setIsChecking(false);
        return;
      }

      // Extract hours that have data (in local timezone)
      const hoursWithData = new Set<number>();
      for (const record of historyData || []) {
        const recordDate = new Date(record.recorded_at);
        hoursWithData.add(recordDate.getHours());
      }

      // Find missing hours
      const missing = expectedHours.filter(hour => !hoursWithData.has(hour));
      setMissingHours(missing);
    } catch (err) {
      console.error("Error checking gaps:", err);
      setMissingHours([]);
    } finally {
      setIsChecking(false);
    }
  };

  const handleFillTodayGaps = async () => {
    if (missingHours.length === 0) return;

    setIsLoading(true);
    setStatus("idle");

    try {
      const today = format(new Date(), "yyyy-MM-dd");

      const { data, error } = await supabase.functions.invoke("auto-backfill-gaps", {
        body: {
          symbol: symbol.toUpperCase(),
          startDate: today,
          endDate: today,
          forceHourly: true, // Signal to process hourly snapshots
        },
      });

      if (error) throw error;

      if (data.backfilledDates?.length > 0 || data.narrativeRecords > 0 || data.emotionRecords > 0) {
        setStatus("success");
        toast.success("Today's gaps filled!", {
          description: `Backfilled ${missingHours.length} missing hour(s) for ${symbol}`,
        });
        // Re-check gaps after successful fill
        await checkTodayGaps();
        onComplete?.();
      } else {
        setStatus("idle");
        toast.info("No new data available", {
          description: "Messages for missing hours may not be available yet",
        });
      }
    } catch (error) {
      console.error("Fill today gaps error:", error);
      setStatus("error");
      toast.error("Failed to fill today's gaps", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
      // Reset status after a delay
      setTimeout(() => setStatus("idle"), 3000);
    }
  };

  // Don't show on weekends
  if (isWeekend(new Date())) {
    return null;
  }

  // Still checking
  if (isChecking) {
    return (
      <Button variant="ghost" size="sm" disabled className="h-8 px-3 text-xs">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      </Button>
    );
  }

  // No gaps - show success state briefly or hide
  if (missingHours.length === 0) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="sm" disabled className="h-8 px-3 text-xs text-muted-foreground">
              <CheckCircle className="h-3.5 w-3.5 mr-1.5 text-green-500" />
              Today Complete
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>All hourly snapshots for today are recorded</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Gaps found - show actionable button
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="h-8 px-3 text-xs border-amber-500/50 text-amber-600 hover:bg-amber-500/10 hover:text-amber-600"
            onClick={handleFillTodayGaps}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                Filling...
              </>
            ) : status === "success" ? (
              <>
                <CheckCircle className="h-3.5 w-3.5 mr-1.5 text-green-500" />
                Done!
              </>
            ) : status === "error" ? (
              <>
                <AlertCircle className="h-3.5 w-3.5 mr-1.5 text-red-500" />
                Retry
              </>
            ) : (
              <>
                <Zap className="h-3.5 w-3.5 mr-1.5" />
                Fill Today
                <Badge variant="outline" className="ml-1.5 h-4 px-1.5 text-[10px] border-amber-500/50">
                  {missingHours.length}
                </Badge>
              </>
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>
            {missingHours.length} missing hourly snapshot{missingHours.length > 1 ? "s" : ""}: 
            {" "}{missingHours.map(h => `${h}:00`).join(", ")}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
