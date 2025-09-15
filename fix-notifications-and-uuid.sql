-- Fix notification system and UUID issues
-- This addresses multiple critical problems preventing notifications from working

-- 1. First, ensure the notification trigger is properly attached
DROP TRIGGER IF EXISTS swap_request_notification_trigger ON swap_requests;
CREATE TRIGGER swap_request_notification_trigger
    AFTER INSERT OR UPDATE ON swap_requests
    FOR EACH ROW
    EXECUTE FUNCTION create_swap_request_notification();

-- 2. Fix RLS policies on notifications table
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

-- 3. Grant proper permissions for notifications (least-privilege)
-- Only authenticated users can read their own notifications
GRANT SELECT, UPDATE ON notifications TO authenticated;

-- Only system/service functions need INSERT permission
-- Remove anon grants entirely - anonymous users should not access notifications
-- If anonymous read access is needed, create a controlled read-only view instead

-- Revoke any existing problematic permissions for anon role
REVOKE ALL ON notifications FROM anon;

-- 4. Test notification system by creating a test notification
DO $$
DECLARE
    test_user_id UUID;
BEGIN
    -- Get the first user ID from profiles
    SELECT id INTO test_user_id FROM profiles LIMIT 1;
    
    IF test_user_id IS NOT NULL THEN
        INSERT INTO notifications (user_id, type, title, message, data)
        VALUES (
            test_user_id,
            'SYSTEM_TEST',
            'System Test',
            'Notification system is working correctly',
            '{"test": true}'::jsonb
        );
        
        RAISE NOTICE 'Test notification created for user: %', test_user_id;
    ELSE
        RAISE NOTICE 'No users found in profiles table';
    END IF;
END $$;

-- 5. Check if notifications table has proper structure
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'notifications' 
ORDER BY ordinal_position;

-- 6. Test notification count query
SELECT COUNT(*) as total_notifications FROM notifications;
SELECT COUNT(*) as unread_notifications FROM notifications WHERE read = false;

-- 7. Verify the trigger function exists and is correct
SELECT 
    routine_name,
    routine_type,
    routine_definition
FROM information_schema.routines 
WHERE routine_name = 'create_swap_request_notification';

-- 8. Check triggers on swap_requests table
SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'swap_requests';
