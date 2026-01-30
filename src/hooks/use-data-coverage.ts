import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface DayCoverage {
  date: string;
  hasMessages: boolean;
  hasAnalytics: boolean;
  hasPsychology: boolean;
  hasPrice: boolean;
  messageCount: number;
  ingestionStatus: 'queued' | 'running' | 'completed' | 'failed' | null;
}

export type CoverageFilter = 'all' | 'messages' | 'analytics' | 'psychology' | 'price';

export function useMonthCoverage(symbol: string, year: number, month: number) {
  return useQuery({
    queryKey: ['coverage', symbol, year, month],
    queryFn: async (): Promise<DayCoverage[]> => {
      const startDate = new Date(year, month, 1);
      const endDate = new Date(year, month + 1, 0);
      
      const { data, error } = await supabase
        .from('symbol_daily_coverage')
        .select('*')
        .eq('symbol', symbol)
        .gte('date', startDate.toISOString().split('T')[0])
        .lte('date', endDate.toISOString().split('T')[0])
        .order('date', { ascending: true });
      
      if (error) throw error;
      
      return (data || []).map(row => ({
        date: row.date,
        hasMessages: row.has_messages,
        hasAnalytics: row.has_analytics,
        hasPsychology: row.has_psychology ?? false,
        hasPrice: row.has_price ?? false,
        messageCount: row.message_count || 0,
        ingestionStatus: row.ingestion_status as DayCoverage['ingestionStatus'],
      }));
    },
    staleTime: 5 * 60 * 1000, // 5 min cache
    enabled: !!symbol,
  });
}

export function useRefreshCoverage() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ symbol }: { symbol: string }) => {
      const { data, error } = await supabase.functions.invoke('compute-coverage-status', {
        body: { symbol },
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, { symbol }) => {
      queryClient.invalidateQueries({ queryKey: ['coverage', symbol] });
      toast.success('Coverage data refreshed');
    },
    onError: (error) => {
      toast.error('Failed to refresh coverage: ' + (error as Error).message);
    },
  });
}

export function useTriggerIngestion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      symbol, 
      date, 
      type 
    }: { 
      symbol: string; 
      date: string; 
      type: 'messages' | 'analytics' | 'psychology' | 'price' | 'all';
    }) => {
      // Update status to 'queued'
      await supabase
        .from('symbol_daily_coverage')
        .upsert({
          symbol,
          date,
          ingestion_status: 'queued',
          last_updated: new Date().toISOString(),
        }, { onConflict: 'symbol,date' });

      // Update status to 'running'
      await supabase
        .from('symbol_daily_coverage')
        .update({ ingestion_status: 'running', last_updated: new Date().toISOString() })
        .eq('symbol', symbol)
        .eq('date', date);

      try {
        if (type === 'psychology') {
          // Call record-psychology-snapshot for this specific symbol
          const { error: psychError } = await supabase.functions.invoke('record-psychology-snapshot', {
            body: {
              periodType: 'daily',
              forceRun: true,
              targetSymbol: symbol,
              targetDate: date,
            },
          });

          if (psychError) throw psychError;
        } else if (type === 'price') {
          // Call backfill-price-history for this symbol (fetches full year, upserts)
          const { error: priceError } = await supabase.functions.invoke('backfill-price-history', {
            body: {
              symbol,
              days: 30, // Only fetch last 30 days for targeted backfill
            },
          });

          if (priceError) throw priceError;
        } else {
          // Call auto-backfill-gaps for messages/analytics
          const { error: backfillError } = await supabase.functions.invoke('auto-backfill-gaps', {
            body: {
              symbol,
              startDate: date,
              endDate: date,
              type: type === 'all' ? 'all' : type,
              force: type === 'all', // Force refetch when Re-fetch All is clicked
            },
          });

          if (backfillError) throw backfillError;
        }

        // Refresh coverage status after ingestion
        await supabase.functions.invoke('compute-coverage-status', {
          body: { symbol, dates: [date] },
        });

        // Update status to 'completed'
        await supabase
          .from('symbol_daily_coverage')
          .update({ ingestion_status: 'completed', last_updated: new Date().toISOString() })
          .eq('symbol', symbol)
          .eq('date', date);

        return { success: true };
      } catch (error) {
        // Update status to 'failed'
        await supabase
          .from('symbol_daily_coverage')
          .update({ ingestion_status: 'failed', last_updated: new Date().toISOString() })
          .eq('symbol', symbol)
          .eq('date', date);
        
        throw error;
      }
    },
    onSuccess: (_, { symbol }) => {
      const now = new Date();
      queryClient.invalidateQueries({ 
        queryKey: ['coverage', symbol, now.getFullYear(), now.getMonth()] 
      });
      toast.success('Ingestion completed successfully');
    },
    onError: (error) => {
      toast.error('Ingestion failed: ' + (error as Error).message);
    },
  });
}

export interface BatchBackfillResult {
  total: number;
  successful: number;
  failed: number;
  skipped: number;
}

