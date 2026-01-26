import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface CustomLens {
  id: string;
  user_id: string;
  name: string;
  slug: string;
  decision_question: string;
  focus_areas: string[];
  exclusions: string[];
  created_at: string;
  updated_at: string;
}

export interface CreateCustomLensInput {
  name: string;
  decision_question: string;
  focus_areas: string[];
  exclusions: string[];
}

export interface UpdateCustomLensInput extends Partial<CreateCustomLensInput> {
  id: string;
}

// Generate a URL-safe slug from name
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
    .slice(0, 50);
}

export function useCustomLenses() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['custom-lenses', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('user_custom_lenses')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });
      
      if (error) {
        console.error('Error fetching custom lenses:', error);
        throw error;
      }
      
      return data as CustomLens[];
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useCreateCustomLens() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (input: CreateCustomLensInput) => {
      if (!user?.id) throw new Error('User must be logged in');
      
      const slug = `custom-${generateSlug(input.name)}-${Date.now().toString(36)}`;
      
      const { data, error } = await supabase
        .from('user_custom_lenses')
        .insert({
          user_id: user.id,
          name: input.name.trim(),
          slug,
          decision_question: input.decision_question.trim(),
          focus_areas: input.focus_areas.filter(f => f.trim().length > 0),
          exclusions: input.exclusions.filter(e => e.trim().length > 0),
        })
        .select()
        .single();
      
      if (error) {
        console.error('Error creating custom lens:', error);
        throw error;
      }
      
      return data as CustomLens;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-lenses'] });
      toast.success('Custom lens created');
    },
    onError: (error) => {
      toast.error('Failed to create custom lens');
      console.error('Create custom lens error:', error);
    },
  });
}

export function useUpdateCustomLens() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (input: UpdateCustomLensInput) => {
      const updateData: Record<string, unknown> = {};
      
      if (input.name) updateData.name = input.name.trim();
      if (input.decision_question) updateData.decision_question = input.decision_question.trim();
      if (input.focus_areas) updateData.focus_areas = input.focus_areas.filter(f => f.trim().length > 0);
      if (input.exclusions) updateData.exclusions = input.exclusions.filter(e => e.trim().length > 0);
      
      const { data, error } = await supabase
        .from('user_custom_lenses')
        .update(updateData)
        .eq('id', input.id)
        .select()
        .single();
      
      if (error) {
        console.error('Error updating custom lens:', error);
        throw error;
      }
      
      return data as CustomLens;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-lenses'] });
      toast.success('Custom lens updated');
    },
    onError: (error) => {
      toast.error('Failed to update custom lens');
      console.error('Update custom lens error:', error);
    },
  });
}

export function useDeleteCustomLens() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('user_custom_lenses')
        .delete()
        .eq('id', id);
      
      if (error) {
        console.error('Error deleting custom lens:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-lenses'] });
      toast.success('Custom lens deleted');
    },
    onError: (error) => {
      toast.error('Failed to delete custom lens');
      console.error('Delete custom lens error:', error);
    },
  });
}
