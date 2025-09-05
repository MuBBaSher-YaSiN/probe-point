-- Fix RLS policies for test_runs to allow admins to see all test runs for proper statistics

-- Drop existing restrictive policy
DROP POLICY IF EXISTS "Users can view their own test runs" ON public.test_runs;

-- Create new policy that allows users to see their own tests AND admins to see all tests
CREATE POLICY "Users can view test runs" 
ON public.test_runs 
FOR SELECT 
USING (
  (auth.uid() = user_id) OR 
  (public.get_current_user_role() = 'admin')
);