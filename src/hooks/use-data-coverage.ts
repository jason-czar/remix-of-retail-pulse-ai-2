import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface DayCoverage {
  date: string;
  hasMessages: boolean;
  hasAnalytics: boolean;
  messageCount: number;
  ingestionStatus: 'queued' | 'running' | 'completed' | 'failed' | null;
}

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
      type: 'messages' | 'analytics' | 'all';
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
        // Call auto-backfill-gaps to do the actual work
        const { error: backfillError } = await supabase.functions.invoke('auto-backfill-gaps', {
          body: {
            symbol,
            startDate: date,
            endDate: date,
            type,
            force: type === 'all', // Force refetch when Re-fetch All is clicked
          },
        });

        if (backfillError) throw backfillError;

        // Refresh coverage status after backfill
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
