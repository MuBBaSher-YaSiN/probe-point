-- Update trigger function to handle profile updates correctly
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Ensure the trigger exists for profiles table
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Update RLS policies to allow users to update their own profiles properly
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Allow admins to manage all profiles
CREATE POLICY "Admins can manage all profiles" 
ON public.profiles 
FOR ALL
USING (EXISTS (
  SELECT 1 FROM profiles
  WHERE user_id = auth.uid()
  AND role = 'admin'
));

-- Allow admins to view all profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (
  auth.uid() = user_id 
  OR 
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);