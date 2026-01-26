import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DecisionLens, LensValue, isDefaultLens } from "@/components/DecisionLensSelector";
import { ConfidenceLevel } from "@/components/ui/ConfidenceBadge";
import { CustomLens } from "@/hooks/use-custom-lenses";

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

export function useDecisionLensSummary(
  symbol: string, 
  lens: LensValue, 
  customLens?: CustomLens | null
) {
  // Determine if this is a custom lens request
  const isCustom = !isDefaultLens(lens) && !!customLens;
  
  return useQuery({
    queryKey: ['decision-lens-summary', symbol, isCustom ? customLens?.id : lens],
    queryFn: async () => {
      const body: Record<string, unknown> = { symbol };
      
      if (isCustom && customLens) {
        body.lens = 'custom';
        body.customLensConfig = {
          name: customLens.name,
          decision_question: customLens.decision_question,
          focus_areas: customLens.focus_areas,
          exclusions: customLens.exclusions,
        };
      } else {
        body.lens = lens;
      }
      
      const { data, error } = await supabase.functions.invoke('generate-lens-summary', {
        body
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
    enabled: !!symbol && (isDefaultLens(lens) || !!customLens),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 5 * 60 * 1000,
  });
}
