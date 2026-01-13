import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { MarketPsychologyData } from "./use-market-psychology";

export interface PsychologySnapshot {
  id: string;
  user_id: string;
  recorded_at: string;
  fear_greed_index: number;
  fear_greed_label: string;
  dominant_signal: string | null;
  signal_strength: string | null;
  symbols: string[];
  symbol_count: number;
  emotion_breakdown: Record<string, number>;
  signals: Array<{
    type: string;
    label: string;
    description: string;
    confidence: number;
  }>;
  created_at: string;
}

export function usePsychologyHistory(days: number = 30) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["psychology-history", user?.id, days],
    queryFn: async (): Promise<PsychologySnapshot[]> => {
      if (!user) return [];

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data, error } = await supabase
        .from("market_psychology_history")
        .select("*")
        .eq("user_id", user.id)
        .gte("recorded_at", startDate.toISOString())
        .order("recorded_at", { ascending: true });

      if (error) throw error;
      return (data || []) as PsychologySnapshot[];
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useSavePsychologySnapshot() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (psychology: MarketPsychologyData & { symbols: string[] }) => {
      if (!user) throw new Error("Not authenticated");

      // Check if we already have a snapshot for today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const { data: existing } = await supabase
        .from("market_psychology_history")
        .select("id")
        .eq("user_id", user.id)
        .gte("recorded_at", today.toISOString())
        .lt("recorded_at", tomorrow.toISOString())
        .limit(1);

      // Convert emotion breakdown to simple object
      const emotionBreakdown: Record<string, number> = {};
      psychology.emotionBreakdown.forEach((e) => {
        emotionBreakdown[e.name] = e.score;
      });

      const snapshotData = {
        user_id: user.id,
        fear_greed_index: psychology.fearGreedIndex,
        fear_greed_label: psychology.fearGreedLabel,
        dominant_signal: psychology.dominantSignal,
        signal_strength: psychology.signalStrength,
        symbols: psychology.symbols,
        symbol_count: psychology.symbols.length,
        emotion_breakdown: emotionBreakdown,
        signals: psychology.signals,
      };

      if (existing && existing.length > 0) {
        // Update existing snapshot
        const { error } = await supabase
          .from("market_psychology_history")
          .update(snapshotData)
          .eq("id", existing[0].id);

        if (error) throw error;
        return { updated: true };
      } else {
        // Insert new snapshot
        const { error } = await supabase
          .from("market_psychology_history")
          .insert(snapshotData);

        if (error) throw error;
        return { updated: false };
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["psychology-history", user?.id] });
    },
  });
}

export function useLatestPsychologySnapshot() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["psychology-history-latest", user?.id],
    queryFn: async (): Promise<PsychologySnapshot | null> => {
      if (!user) return null;

      const { data, error } = await supabase
        .from("market_psychology_history")
        .select("*")
        .eq("user_id", user.id)
        .order("recorded_at", { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== "PGRST116") throw error;
      return data as PsychologySnapshot | null;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });
}
