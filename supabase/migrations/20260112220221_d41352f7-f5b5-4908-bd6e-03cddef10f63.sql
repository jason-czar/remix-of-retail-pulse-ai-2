-- Add message_count column to narrative_cache
ALTER TABLE public.narrative_cache 
ADD COLUMN message_count integer DEFAULT 0;