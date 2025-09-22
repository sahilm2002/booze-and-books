-- Direct SQL commands to fix the notifications table
-- Run this directly in Supabase SQL Editor

-- First, let's see what columns exist
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'notifications';

-- Add message_type enum if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'message_type') THEN
        CREATE TYPE message_type AS ENUM ('notification', 'chat_message');
    END IF;
END $$;

-- Add columns if they don't exist
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS message_type message_type DEFAULT 'notification';
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS conversation_id TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS sender_id UUID;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS recipient_id UUID;

-- Update existing records
UPDATE notifications SET message_type = 'notification' WHERE message_type IS NULL;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_notifications_message_type ON notifications(message_type);
CREATE INDEX IF NOT EXISTS idx_notifications_conversation_id ON notifications(conversation_id);

-- Grant permissions
GRANT USAGE ON TYPE message_type TO authenticated, anon;
GRANT SELECT, INSERT, UPDATE ON notifications TO authenticated;

-- Create RLS policies
DROP POLICY IF EXISTS "notifications_select_policy" ON notifications;
CREATE POLICY "notifications_select_policy" ON notifications
FOR SELECT USING (
  auth.uid() IS NOT NULL AND (
    (message_type = 'notification' AND user_id = auth.uid()) OR
    (message_type = 'chat_message' AND (sender_id = auth.uid() OR recipient_id = auth.uid()))
  )
);

DROP POLICY IF EXISTS "notifications_insert_policy" ON notifications;
CREATE POLICY "notifications_insert_policy" ON notifications
FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL AND
  message_type = 'chat_message' AND
  sender_id = auth.uid() AND
  recipient_id IS NOT NULL
);

DROP POLICY IF EXISTS "notifications_update_policy" ON notifications;
CREATE POLICY "notifications_update_policy" ON notifications
FOR UPDATE USING (
  auth.uid() IS NOT NULL AND (
    (message_type = 'notification' AND user_id = auth.uid()) OR
    (message_type = 'chat_message' AND recipient_id = auth.uid())
  )
);

-- Verify the changes
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'notifications' 
ORDER BY ordinal_position;
