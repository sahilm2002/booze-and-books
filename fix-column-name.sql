-- Fix the column name discrepancy
-- The table has 'read' but the code expects 'is_read'

-- Add the is_read column and copy data from read column
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT false;

-- Copy data from read to is_read
UPDATE notifications SET is_read = read WHERE is_read IS NULL;

-- Set default values
UPDATE notifications SET is_read = false WHERE is_read IS NULL;
UPDATE notifications SET message_type = 'notification' WHERE message_type IS NULL;

-- Make sure is_read is not null
ALTER TABLE notifications ALTER COLUMN is_read SET NOT NULL;
ALTER TABLE notifications ALTER COLUMN is_read SET DEFAULT false;

-- Update any existing records to have proper message_type
UPDATE notifications 
SET message_type = 'chat_message' 
WHERE sender_id IS NOT NULL 
  AND recipient_id IS NOT NULL 
  AND conversation_id IS NOT NULL
  AND message_type = 'notification';

-- Verify the changes
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'notifications' 
AND column_name IN ('read', 'is_read', 'message_type')
ORDER BY column_name;
