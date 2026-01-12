import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface Alert {
  id: string;
  user_id: string;
  symbol: string;
  alert_type: string;
  threshold: number | null;
  is_active: boolean;
  last_triggered_at: string | null;
  created_at: string;
}

export interface CreateAlertInput {
  symbol: string;
  alert_type: string;
  threshold?: number | null;
}

export function useAlerts() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["alerts", user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from("alerts")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Alert[];
    },
    enabled: !!user,
  });
}

export function useAlertsBySymbol(symbol: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["alerts", user?.id, symbol],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from("alerts")
        .select("*")
        .eq("user_id", user.id)
        .eq("symbol", symbol.toUpperCase())
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Alert[];
    },
    enabled: !!user && !!symbol,
  });
}

export function useCreateAlert() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateAlertInput) => {
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("alerts")
        .insert({
          user_id: user.id,
          symbol: input.symbol.toUpperCase(),
          alert_type: input.alert_type,
          threshold: input.threshold ?? null,
        })
        .select()
        .single();

      if (error) throw error;
      return data as Alert;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["alerts", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["alerts", user?.id, data.symbol] });
    },
  });
}

export function useUpdateAlert() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      alertId, 
      updates 
    }: { 
      alertId: string; 
      updates: Partial<Pick<Alert, "alert_type" | "threshold" | "is_active">> 
    }) => {
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("alerts")
        .update(updates)
        .eq("id", alertId)
        .eq("user_id", user.id)
        .select()
        .single();

      if (error) throw error;
      return data as Alert;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["alerts", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["alerts", user?.id, data.symbol] });
    },
  });
}

export function useToggleAlert() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ alertId, isActive }: { alertId: string; isActive: boolean }) => {
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("alerts")
        .update({ is_active: isActive })
        .eq("id", alertId)
        .eq("user_id", user.id)
        .select()
        .single();

      if (error) throw error;
      return data as Alert;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["alerts", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["alerts", user?.id, data.symbol] });
    },
  });
}

export function useDeleteAlert() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ alertId, symbol }: { alertId: string; symbol: string }) => {
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("alerts")
        .delete()
        .eq("id", alertId)
        .eq("user_id", user.id);

      if (error) throw error;
      return { alertId, symbol };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["alerts", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["alerts", user?.id, data.symbol] });
    },
  });
}
