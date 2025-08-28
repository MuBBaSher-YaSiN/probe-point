-- Create a manual admin profile entry for the file-based admin system
-- This allows the admin system to work without requiring a Supabase auth user

INSERT INTO profiles (user_id, full_name, role, created_at, updated_at) 
VALUES (
    'file-based-admin', 
    'System Administrator', 
    'admin',
    now(),
    now()
) ON CONFLICT (user_id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  updated_at = now();