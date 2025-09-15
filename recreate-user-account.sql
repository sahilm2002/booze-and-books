-- Recreate user account after accidental deletion
-- Replace 'your-email@example.com' and 'your-password' with your actual credentials

-- First, let's create the user in auth.users
INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token,
    raw_user_meta_data,
    is_super_admin,
    phone,
    phone_confirmed_at,
    phone_change,
    phone_change_token,
    email_change_confirm_status,
    banned_until,
    reauthentication_token,
    reauthentication_sent_at
) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'your-email@example.com',  -- REPLACE WITH YOUR EMAIL
    crypt('your-password', gen_salt('bf')),  -- REPLACE WITH YOUR PASSWORD
    NOW(),
    NOW(),
    NOW(),
    '',
    '',
    '',
    '',
    '{}',
    false,
    null,
    null,
    '',
    '',
    0,
    null,
    '',
    null
) RETURNING id, email;

-- The profile will be automatically created by the trigger we set up
-- But let's also verify the trigger exists
SELECT 
    trigger_name, 
    event_manipulation, 
    event_object_table, 
    action_statement
FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_created';
