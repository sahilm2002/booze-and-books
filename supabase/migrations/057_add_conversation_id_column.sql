-- Add the missing conversation_id column to notifications table
-- This column is essential for chat functionality

-- Add the conversation_id column
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS conversation_id TEXT;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_notifications_conversation_id ON notifications(conversation_id);

-- Update existing chat messages to have proper conversation_id
-- Generate conversation_id for existing chat messages based on sender and recipient
UPDATE notifications 
SET conversation_id = CASE 
    WHEN sender_id < recipient_id THEN sender_id || '_' || recipient_id
    ELSE recipient_id || '_' || sender_id
END
WHERE message_type = 'chat_message' 
  AND conversation_id IS NULL
  AND sender_id IS NOT NULL 
  AND recipient_id IS NOT NULL;

-- Add comment for clarity
COMMENT ON COLUMN notifications.conversation_id IS 'Unique identifier for chat conversations between two users';

-- Ensure proper grants
GRANT SELECT, INSERT, UPDATE ON notifications TO authenticated;

-- Force schema refresh
COMMENT ON TABLE notifications IS 'User notifications and chat messages with conversation_id - schema refreshed v3';
