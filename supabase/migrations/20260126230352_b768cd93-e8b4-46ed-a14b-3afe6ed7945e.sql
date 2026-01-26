-- Create table for user-defined custom lenses
CREATE TABLE public.user_custom_lenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  decision_question TEXT NOT NULL,
  focus_areas TEXT[] NOT NULL DEFAULT '{}',
  exclusions TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT unique_user_lens_slug UNIQUE (user_id, slug)
);

-- Enable Row Level Security
ALTER TABLE public.user_custom_lenses ENABLE ROW LEVEL SECURITY;

-- Users can only view their own custom lenses
CREATE POLICY "Users can view their own custom lenses" 
ON public.user_custom_lenses 
FOR SELECT 
USING (auth.uid() = user_id);

-- Users can create their own custom lenses
CREATE POLICY "Users can create their own custom lenses" 
ON public.user_custom_lenses 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Users can update their own custom lenses
CREATE POLICY "Users can update their own custom lenses" 
ON public.user_custom_lenses 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Users can delete their own custom lenses
CREATE POLICY "Users can delete their own custom lenses" 
ON public.user_custom_lenses 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_user_custom_lenses_updated_at
BEFORE UPDATE ON public.user_custom_lenses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster lookups
CREATE INDEX idx_user_custom_lenses_user_id ON public.user_custom_lenses(user_id);