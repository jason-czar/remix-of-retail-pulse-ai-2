import { useState } from "react";
import { format, subDays, isWeekend } from "date-fns";
import { Calendar as CalendarIcon, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface FillGapsDialogProps {
  symbol: string;
  onComplete?: () => void;
  trigger?: React.ReactNode;
}

export function FillGapsDialog({ symbol, onComplete, trigger }: FillGapsDialogProps) {
  const [open, setOpen] = useState(false);
  const [startDate, setStartDate] = useState<Date | undefined>(subDays(new Date(), 7));
  const [endDate, setEndDate] = useState<Date | undefined>(new Date());
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const handleFillGaps = async () => {
    if (!startDate || !endDate) {
      toast.error("Please select both start and end dates");
      return;
    }

    if (startDate > endDate) {
      toast.error("Start date must be before end date");
      return;
    }

    setIsLoading(true);
    setStatus("Detecting gaps...");

    try {
      const { data, error } = await supabase.functions.invoke("auto-backfill-gaps", {
        body: {
          symbol: symbol.toUpperCase(),
          startDate: format(startDate, "yyyy-MM-dd"),
          endDate: format(endDate, "yyyy-MM-dd"),
        },
      });

      if (error) throw error;

      if (data.backfilledDates?.length > 0) {
        toast.success(`Backfilled ${data.backfilledDates.length} date(s)`, {
          description: `Data fetched for: ${data.backfilledDates.join(", ")}`,
        });
      } else if (data.skippedDates?.length > 0) {
        toast.info("No gaps to fill", {
          description: "All weekday dates already have data",
        });
      } else {
        toast.info("No data found", {
          description: "No messages available for the selected dates",
        });
      }

      setOpen(false);
      onComplete?.();
    } catch (error) {
      console.error("Fill gaps error:", error);
      toast.error("Failed to fill gaps", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
      setStatus(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="h-8 px-3 text-xs">
            <Download className="h-3.5 w-3.5 mr-1.5" />
            Fill Gaps
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Fill Data Gaps for {symbol}</DialogTitle>
          <DialogDescription>
            Select a date range to fetch and analyze missing historical data.
            Weekends will be skipped automatically.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Start Date */}
          <div className="grid gap-2">
            <label className="text-sm font-medium">Start Date</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !startDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {startDate ? format(startDate, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={setStartDate}
                  disabled={(date) => date > new Date() || date < subDays(new Date(), 90)}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* End Date */}
          <div className="grid gap-2">
            <label className="text-sm font-medium">End Date</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !endDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {endDate ? format(endDate, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={endDate}
                  onSelect={setEndDate}
                  disabled={(date) => date > new Date() || date < subDays(new Date(), 90)}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Status */}
          {status && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              {status}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleFillGaps} disabled={isLoading || !startDate || !endDate}>
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Fetching...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Fill Gaps
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
