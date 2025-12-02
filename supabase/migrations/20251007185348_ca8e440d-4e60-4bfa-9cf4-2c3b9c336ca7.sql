-- Create profiles table for consultants
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Create clients table
CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultant_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(consultant_id, email)
);

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- Clients policies
CREATE POLICY "Consultants can view own clients"
  ON public.clients FOR SELECT
  USING (auth.uid() = consultant_id);

CREATE POLICY "Consultants can create clients"
  ON public.clients FOR INSERT
  WITH CHECK (auth.uid() = consultant_id);

CREATE POLICY "Consultants can update own clients"
  ON public.clients FOR UPDATE
  USING (auth.uid() = consultant_id);

CREATE POLICY "Consultants can delete own clients"
  ON public.clients FOR DELETE
  USING (auth.uid() = consultant_id);

-- Create financial studies table
CREATE TABLE public.financial_studies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  consultant_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  current_age INTEGER NOT NULL,
  application_period INTEGER NOT NULL,
  initial_capital DECIMAL(15,2) NOT NULL DEFAULT 0,
  contribution_expectation DECIMAL(15,2) NOT NULL DEFAULT 0,
  contribution_frequency TEXT NOT NULL DEFAULT 'Mensal',
  return_rate DECIMAL(5,2) NOT NULL,
  inflation DECIMAL(5,2) NOT NULL,
  adjust_capital_inflation BOOLEAN DEFAULT false,
  adjust_contributions_inflation BOOLEAN DEFAULT false,
  real_growth_contributions DECIMAL(5,2) DEFAULT 0,
  include_tax BOOLEAN DEFAULT false,
  tax_rate DECIMAL(5,2) DEFAULT 15,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

ALTER TABLE public.financial_studies ENABLE ROW LEVEL SECURITY;

-- Financial studies policies
CREATE POLICY "Consultants can view own studies"
  ON public.financial_studies FOR SELECT
  USING (auth.uid() = consultant_id);

CREATE POLICY "Consultants can create studies"
  ON public.financial_studies FOR INSERT
  WITH CHECK (auth.uid() = consultant_id);

CREATE POLICY "Consultants can update own studies"
  ON public.financial_studies FOR UPDATE
  USING (auth.uid() = consultant_id);

CREATE POLICY "Consultants can delete own studies"
  ON public.financial_studies FOR DELETE
  USING (auth.uid() = consultant_id);

-- Create trigger function for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Add triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_clients_updated_at
  BEFORE UPDATE ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_financial_studies_updated_at
  BEFORE UPDATE ON public.financial_studies
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();