-- Force schema refresh and ensure message_type column is properly configured
-- This migration addresses the schema cache issue

-- Drop and recreate the message_type enum to ensure it's properly registered
DROP TYPE IF EXISTS message_type CASCADE;
CREATE TYPE message_type AS ENUM ('notification', 'chat_message');

-- Ensure the column exists with proper type
ALTER TABLE notifications DROP COLUMN IF EXISTS message_type;
ALTER TABLE notifications ADD COLUMN message_type message_type DEFAULT 'notification' NOT NULL;

-- Update existing records
UPDATE notifications 
SET message_type = 'chat_message' 
WHERE sender_id IS NOT NULL 
  AND recipient_id IS NOT NULL 
  AND conversation_id IS NOT NULL;

-- Recreate indexes
DROP INDEX IF EXISTS idx_notifications_message_type;
DROP INDEX IF EXISTS idx_notifications_message_type_user;
DROP INDEX IF EXISTS idx_notifications_message_type_recipient;

CREATE INDEX idx_notifications_message_type ON notifications(message_type);
CREATE INDEX idx_notifications_message_type_user ON notifications(message_type, user_id);
CREATE INDEX idx_notifications_message_type_recipient ON notifications(message_type, recipient_id);

-- Force a schema refresh by updating table comment
COMMENT ON TABLE notifications IS 'User notifications and chat messages - schema refreshed';

-- Recreate RLS policies to ensure they work with the new column
DROP POLICY IF EXISTS "Users can view their notifications and chat messages" ON notifications;
DROP POLICY IF EXISTS "Users can send chat messages" ON notifications;
DROP POLICY IF EXISTS "Users can update their chat messages" ON notifications;
DROP POLICY IF EXISTS "Allow chat messages, deny direct notifications" ON notifications;

-- Policy for viewing notifications and chat messages
CREATE POLICY "Users can view their notifications and chat messages" ON notifications
FOR SELECT USING (
  auth.uid() IS NOT NULL AND (
    -- Traditional notifications - user owns them
    (message_type = 'notification' AND user_id = auth.uid()) OR
    -- Chat messages - user is either sender or recipient
    (message_type = 'chat_message' AND (sender_id = auth.uid() OR recipient_id = auth.uid()))
  )
);

-- Policy for sending chat messages
CREATE POLICY "Users can send chat messages" ON notifications
FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL AND
  message_type = 'chat_message' AND
  sender_id = auth.uid() AND
  recipient_id IS NOT NULL
);

-- Policy for updating (marking as read)
CREATE POLICY "Users can update their chat messages" ON notifications
FOR UPDATE USING (
  auth.uid() IS NOT NULL AND (
    -- Traditional notifications - user owns them
    (message_type = 'notification' AND user_id = auth.uid()) OR
    -- Chat messages - user is the recipient (can mark as read)
    (message_type = 'chat_message' AND recipient_id = auth.uid())
  )
);

-- Ensure proper grants
GRANT SELECT, INSERT, UPDATE ON notifications TO authenticated;
GRANT USAGE ON TYPE message_type TO authenticated;

-- Add final comment
COMMENT ON COLUMN notifications.message_type IS 'Distinguishes between system notifications and chat messages - refreshed schema';
