-- Check if auth.users table still has data
SELECT 
    id, 
    email, 
    created_at,
    email_confirmed_at,
    last_sign_in_at,
    raw_user_meta_data
FROM auth.users 
ORDER BY created_at DESC 
LIMIT 10;

-- Also check if there are any profiles
SELECT 
    p.id,
    p.username,
    p.full_name,
    p.created_at,
    u.email
FROM profiles p
LEFT JOIN auth.users u ON p.id = u.id
ORDER BY p.created_at DESC
LIMIT 10;
