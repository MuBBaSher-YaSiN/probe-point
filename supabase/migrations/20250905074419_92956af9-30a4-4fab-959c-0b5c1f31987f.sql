-- Check if the user exists and update role to admin
DO $$
DECLARE
    target_user_id UUID;
BEGIN
    -- Get the user_id for the admin email
    SELECT id INTO target_user_id 
    FROM auth.users 
    WHERE email = 'iqraf2001@gmail.com';
    
    IF target_user_id IS NOT NULL THEN
        -- Update or insert the profile with admin role
        INSERT INTO profiles (user_id, role, full_name)
        VALUES (target_user_id, 'admin', 'System Administrator')
        ON CONFLICT (user_id) 
        DO UPDATE SET role = 'admin', full_name = 'System Administrator', updated_at = now();
        
        RAISE NOTICE 'Admin role assigned to user: %', target_user_id;
    ELSE
        RAISE NOTICE 'User with email iqraf2001@gmail.com not found in auth.users';
    END IF;
END $$;