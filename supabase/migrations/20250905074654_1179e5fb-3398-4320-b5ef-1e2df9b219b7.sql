-- Ensure iqraf2001@gmail.com has admin role
-- First, check if the user exists and update their role to admin
UPDATE profiles 
SET role = 'admin', updated_at = now()
WHERE user_id IN (
  SELECT id FROM auth.users WHERE email = 'iqraf2001@gmail.com'
);

-- If no rows were updated (user doesn't exist), we'll need to insert when they sign up
-- The admin login process will handle profile creation if needed