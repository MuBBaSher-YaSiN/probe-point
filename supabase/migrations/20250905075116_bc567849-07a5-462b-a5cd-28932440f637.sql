-- Fix critical security issues - step by step approach

-- 1. First, create the security definer function to prevent infinite recursion
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE user_id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE SET search_path = public;

-- 2. Clean up duplicate profiles first (keep the oldest one for each user_id)
DELETE FROM public.profiles a 
USING public.profiles b 
WHERE a.user_id = b.user_id 
AND a.created_at > b.created_at;