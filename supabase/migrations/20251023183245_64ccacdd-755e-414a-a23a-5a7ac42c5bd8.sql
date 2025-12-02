-- Create enum for profile types
CREATE TYPE public.apolo_profile_type AS ENUM ('personal', 'dependent');

-- Create apolo_profiles table
CREATE TABLE public.apolo_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  profile_type public.apolo_profile_type NOT NULL,
  name TEXT NOT NULL,
  age INTEGER,
  relationship TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT check_dependent_fields CHECK (
    (profile_type = 'personal' AND age IS NULL AND relationship IS NULL) OR
    (profile_type = 'dependent' AND age IS NOT NULL AND relationship IS NOT NULL)
  )
);

-- Enable RLS
ALTER TABLE public.apolo_profiles ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own profiles"
  ON public.apolo_profiles
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own profiles"
  ON public.apolo_profiles
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profiles"
  ON public.apolo_profiles
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own profiles"
  ON public.apolo_profiles
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_apolo_profiles_updated_at
  BEFORE UPDATE ON public.apolo_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();