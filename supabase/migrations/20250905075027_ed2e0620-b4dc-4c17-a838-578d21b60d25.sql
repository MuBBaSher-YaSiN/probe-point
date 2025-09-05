-- Fix critical security issues with RLS policies

-- 1. Fix infinite recursion in profiles table by creating a security definer function
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE user_id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE SET search_path = public;

-- 2. Drop existing problematic profiles policies that cause infinite recursion
DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

-- 3. Create new profiles policies using the security definer function
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (
  (auth.uid() = user_id) OR 
  (public.get_current_user_role() = 'admin')
);

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (
  (auth.uid() = user_id) OR 
  (public.get_current_user_role() = 'admin')
)
WITH CHECK (
  (auth.uid() = user_id) OR 
  (public.get_current_user_role() = 'admin')
);

CREATE POLICY "Admins can delete profiles" 
ON public.profiles 
FOR DELETE 
USING (public.get_current_user_role() = 'admin');

-- 4. Fix jobs table RLS policies to allow system access
DROP POLICY IF EXISTS "Jobs are manageable by system only" ON public.jobs;
DROP POLICY IF EXISTS "Jobs are viewable by admin only" ON public.jobs;

-- Allow service role (system) to manage all jobs
CREATE POLICY "Service role can manage all jobs"
ON public.jobs
FOR ALL
USING (
  auth.jwt() ->> 'role' = 'service_role' OR
  public.get_current_user_role() = 'admin'
);

-- Allow authenticated users to view their own jobs (if we add user_id later)
CREATE POLICY "Users can view jobs"
ON public.jobs
FOR SELECT
USING (
  auth.jwt() ->> 'role' = 'service_role' OR
  public.get_current_user_role() = 'admin'
);

-- 5. Clean up any duplicate profiles (keep the oldest one for each user_id)
DELETE FROM public.profiles a 
USING public.profiles b 
WHERE a.user_id = b.user_id 
AND a.created_at > b.created_at;