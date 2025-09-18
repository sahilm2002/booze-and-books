-- Extend notifications table for chat functionality
-- This migration adds chat message support to the existing notifications system

-- Create message_type enum to distinguish notifications from chat messages
CREATE TYPE message_type AS ENUM ('notification', 'chat_message');

-- Add new columns to notifications table for chat functionality
ALTER TABLE notifications 
ADD COLUMN message_type message_type DEFAULT 'notification',
ADD COLUMN conversation_id TEXT,
ADD COLUMN attachment_url TEXT,
ADD COLUMN attachment_type TEXT,
ADD COLUMN attachment_size BIGINT,
ADD COLUMN sender_id UUID REFERENCES auth.users(id),
ADD COLUMN recipient_id UUID REFERENCES auth.users(id);

-- Create function to generate deterministic conversation IDs
CREATE OR REPLACE FUNCTION generate_conversation_id(user1_id UUID, user2_id UUID)
RETURNS TEXT AS $$
BEGIN
  -- Sort UUIDs to ensure consistent conversation ID regardless of order
  IF user1_id < user2_id THEN
    RETURN user1_id::TEXT || '_' || user2_id::TEXT;
  ELSE
    RETURN user2_id::TEXT || '_' || user1_id::TEXT;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Create chat-attachments storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-attachments', 'chat-attachments', false);

-- RLS policies for chat-attachments bucket
-- Allow users to upload attachments to conversations they participate in
CREATE POLICY "Users can upload chat attachments" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'chat-attachments' AND
  auth.uid() IS NOT NULL AND
  -- Check if user is part of the conversation (extracted from path)
  (
    auth.uid()::TEXT = split_part(name, '/', 1) OR
    auth.uid()::TEXT = split_part(name, '/', 2)
  )
);

-- Allow users to view attachments in conversations they participate in
CREATE POLICY "Users can view chat attachments" ON storage.objects
FOR SELECT USING (
  bucket_id = 'chat-attachments' AND
  auth.uid() IS NOT NULL AND
  -- Check if user is part of the conversation (extracted from path)
  (
    auth.uid()::TEXT = split_part(name, '/', 1) OR
    auth.uid()::TEXT = split_part(name, '/', 2)
  )
);

-- Update notification_type enum to include chat-related types
ALTER TYPE notification_type ADD VALUE 'CHAT_MESSAGE';
ALTER TYPE notification_type ADD VALUE 'CHAT_MESSAGE_RECEIVED';

-- Add indexes for performance
CREATE INDEX idx_notifications_conversation_id ON notifications(conversation_id);
CREATE INDEX idx_notifications_message_type ON notifications(message_type);
CREATE INDEX idx_notifications_sender_recipient ON notifications(sender_id, recipient_id);
CREATE INDEX idx_notifications_created_at_desc ON notifications(created_at DESC);

-- Add constraints for chat messages
ALTER TABLE notifications 
ADD CONSTRAINT check_chat_message_fields 
CHECK (
  (message_type = 'notification' AND sender_id IS NULL AND recipient_id IS NULL) OR
  (message_type = 'chat_message' AND sender_id IS NOT NULL AND recipient_id IS NOT NULL AND conversation_id IS NOT NULL)
);

-- Update existing RLS policies to handle chat messages
-- Drop existing policy and recreate with chat support
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;

CREATE POLICY "Users can view their notifications and chat messages" ON notifications
FOR SELECT USING (
  auth.uid() IS NOT NULL AND (
    -- Original notification logic
    (message_type = 'notification' AND user_id = auth.uid()) OR
    -- Chat message logic - user can see messages in conversations they participate in
    (message_type = 'chat_message' AND (sender_id = auth.uid() OR recipient_id = auth.uid()))
  )
);

-- Policy for inserting chat messages
CREATE POLICY "Users can send chat messages" ON notifications
FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL AND
  message_type = 'chat_message' AND
  sender_id = auth.uid() AND
  recipient_id IS NOT NULL AND
  conversation_id IS NOT NULL
);

-- Policy for updating chat messages (marking as read)
CREATE POLICY "Users can update their chat messages" ON notifications
FOR UPDATE USING (
  auth.uid() IS NOT NULL AND (
    -- Original notification logic
    (message_type = 'notification' AND user_id = auth.uid()) OR
    -- Chat message logic - users can update messages they received
    (message_type = 'chat_message' AND recipient_id = auth.uid())
  )
);

-- Create trigger to auto-generate conversation_id for chat messages
CREATE OR REPLACE FUNCTION set_conversation_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.message_type = 'chat_message' AND NEW.conversation_id IS NULL THEN
    NEW.conversation_id := generate_conversation_id(NEW.sender_id, NEW.recipient_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_conversation_id
  BEFORE INSERT ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION set_conversation_id();

-- Create trigger to create notification when chat message is sent
CREATE OR REPLACE FUNCTION create_chat_notification()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.message_type = 'chat_message' THEN
    -- Create a notification for the recipient about the new chat message
    INSERT INTO notifications (
      user_id,
      type,
      message,
      data,
      message_type,
      created_at
    ) VALUES (
      NEW.recipient_id,
      'CHAT_MESSAGE_RECEIVED',
      'You have a new message from ' || (
        SELECT username FROM profiles WHERE id = NEW.sender_id
      ),
      jsonb_build_object(
        'sender_id', NEW.sender_id,
        'conversation_id', NEW.conversation_id,
        'has_attachment', NEW.attachment_url IS NOT NULL
      ),
      'notification',
      NOW()
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_create_chat_notification
  AFTER INSERT ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION create_chat_notification();

-- Add retention policy for chat messages (365 days)
CREATE OR REPLACE FUNCTION cleanup_old_chat_messages()
RETURNS void AS $$
BEGIN
  DELETE FROM notifications 
  WHERE message_type = 'chat_message' 
  AND created_at < NOW() - INTERVAL '365 days';
END;
$$ LANGUAGE plpgsql;

-- Create index for cleanup performance
CREATE INDEX idx_notifications_cleanup ON notifications(message_type, created_at) 
WHERE message_type = 'chat_message';
