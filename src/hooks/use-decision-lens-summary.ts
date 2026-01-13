import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DecisionLens } from "@/components/DecisionLensSelector";

export function useDecisionLensSummary(symbol: string, lens: DecisionLens) {
  return useQuery({
    queryKey: ['decision-lens-summary', symbol, lens],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('generate-lens-summary', {
        body: { symbol, lens }
      });
      
      if (error) {
        console.error('Lens summary error:', error);
        throw error;
      }
      
      return data as { summary: string; cached: boolean };
    },
    enabled: !!symbol && !!lens,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 5 * 60 * 1000,
  });
}
