-- Security fix: Remove dangerous anon permissions on notifications table
-- This migration revokes all permissions for anonymous users on notifications
-- and ensures only authenticated users can access their own notifications

-- Revoke all permissions that may have been granted to anon role on notifications
REVOKE ALL ON notifications FROM anon;

-- Ensure proper RLS policies are in place (idempotent)
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can insert notifications" ON notifications;

CREATE POLICY "Users can view own notifications" 
ON notifications FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" 
ON notifications FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert notifications" 
ON notifications FOR INSERT 
WITH CHECK (true); -- Allow system to insert notifications

-- Ensure authenticated users have proper least-privilege permissions
-- Only SELECT and UPDATE needed for users, INSERT is handled by system functions
GRANT SELECT, UPDATE ON notifications TO authenticated;

-- Verify current permissions on notifications table
SELECT 
    grantee,
    privilege_type,
    is_grantable
FROM information_schema.role_table_grants 
WHERE table_name = 'notifications'
ORDER BY grantee, privilege_type;
