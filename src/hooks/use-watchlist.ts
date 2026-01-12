import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface Watchlist {
  id: string;
  user_id: string;
  name: string;
  symbols: string[];
  created_at: string;
  updated_at: string;
}

const DEFAULT_WATCHLIST_NAME = "My Watchlist";

export function useWatchlists() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["watchlists", user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from("watchlists")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data as Watchlist[];
    },
    enabled: !!user,
  });
}

export function useDefaultWatchlist() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: ["watchlist", "default", user?.id],
    queryFn: async () => {
      if (!user) return null;

      // Try to get existing default watchlist
      const { data, error } = await supabase
        .from("watchlists")
        .select("*")
        .eq("user_id", user.id)
        .eq("name", DEFAULT_WATCHLIST_NAME)
        .maybeSingle();

      if (error) throw error;

      // If no default watchlist exists, create one
      if (!data) {
        const { data: newWatchlist, error: createError } = await supabase
          .from("watchlists")
          .insert({
            user_id: user.id,
            name: DEFAULT_WATCHLIST_NAME,
            symbols: [],
          })
          .select()
          .single();

        if (createError) throw createError;
        return newWatchlist as Watchlist;
      }

      return data as Watchlist;
    },
    enabled: !!user,
  });
}

export function useCreateWatchlist() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ name, symbols = [] }: { name: string; symbols?: string[] }) => {
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("watchlists")
        .insert({
          user_id: user.id,
          name,
          symbols,
        })
        .select()
        .single();

      if (error) throw error;
      return data as Watchlist;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["watchlists"] });
      toast.success("Watchlist created");
    },
    onError: (error) => {
      toast.error("Failed to create watchlist: " + error.message);
    },
  });
}

export function useUpdateWatchlist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, name, symbols }: { id: string; name?: string; symbols?: string[] }) => {
      const updates: Partial<Watchlist> = {};
      if (name !== undefined) updates.name = name;
      if (symbols !== undefined) updates.symbols = symbols;

      const { data, error } = await supabase
        .from("watchlists")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as Watchlist;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["watchlists"] });
      queryClient.invalidateQueries({ queryKey: ["watchlist", "default"] });
    },
    onError: (error) => {
      toast.error("Failed to update watchlist: " + error.message);
    },
  });
}

export function useDeleteWatchlist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("watchlists")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["watchlists"] });
      toast.success("Watchlist deleted");
    },
    onError: (error) => {
      toast.error("Failed to delete watchlist: " + error.message);
    },
  });
}

export function useAddToWatchlist() {
  const updateWatchlist = useUpdateWatchlist();

  return useMutation({
    mutationFn: async ({ watchlistId, symbol, currentSymbols }: { 
      watchlistId: string; 
      symbol: string; 
      currentSymbols: string[];
    }) => {
      if (currentSymbols.includes(symbol.toUpperCase())) {
        throw new Error("Symbol already in watchlist");
      }

      return updateWatchlist.mutateAsync({
        id: watchlistId,
        symbols: [...currentSymbols, symbol.toUpperCase()],
      });
    },
    onSuccess: (_, { symbol }) => {
      toast.success(`${symbol.toUpperCase()} added to watchlist`);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

export function useRemoveFromWatchlist() {
  const updateWatchlist = useUpdateWatchlist();

  return useMutation({
    mutationFn: async ({ watchlistId, symbol, currentSymbols }: { 
      watchlistId: string; 
      symbol: string; 
      currentSymbols: string[];
    }) => {
      return updateWatchlist.mutateAsync({
        id: watchlistId,
        symbols: currentSymbols.filter(s => s !== symbol.toUpperCase()),
      });
    },
    onSuccess: (_, { symbol }) => {
      toast.success(`${symbol.toUpperCase()} removed from watchlist`);
    },
    onError: (error) => {
      toast.error("Failed to remove from watchlist: " + error.message);
    },
  });
}

// Helper hook to check if a symbol is in the default watchlist
export function useIsInWatchlist(symbol: string) {
  const { data: watchlist } = useDefaultWatchlist();
  return watchlist?.symbols.includes(symbol.toUpperCase()) ?? false;
}
