import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DecisionLens } from "@/components/DecisionLensSelector";
import { ConfidenceLevel } from "@/components/ui/ConfidenceBadge";

export interface LensSummaryData {
  summary: string;
  cached: boolean;
  messageCount?: number;
  confidence?: ConfidenceLevel;
  relevantCount?: number;
  dominantThemeShare?: number;
}

// Map backend confidence values to UI ConfidenceLevel
function mapConfidence(backendConfidence?: string): ConfidenceLevel | undefined {
  if (!backendConfidence) return undefined;
  if (backendConfidence === 'high') return 'high';
  if (backendConfidence === 'moderate') return 'moderate';
  return 'experimental'; // 'low' maps to 'experimental'
}

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
      
      // Map the backend response to the expected UI types
      return {
        summary: data.summary,
        cached: data.cached,
        messageCount: data.messageCount,
        confidence: mapConfidence(data.confidence),
        relevantCount: data.relevantCount,
        dominantThemeShare: data.dominantThemeShare,
      } as LensSummaryData;
    },
    enabled: !!symbol && !!lens,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 5 * 60 * 1000,
  });
}
