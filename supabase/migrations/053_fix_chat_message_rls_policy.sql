-- Fix RLS policy conflict for chat message insertion
-- The "Deny client inserts" policy was preventing chat messages from being inserted
-- This migration ensures chat messages can be inserted while maintaining security

-- Drop the overly restrictive policy that blocks all client inserts
DROP POLICY IF EXISTS "Deny client inserts" ON notifications;

-- Create a more specific policy that allows chat messages but blocks direct notification inserts
CREATE POLICY "Allow chat messages, deny direct notifications" ON notifications
FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL AND (
    -- Allow chat messages when user is the sender
    (message_type = 'chat_message' AND sender_id = auth.uid() AND recipient_id IS NOT NULL) OR
    -- Block direct notification inserts (these should only come from triggers)
    (message_type = 'notification' AND false)
  )
);

-- Ensure the chat message policy is still in place
DROP POLICY IF EXISTS "Users can send chat messages" ON notifications;
CREATE POLICY "Users can send chat messages" ON notifications
FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL AND
  message_type = 'chat_message' AND
  sender_id = auth.uid() AND
  recipient_id IS NOT NULL
);

-- Add comment for clarity
COMMENT ON POLICY "Allow chat messages, deny direct notifications" ON notifications IS 'Allows authenticated users to send chat messages while preventing direct notification creation';
