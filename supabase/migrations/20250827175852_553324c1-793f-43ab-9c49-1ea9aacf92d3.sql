-- Create ProbePoint database schema

-- User profiles table for additional user information
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Sites table for monitored URLs
CREATE TABLE public.sites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  label TEXT,
  tags TEXT[],
  default_device TEXT DEFAULT 'mobile' CHECK (default_device IN ('mobile', 'desktop')),
  default_region TEXT DEFAULT 'us',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, url)
);

-- Test runs table for performance test results
CREATE TABLE public.test_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  site_id UUID REFERENCES public.sites(id) ON DELETE SET NULL,
  url TEXT NOT NULL,
  device TEXT DEFAULT 'mobile' CHECK (device IN ('mobile', 'desktop')),
  region TEXT DEFAULT 'us',
  status TEXT DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'completed', 'failed', 'cancelled')),
  
  -- Performance scores (0-100)
  performance_score INTEGER,
  seo_score INTEGER,
  accessibility_score INTEGER,
  best_practices_score INTEGER,
  
  -- Core Web Vitals (in milliseconds)
  first_contentful_paint INTEGER,
  largest_contentful_paint INTEGER,
  cumulative_layout_shift DECIMAL(5,3),
  total_blocking_time INTEGER,
  time_to_interactive INTEGER,
  
  -- Additional metrics
  total_requests INTEGER,
  total_bytes BIGINT,
  
  -- Timestamps
  queued_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  
  -- Raw data and error handling
  raw_data JSONB,
  error_message TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Recommendations table for actionable insights
CREATE TABLE public.recommendations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  test_run_id UUID NOT NULL REFERENCES public.test_runs(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  impact TEXT CHECK (impact IN ('high', 'medium', 'low')),
  fix_steps TEXT,
  docs_url TEXT,
  potential_savings INTEGER, -- in milliseconds or bytes
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- API keys table for programmatic access
CREATE TABLE public.api_keys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  key_hash TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  last_used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  revoked_at TIMESTAMP WITH TIME ZONE
);

-- Audit logs for security and compliance
CREATE TABLE public.audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  actor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id UUID,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for sites
CREATE POLICY "Users can manage their own sites" ON public.sites
  FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for test_runs
CREATE POLICY "Users can view their own test runs" ON public.test_runs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create test runs" ON public.test_runs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own test runs" ON public.test_runs
  FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for recommendations
CREATE POLICY "Users can view recommendations for their test runs" ON public.recommendations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.test_runs 
      WHERE test_runs.id = recommendations.test_run_id 
      AND test_runs.user_id = auth.uid()
    )
  );

-- RLS Policies for api_keys
CREATE POLICY "Users can manage their own API keys" ON public.api_keys
  FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for audit_logs (admins only for now)
CREATE POLICY "Only admins can view audit logs" ON public.audit_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Create indexes for performance
CREATE INDEX idx_sites_user_id ON public.sites(user_id);
CREATE INDEX idx_sites_url ON public.sites(url);
CREATE INDEX idx_test_runs_user_id ON public.test_runs(user_id);
CREATE INDEX idx_test_runs_site_id ON public.test_runs(site_id);
CREATE INDEX idx_test_runs_created_at ON public.test_runs(created_at DESC);
CREATE INDEX idx_test_runs_status ON public.test_runs(status);
CREATE INDEX idx_recommendations_test_run_id ON public.recommendations(test_run_id);
CREATE INDEX idx_api_keys_user_id ON public.api_keys(user_id);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for timestamp updates
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sites_updated_at
  BEFORE UPDATE ON public.sites
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_test_runs_updated_at
  BEFORE UPDATE ON public.test_runs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();