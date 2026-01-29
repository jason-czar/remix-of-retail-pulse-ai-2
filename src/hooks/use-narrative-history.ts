import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface NarrativeHistoryPoint {
  id: string;
  symbol: string;
  recorded_at: string;
  period_type: "hourly" | "daily";
  narratives: Array<{
    name: string;
    theme?: string;
    count: number;
    sentiment: string;
  }>;
  dominant_narrative: string | null;
  message_count: number;
}

interface NarrativeHistoryResult {
  data: NarrativeHistoryPoint[];
  themeEvolution: Map<string, { time: string; count: number; sentiment: string }[]>;
  dominantThemes: string[];
}

// Normalize narrative names to consistent categories for better trend tracking
const NARRATIVE_CATEGORIES: { pattern: RegExp; category: string }[] = [
  // Price & Trading
  { pattern: /price\s*(movement|action|target|drop|surge|change)/i, category: "Price Movement" },
  { pattern: /stock\s*(price|movement)/i, category: "Price Movement" },
  { pattern: /technicals?|chart/i, category: "Technical Analysis" },
  
  // Earnings & Revenue
  { pattern: /revenue|earnings|miss|beat|prelim/i, category: "Earnings & Revenue" },
  { pattern: /financial\s*(performance|results)/i, category: "Earnings & Revenue" },
  
  // Valuation
  { pattern: /undervalua?t|overvalua?t|valuation|takeover|buyout|acquisition|merger/i, category: "Valuation & M&A" },
  { pattern: /roche|buyout|takeover/i, category: "Valuation & M&A" },
  
  // Regulatory & FDA
  { pattern: /fda|regulatory|approval|pmo|screening/i, category: "FDA & Regulatory" },
  { pattern: /newborn\s*screening/i, category: "FDA & Regulatory" },
  
  // Conferences & Events
  { pattern: /jpm|jp\s*morgan|conference|presentation|investor\s*day/i, category: "Conferences & Events" },
  
  // Product & Pipeline
  { pattern: /pipeline|drug|therapy|trial|clinical|sirna|rnai/i, category: "Pipeline & Products" },
  { pattern: /elevidys|safety|efficacy/i, category: "Pipeline & Products" },
  { pattern: /arrowhead/i, category: "Pipeline & Products" },
  
  // Financials
  { pattern: /cash|balance|reserve|capital/i, category: "Cash & Financials" },
  
  // Market Sentiment
  { pattern: /sentiment|bullish|bearish/i, category: "Market Sentiment" },
  { pattern: /manipulation|short|squeeze|scare/i, category: "Market Manipulation" },
  
  // Investment
  { pattern: /investment|strategy|position/i, category: "Investment Strategy" },
];

function normalizeNarrativeName(name: string): string {
  for (const { pattern, category } of NARRATIVE_CATEGORIES) {
    if (pattern.test(name)) {
      return category;
    }
  }
  // If no match, return a cleaned version of the original name
  return name.split(/[\/\-]/)[0].trim();
}

export function useNarrativeHistory(
  symbol: string, 
  days: number = 7,
  periodType: "hourly" | "daily" | "all" = "all",
  enabled: boolean = true
) {
  return useQuery({
    queryKey: ["narrative-history", symbol, days, periodType],
    queryFn: async (): Promise<NarrativeHistoryResult> => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      let query = supabase
        .from("narrative_history")
        .select("*")
        .eq("symbol", symbol.toUpperCase())
        .gte("recorded_at", startDate.toISOString())
        .order("recorded_at", { ascending: true });

      if (periodType !== "all") {
        query = query.eq("period_type", periodType);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(`Failed to fetch narrative history: ${error.message}`);
      }

      const points: NarrativeHistoryPoint[] = (data || []).map((row) => ({
        id: row.id,
        symbol: row.symbol,
        recorded_at: row.recorded_at,
        period_type: row.period_type as "hourly" | "daily",
        narratives: Array.isArray(row.narratives) 
          ? row.narratives.map((n: any) => ({
              name: n.name || n.theme || "Unknown",
              theme: n.theme || n.name,
              count: n.count || 0,
              sentiment: n.sentiment || "neutral",
            }))
          : [],
        dominant_narrative: row.dominant_narrative,
        message_count: row.message_count || 0,
      }));

      // Build theme evolution map with NORMALIZED theme names
      const themeEvolution = new Map<string, { time: string; count: number; sentiment: string }[]>();
      const themeCounts = new Map<string, number>();
      const themeSentiments = new Map<string, Map<string, number>>(); // Track sentiment counts per theme

      points.forEach((point) => {
        const time = point.recorded_at;
        
        // Group narratives by normalized category
        const normalizedNarratives = new Map<string, { count: number; sentiments: string[] }>();
        
        point.narratives.forEach((narrative) => {
          const normalizedName = normalizeNarrativeName(narrative.name);
          
          if (!normalizedNarratives.has(normalizedName)) {
            normalizedNarratives.set(normalizedName, { count: 0, sentiments: [] });
          }
          
          const entry = normalizedNarratives.get(normalizedName)!;
          entry.count += narrative.count;
          entry.sentiments.push(narrative.sentiment);
        });
        
        // Add normalized narratives to evolution
        normalizedNarratives.forEach(({ count, sentiments }, theme) => {
          if (!themeEvolution.has(theme)) {
            themeEvolution.set(theme, []);
          }
          
          // Determine dominant sentiment for this time point
          const sentimentCounts: Record<string, number> = {};
          sentiments.forEach(s => { sentimentCounts[s] = (sentimentCounts[s] || 0) + 1; });
          const dominantSentiment = Object.entries(sentimentCounts)
            .sort((a, b) => b[1] - a[1])[0]?.[0] || "neutral";
          
          themeEvolution.get(theme)!.push({
            time,
            count,
            sentiment: dominantSentiment,
          });
          
          themeCounts.set(theme, (themeCounts.get(theme) || 0) + count);
          
          // Track overall sentiments for theme
          if (!themeSentiments.has(theme)) {
            themeSentiments.set(theme, new Map());
          }
          const sentMap = themeSentiments.get(theme)!;
          sentiments.forEach(s => sentMap.set(s, (sentMap.get(s) || 0) + 1));
        });
      });

      // Get top 8 dominant themes by total count
      const dominantThemes = Array.from(themeCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([theme]) => theme);

      return {
        data: points,
        themeEvolution,
        dominantThemes,
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: enabled && !!symbol,
  });
}
