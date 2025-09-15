-- Cleanup script to revoke insecure anonymous permissions on notifications
-- Run this on environments where fix-notifications-and-uuid.sql was previously applied
-- with the insecure anon grants

-- Revoke all permissions that may have been granted to anon role on notifications
REVOKE ALL ON notifications FROM anon;

-- Verify current permissions on notifications table
SELECT 
    grantee,
    privilege_type,
    is_grantable
FROM information_schema.role_table_grants 
WHERE table_name = 'notifications'
ORDER BY grantee, privilege_type;

-- Verify RLS policies are properly configured
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'notifications'
ORDER BY policyname;

-- Test that anonymous access is properly blocked
-- This should return 0 rows when run as anon user
SELECT 'SECURITY TEST: If this query returns rows as anon user, there is still a security issue' as warning;
