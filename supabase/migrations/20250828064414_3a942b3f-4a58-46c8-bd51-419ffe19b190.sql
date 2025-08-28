-- Create jobs table for job queue system (if not exists)
CREATE TABLE IF NOT EXISTS public.jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'completed', 'failed')),
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  error TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for efficient job processing (if not exists)
CREATE INDEX IF NOT EXISTS idx_jobs_status_created_at ON public.jobs (status, created_at);
CREATE INDEX IF NOT EXISTS idx_jobs_type ON public.jobs (type);

-- Add missing columns to test_runs table for enhanced metrics
ALTER TABLE public.test_runs 
ADD COLUMN IF NOT EXISTS speed_index NUMERIC,
ADD COLUMN IF NOT EXISTS total_requests INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_bytes BIGINT DEFAULT 0;

-- Enable RLS on jobs table (if not already enabled)
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for jobs (admin only) - only if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'jobs' AND policyname = 'Jobs are viewable by admin only') THEN
    CREATE POLICY "Jobs are viewable by admin only" 
    ON public.jobs 
    FOR SELECT 
    USING (false); -- Will be handled by edge functions
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'jobs' AND policyname = 'Jobs are manageable by system only') THEN
    CREATE POLICY "Jobs are manageable by system only" 
    ON public.jobs 
    FOR ALL 
    USING (false); -- Will be handled by edge functions
  END IF;
END $$;

-- Create trigger for jobs updated_at
DROP TRIGGER IF EXISTS update_jobs_updated_at ON public.jobs;
CREATE TRIGGER update_jobs_updated_at
BEFORE UPDATE ON public.jobs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();