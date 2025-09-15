-- Recreate both user accounts after accidental deletion
-- You'll need to replace the email addresses and passwords with the actual credentials

-- User 1
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
    'user1@example.com',  -- REPLACE WITH FIRST USER'S EMAIL
    crypt('password1', gen_salt('bf')),  -- REPLACE WITH FIRST USER'S PASSWORD
    NOW(),
    NOW(),
    NOW(),
    '',
    '',
    '',
    '',
    '{"full_name": "User One"}',
    false,
    null,
    null,
    '',
    '',
    0,
    null,
    '',
    null
);

-- User 2
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
    'user2@example.com',  -- REPLACE WITH SECOND USER'S EMAIL
    crypt('password2', gen_salt('bf')),  -- REPLACE WITH SECOND USER'S PASSWORD
    NOW(),
    NOW(),
    NOW(),
    '',
    '',
    '',
    '',
    '{"full_name": "User Two"}',
    false,
    null,
    null,
    '',
    '',
    0,
    null,
    '',
    null
);

-- Verify the users were created
SELECT 
    id, 
    email, 
    created_at,
    email_confirmed_at,
    raw_user_meta_data
FROM auth.users 
ORDER BY created_at DESC;

-- Check if profiles were automatically created by the trigger
SELECT 
    p.id,
    p.username,
    p.full_name,
    p.created_at,
    u.email
FROM profiles p
JOIN auth.users u ON p.id = u.id
ORDER BY p.created_at DESC;
