import { useState, useCallback, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface BackfillStatus {
  isBackfilling: boolean;
  status: string | null;
  progress: number;
  error: string | null;
}

interface BackfillResult {
  backfilledDates: number;
  skippedDates: number;
  hasMore: boolean;
  remainingDates: number;
  processedDates: string[];
  errors: string[];
}

// Check if a date is a weekday
function isWeekday(date: Date): boolean {
  const day = date.getDay();
  return day >= 1 && day <= 5;
}

// Generate expected weekdays between two dates
function getExpectedWeekdays(startDate: Date, endDate: Date): string[] {
  const weekdays: string[] = [];
  const current = new Date(startDate);
  current.setHours(0, 0, 0, 0);
  
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);
  
  while (current <= end) {
    if (isWeekday(current)) {
      weekdays.push(current.toISOString().split('T')[0]);
    }
    current.setDate(current.getDate() + 1);
  }
  
  return weekdays;
}

export function useAutoBackfill(symbol: string, days: number) {
  const [status, setStatus] = useState<BackfillStatus>({
    isBackfilling: false,
    status: null,
    progress: 0,
    error: null,
  });
  
  const hasCheckedRef = useRef(false);
  const isCheckingRef = useRef(false);

  const detectGaps = useCallback(async (existingDataDates: string[]): Promise<string[]> => {
    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    // Don't include today (it's still accumulating data)
    endDate.setDate(endDate.getDate() - 1);
    
    // Get expected weekdays
    const expectedDates = getExpectedWeekdays(startDate, endDate);
    
    // Create set of existing dates
    const existingSet = new Set(existingDataDates);
    
    // Find missing dates
    const missingDates = expectedDates.filter(d => !existingSet.has(d));
    
    return missingDates;
  }, [days]);

  const fillGaps = useCallback(async (missingDates: string[]): Promise<BackfillResult | null> => {
    if (missingDates.length === 0) return null;
    
    try {
      setStatus(prev => ({
        ...prev,
        isBackfilling: true,
        status: `Fetching data for ${missingDates.length} missing date(s)...`,
        progress: 10,
      }));

      // Calculate date range for the API call
      const sortedDates = [...missingDates].sort();
      const startDate = sortedDates[0];
      const endDate = sortedDates[sortedDates.length - 1];

      setStatus(prev => ({
        ...prev,
        status: `Analyzing ${symbol} data for ${startDate} to ${endDate}...`,
        progress: 30,
      }));

      const { data, error } = await supabase.functions.invoke('auto-backfill-gaps', {
        body: {
          symbol: symbol.toUpperCase(),
          startDate,
          endDate,
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      setStatus(prev => ({
        ...prev,
        progress: 90,
        status: `Completed: ${data.backfilledDates} date(s) backfilled`,
      }));

      return data as BackfillResult;
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setStatus(prev => ({
        ...prev,
        error: errorMessage,
        status: `Error: ${errorMessage}`,
      }));
      return null;
    }
  }, [symbol]);

  const checkAndFillGaps = useCallback(async (
    existingData: Array<{ recorded_at: string }>,
    onComplete?: () => void
  ): Promise<number> => {
    // Prevent duplicate checks
    if (isCheckingRef.current || hasCheckedRef.current) {
      return 0;
    }
    
    isCheckingRef.current = true;
    
    try {
      // Extract dates from existing data
      const existingDates = existingData.map(point => {
        const date = new Date(point.recorded_at);
        return date.toISOString().split('T')[0];
      });
      
      // Detect gaps
      const missingDates = await detectGaps(existingDates);
      
      if (missingDates.length === 0) {
        hasCheckedRef.current = true;
        return 0;
      }
      
      console.log(`[AutoBackfill] Found ${missingDates.length} missing dates for ${symbol}:`, missingDates);
      
      // Fill gaps
      const result = await fillGaps(missingDates);
      
      hasCheckedRef.current = true;
      
      if (result && result.backfilledDates > 0) {
        // Wait a moment then trigger refresh
        setTimeout(() => {
          setStatus(prev => ({
            ...prev,
            isBackfilling: false,
            progress: 100,
          }));
          onComplete?.();
        }, 1000);
        
        return result.backfilledDates;
      }
      
      setStatus(prev => ({
        ...prev,
        isBackfilling: false,
        progress: 100,
      }));
      
      return 0;
      
    } catch (err) {
      console.error('[AutoBackfill] Error:', err);
      hasCheckedRef.current = true;
      setStatus(prev => ({
        ...prev,
        isBackfilling: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      }));
      return 0;
    } finally {
      isCheckingRef.current = false;
    }
  }, [symbol, detectGaps, fillGaps]);

  // Reset when symbol changes
  useEffect(() => {
    hasCheckedRef.current = false;
    setStatus({
      isBackfilling: false,
      status: null,
      progress: 0,
      error: null,
    });
  }, [symbol]);

  return {
    ...status,
    checkAndFillGaps,
    hasChecked: hasCheckedRef.current,
  };
}
