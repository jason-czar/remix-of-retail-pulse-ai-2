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

export function useNarrativeHistory(
  symbol: string, 
  days: number = 7,
  periodType: "hourly" | "daily" | "all" = "all"
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

      // Build theme evolution map
      const themeEvolution = new Map<string, { time: string; count: number; sentiment: string }[]>();
      const themeCounts = new Map<string, number>();

      points.forEach((point) => {
        const time = point.recorded_at;
        point.narratives.forEach((narrative) => {
          const theme = narrative.name;
          if (!themeEvolution.has(theme)) {
            themeEvolution.set(theme, []);
          }
          themeEvolution.get(theme)!.push({
            time,
            count: narrative.count,
            sentiment: narrative.sentiment,
          });
          themeCounts.set(theme, (themeCounts.get(theme) || 0) + narrative.count);
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
    enabled: !!symbol,
  });
}
