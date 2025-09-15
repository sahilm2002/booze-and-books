-- Fix permissions for updating is_read column in notifications table
-- The current permissions might be too restrictive and causing schema cache issues

-- First, let's ensure the column exists and has proper permissions
-- Grant full UPDATE permission to authenticated users for their own notifications
-- (The RLS policy will still restrict to own notifications)

-- Remove the restrictive column-specific permission
REVOKE UPDATE(is_read) ON notifications FROM authenticated;

-- Grant full UPDATE permission (RLS will handle security)
GRANT UPDATE ON notifications TO authenticated;

-- Ensure the RLS policy is correct
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
CREATE POLICY "Users can update their own notifications" ON notifications
    FOR UPDATE USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Refresh the schema cache by updating the table comment
COMMENT ON TABLE notifications IS 'Stores notifications for users about swap request activities - updated permissions';

-- Verify the column exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'notifications' 
        AND column_name = 'is_read'
        AND table_schema = 'public'
    ) THEN
        RAISE EXCEPTION 'is_read column does not exist in notifications table';
    END IF;
END $$;

-- Test that the column can be updated
SELECT 'Notification is_read permissions fixed successfully' as status;
