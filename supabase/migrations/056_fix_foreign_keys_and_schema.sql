-- Fix foreign key relationships and ensure schema cache recognizes all changes
-- This migration addresses both the missing relationships and schema cache issues

-- First, ensure we have the proper foreign key constraints
-- Drop existing constraints if they exist to avoid conflicts
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_sender_id_fkey;
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_recipient_id_fkey;

-- Add proper foreign key constraints with explicit names
ALTER TABLE notifications 
ADD CONSTRAINT notifications_sender_id_fkey 
FOREIGN KEY (sender_id) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE notifications 
ADD CONSTRAINT notifications_recipient_id_fkey 
FOREIGN KEY (recipient_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- Ensure we have profile foreign keys as well (for the joins in queries)
-- First check if we need to add user_id foreign key
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'notifications_user_id_fkey' 
        AND table_name = 'notifications'
    ) THEN
        ALTER TABLE notifications 
        ADD CONSTRAINT notifications_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Create explicit profile relationships by ensuring profiles table has proper foreign keys
-- This helps Supabase understand the relationship for joins
DO $$
BEGIN
    -- Ensure profiles table has proper foreign key to auth.users
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'profiles_id_fkey' 
        AND table_name = 'profiles'
    ) THEN
        ALTER TABLE profiles 
        ADD CONSTRAINT profiles_id_fkey 
        FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Force recreate the message_type enum and column with proper registration
DROP TYPE IF EXISTS message_type CASCADE;
CREATE TYPE message_type AS ENUM ('notification', 'chat_message');

-- Ensure the column is properly typed
ALTER TABLE notifications DROP COLUMN IF EXISTS message_type;
ALTER TABLE notifications ADD COLUMN message_type message_type DEFAULT 'notification' NOT NULL;

-- Update existing records
UPDATE notifications 
SET message_type = 'chat_message' 
WHERE sender_id IS NOT NULL 
  AND recipient_id IS NOT NULL 
  AND conversation_id IS NOT NULL;

-- Grant all necessary permissions
GRANT USAGE ON TYPE message_type TO authenticated, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON notifications TO authenticated;
GRANT SELECT ON profiles TO authenticated, anon;

-- Recreate indexes with proper names
DROP INDEX IF EXISTS idx_notifications_message_type;
DROP INDEX IF EXISTS idx_notifications_message_type_user;
DROP INDEX IF EXISTS idx_notifications_message_type_recipient;
DROP INDEX IF EXISTS idx_notifications_sender_recipient;
DROP INDEX IF EXISTS idx_notifications_conversation_id;

CREATE INDEX idx_notifications_message_type ON notifications(message_type);
CREATE INDEX idx_notifications_message_type_user ON notifications(message_type, user_id) WHERE message_type = 'notification';
CREATE INDEX idx_notifications_message_type_recipient ON notifications(message_type, recipient_id) WHERE message_type = 'chat_message';
CREATE INDEX idx_notifications_sender_recipient ON notifications(sender_id, recipient_id) WHERE message_type = 'chat_message';
CREATE INDEX idx_notifications_conversation_id ON notifications(conversation_id) WHERE conversation_id IS NOT NULL;

-- Recreate all RLS policies with proper names
DROP POLICY IF EXISTS "Users can view their notifications and chat messages" ON notifications;
DROP POLICY IF EXISTS "Users can send chat messages" ON notifications;
DROP POLICY IF EXISTS "Users can update their chat messages" ON notifications;
DROP POLICY IF EXISTS "Allow chat messages, deny direct notifications" ON notifications;

-- Policy for viewing notifications and chat messages
CREATE POLICY "notifications_select_policy" ON notifications
FOR SELECT USING (
  auth.uid() IS NOT NULL AND (
    -- Traditional notifications - user owns them
    (message_type = 'notification' AND user_id = auth.uid()) OR
    -- Chat messages - user is either sender or recipient
    (message_type = 'chat_message' AND (sender_id = auth.uid() OR recipient_id = auth.uid()))
  )
);

-- Policy for sending chat messages
CREATE POLICY "notifications_insert_policy" ON notifications
FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL AND
  message_type = 'chat_message' AND
  sender_id = auth.uid() AND
  recipient_id IS NOT NULL AND
  recipient_id != auth.uid()
);

-- Policy for updating (marking as read)
CREATE POLICY "notifications_update_policy" ON notifications
FOR UPDATE USING (
  auth.uid() IS NOT NULL AND (
    -- Traditional notifications - user owns them
    (message_type = 'notification' AND user_id = auth.uid()) OR
    -- Chat messages - user is the recipient (can mark as read)
    (message_type = 'chat_message' AND recipient_id = auth.uid())
  )
);

-- Ensure profiles table has proper RLS policies for the joins
DROP POLICY IF EXISTS "profiles_select_policy" ON profiles;
CREATE POLICY "profiles_select_policy" ON profiles
FOR SELECT USING (true); -- Allow reading all profiles for joins

-- Force schema refresh by updating table and column comments
COMMENT ON TABLE notifications IS 'User notifications and chat messages with proper foreign keys - schema refreshed v2';
COMMENT ON COLUMN notifications.message_type IS 'Message type enum - properly registered in schema cache v2';
COMMENT ON COLUMN notifications.sender_id IS 'Foreign key to auth.users for chat message sender';
COMMENT ON COLUMN notifications.recipient_id IS 'Foreign key to auth.users for chat message recipient';
COMMENT ON COLUMN notifications.user_id IS 'Foreign key to auth.users for notification owner';

-- Add table comment to profiles to ensure it's in schema cache
COMMENT ON TABLE profiles IS 'User profiles with proper foreign key relationships';

-- Analyze tables to update statistics and help with query planning
ANALYZE notifications;
ANALYZE profiles;
