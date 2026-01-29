import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { LensValue, isDefaultLens, DecisionLens } from "@/components/DecisionLensSelector";
import { CustomLens } from "@/hooks/use-custom-lenses";

// Define the lens navigation order (matches PsychologyOverviewCard)
const LENS_ORDER: DecisionLens[] = [
  'summary',
  'corporate-strategy',
  'earnings',
  'ma',
  'capital-allocation',
  'leadership-change',
  'strategic-pivot',
  'product-launch',
  'activist-risk',
];

/**
 * Get the next lens in the sequence
 */
function getNextLens(currentLens: LensValue): DecisionLens | null {
  // Only prefetch for default lenses
  if (!isDefaultLens(currentLens)) return null;
  
  const currentIndex = LENS_ORDER.indexOf(currentLens as DecisionLens);
  if (currentIndex === -1) return null;
  
  const nextIndex = currentIndex + 1;
  if (nextIndex >= LENS_ORDER.length) return null;
  
  return LENS_ORDER[nextIndex];
}

/**
 * Prefetch the next decision lens summary data
 */
export function useLensPrefetch(
  symbol: string,
  currentLens: LensValue,
  customLens?: CustomLens | null
) {
  const queryClient = useQueryClient();
  
  useEffect(() => {
    // Only prefetch for default lenses (not custom)
    if (!isDefaultLens(currentLens) || customLens) return;
    
    const nextLens = getNextLens(currentLens);
    if (!nextLens) return;
    
    // Small delay before prefetching to prioritize current lens
    const timeoutId = setTimeout(() => {
      const queryKey = ['decision-lens-summary', symbol, nextLens];
      
      // Check if we already have fresh data
      const existingData = queryClient.getQueryData(queryKey);
      const queryState = queryClient.getQueryState(queryKey);
      
      // Skip if data exists and isn't stale (within 5 minutes)
      if (existingData && queryState?.dataUpdatedAt) {
        const age = Date.now() - queryState.dataUpdatedAt;
        if (age < 5 * 60 * 1000) {
          console.debug(`[Prefetch] Skipping ${nextLens} - data is fresh`);
          return;
        }
      }
      
      console.debug(`[Prefetch] Loading next lens: ${nextLens}`);
      
      // Prefetch the next lens summary
      queryClient.prefetchQuery({
        queryKey,
        queryFn: async () => {
          const { data, error } = await supabase.functions.invoke('generate-lens-summary', {
            body: { symbol, lens: nextLens }
          });
          
          if (error) {
            console.error('Prefetch lens summary error:', error);
            throw error;
          }
          
          // Map the backend response (same as useDecisionLensSummary)
          const mapConfidence = (c?: string) => {
            if (!c) return undefined;
            if (c === 'high') return 'high';
            if (c === 'moderate') return 'moderate';
            return 'experimental';
          };
          
          return {
            summary: data.summary,
            cached: data.cached,
            messageCount: data.messageCount,
            confidence: mapConfidence(data.confidence),
            relevantCount: data.relevantCount,
            dominantThemeShare: data.dominantThemeShare,
          };
        },
        staleTime: 5 * 60 * 1000,
      });
    }, 500); // 500ms delay to let current lens load first
    
    return () => clearTimeout(timeoutId);
  }, [symbol, currentLens, customLens, queryClient]);
}
