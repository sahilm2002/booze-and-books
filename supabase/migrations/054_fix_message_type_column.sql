-- Fix message_type column issues
-- Ensure all existing notifications have proper message_type values
-- and handle any missing column issues

-- First, ensure the message_type column exists and has proper defaults
DO $$ 
BEGIN
    -- Check if message_type column exists, if not add it
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'notifications' 
        AND column_name = 'message_type'
    ) THEN
        ALTER TABLE notifications ADD COLUMN message_type message_type DEFAULT 'notification';
    END IF;
END $$;

-- Update any existing records that have NULL message_type
UPDATE notifications 
SET message_type = 'notification' 
WHERE message_type IS NULL;

-- Update any records that should be chat messages based on having sender_id and recipient_id
UPDATE notifications 
SET message_type = 'chat_message' 
WHERE sender_id IS NOT NULL 
  AND recipient_id IS NOT NULL 
  AND conversation_id IS NOT NULL
  AND message_type = 'notification';

-- Ensure the column has a NOT NULL constraint
ALTER TABLE notifications ALTER COLUMN message_type SET NOT NULL;

-- Add an index for better performance on message_type queries
CREATE INDEX IF NOT EXISTS idx_notifications_message_type_user ON notifications(message_type, user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_message_type_recipient ON notifications(message_type, recipient_id);

-- Update RLS policies to handle both user_id and recipient_id properly
DROP POLICY IF EXISTS "Users can view their notifications and chat messages" ON notifications;

CREATE POLICY "Users can view their notifications and chat messages" ON notifications
FOR SELECT USING (
  auth.uid() IS NOT NULL AND (
    -- Traditional notifications - user owns them
    (message_type = 'notification' AND user_id = auth.uid()) OR
    -- Chat messages - user is either sender or recipient
    (message_type = 'chat_message' AND (sender_id = auth.uid() OR recipient_id = auth.uid()))
  )
);

-- Ensure proper UPDATE policy for chat messages
DROP POLICY IF EXISTS "Users can update their chat messages" ON notifications;
CREATE POLICY "Users can update their chat messages" ON notifications
FOR UPDATE USING (
  auth.uid() IS NOT NULL AND (
    -- Traditional notifications - user owns them
    (message_type = 'notification' AND user_id = auth.uid()) OR
    -- Chat messages - user is the recipient (can mark as read)
    (message_type = 'chat_message' AND recipient_id = auth.uid())
  )
);

-- Add comment for clarity
COMMENT ON COLUMN notifications.message_type IS 'Distinguishes between system notifications and chat messages';