// Helper to generate all dates in a range
function eachDayOfInterval(start: Date, end: Date): Date[] {
  const dates: Date[] = [];
  const current = new Date(start);
  while (current <= end) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

export function useBatchBackfill() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      symbol, 
      startDate,
      endDate,
      types
    }: { 
      symbol: string; 
      startDate: string;
      endDate: string;
      types: ('messages' | 'analytics' | 'psychology' | 'price')[];
    }): Promise<BatchBackfillResult> => {
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      
      const result: BatchBackfillResult = {
        total: 0,
        successful: 0,
        failed: 0,
        skipped: 0,
      };

      // First, fetch existing coverage for the date range
      const { data: existingCoverage } = await supabase
        .from('symbol_daily_coverage')
        .select('*')
        .eq('symbol', symbol)
        .gte('date', startDate)
        .lte('date', endDate);

      const coverageMap = new Map<string, typeof existingCoverage extends (infer T)[] ? T : never>();
      existingCoverage?.forEach(c => coverageMap.set(c.date, c));

      // Generate all dates in range and find ones with missing coverage
      const start = new Date(startDate + 'T12:00:00');
      const end = new Date(endDate + 'T12:00:00');
      const allDates = eachDayOfInterval(start, end);

      const datesToProcess: { date: string; missingTypes: string[] }[] = [];
      
      for (const dayDate of allDates) {
        // Skip future dates and weekends
        if (dayDate > today) continue;
        const dayOfWeek = dayDate.getDay();
        if (dayOfWeek === 0 || dayOfWeek === 6) continue;

        const dateStr = dayDate.toISOString().split('T')[0];
        const existing = coverageMap.get(dateStr);

        const missingTypes: string[] = [];
        if (types.includes('messages') && !existing?.has_messages) missingTypes.push('messages');
        if (types.includes('analytics') && !existing?.has_analytics) missingTypes.push('analytics');
        if (types.includes('psychology') && !existing?.has_psychology) missingTypes.push('psychology');
        if (types.includes('price') && !existing?.has_price) missingTypes.push('price');

        if (missingTypes.length > 0) {
          datesToProcess.push({ date: dateStr, missingTypes });
        }
      }

      result.total = datesToProcess.length;

      if (datesToProcess.length === 0) {
        return result;
      }

      // For price, we can do a single bulk fetch if it's in the types
      if (types.includes('price')) {
        try {
          const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 30;
          await supabase.functions.invoke('backfill-price-history', {
            body: { symbol, days: Math.min(daysDiff, 365) },
          });
        } catch (error) {
          console.error('Price backfill failed:', error);
        }
      }

      // Process dates sequentially to avoid overwhelming the API
      for (const { date, missingTypes } of datesToProcess) {
        try {
          // Update status to running
          await supabase
            .from('symbol_daily_coverage')
            .upsert({
              symbol,
              date,
              ingestion_status: 'running',
              last_updated: new Date().toISOString(),
            }, { onConflict: 'symbol,date' });

          // Process each missing type (skip price as we did bulk above)
          for (const type of missingTypes.filter(t => t !== 'price')) {
            if (type === 'messages' || type === 'analytics') {
              await supabase.functions.invoke('auto-backfill-gaps', {
                body: { symbol, startDate: date, endDate: date, type },
              });
            } else if (type === 'psychology') {
              await supabase.functions.invoke('record-psychology-snapshot', {
                body: { periodType: 'daily', forceRun: true, targetSymbol: symbol, targetDate: date },
              });
            }
          }

          // Refresh coverage for this date
          await supabase.functions.invoke('compute-coverage-status', {
            body: { symbol, dates: [date] },
          });

          // Update status to completed
          await supabase
            .from('symbol_daily_coverage')
            .update({ ingestion_status: 'completed', last_updated: new Date().toISOString() })
            .eq('symbol', symbol)
            .eq('date', date);

          result.successful++;
        } catch (error) {
          console.error(`Batch backfill failed for ${date}:`, error);
          
          // Update status to failed
          await supabase
            .from('symbol_daily_coverage')
            .update({ ingestion_status: 'failed', last_updated: new Date().toISOString() })
            .eq('symbol', symbol)
            .eq('date', date);

          result.failed++;
        }
      }

      return result;
    },
    onSuccess: (result, { symbol }) => {
      const now = new Date();
      queryClient.invalidateQueries({ 
        queryKey: ['coverage', symbol, now.getFullYear(), now.getMonth()] 
      });
      
      if (result.total === 0) {
        toast.info('No missing dates found to backfill');
      } else if (result.failed === 0) {
        toast.success(`Batch backfill complete: ${result.successful}/${result.total} dates processed`);
      } else {
        toast.warning(`Batch backfill: ${result.successful} succeeded, ${result.failed} failed`);
      }
    },
    onError: (error) => {
      toast.error('Batch backfill failed: ' + (error as Error).message);
    },
  });
}
