-- Update the profile role for iqraf2001@gmail.com to admin
-- This will allow the user to access the admin panel

UPDATE profiles 
SET role = 'admin', updated_at = now()
WHERE user_id IN (
  SELECT id FROM auth.users WHERE email = 'iqraf2001@gmail.com'
);