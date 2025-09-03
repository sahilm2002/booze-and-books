-- Create notifications table and system for swap requests

-- Create enum for notification types
CREATE TYPE notification_type AS ENUM ('SWAP_REQUEST', 'SWAP_ACCEPTED', 'SWAP_DECLINED');

-- Create notifications table
CREATE TABLE notifications (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type notification_type NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    data JSONB DEFAULT '{}' NOT NULL,
    is_read BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create indexes for performance
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read);
CREATE INDEX idx_notifications_user_created ON notifications(user_id, created_at);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Users can only select their own notifications
CREATE POLICY "Users can view their own notifications" ON notifications
    FOR SELECT USING (auth.uid() = user_id);

-- Users can only update their own notifications (to mark as read)
CREATE POLICY "Users can update their own notifications" ON notifications
    FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own notifications
CREATE POLICY "Users can delete their own notifications" ON notifications
    FOR DELETE USING (auth.uid() = user_id);

-- Only system can insert notifications (no direct user inserts)
CREATE POLICY "Only system can insert notifications" ON notifications
    FOR INSERT WITH CHECK (false);

-- Function to create swap request notifications
CREATE OR REPLACE FUNCTION create_swap_request_notification()
RETURNS TRIGGER AS $$
BEGIN
    -- Create notification for new swap request
    IF TG_OP = 'INSERT' THEN
        INSERT INTO notifications (user_id, type, title, message, data)
        SELECT 
            NEW.owner_id,
            'SWAP_REQUEST',
            'New Swap Request',
            'Someone wants to swap for your book "' || books.title || '"',
            jsonb_build_object(
                'swap_request_id', NEW.id,
                'book_id', NEW.book_id,
                'requester_id', NEW.requester_id
            )
        FROM books WHERE books.id = NEW.book_id;
        
        RETURN NEW;
    END IF;

    -- Create notifications for status updates
    IF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
        -- Notify requester when request is accepted/declined
        IF NEW.status = 'ACCEPTED' THEN
            INSERT INTO notifications (user_id, type, title, message, data)
            SELECT 
                NEW.requester_id,
                'SWAP_ACCEPTED',
                'Swap Request Accepted',
                'Your swap request for "' || books.title || '" has been accepted!',
                jsonb_build_object(
                    'swap_request_id', NEW.id,
                    'book_id', NEW.book_id,
                    'owner_id', NEW.owner_id
                )
            FROM books WHERE books.id = NEW.book_id;
        
        ELSIF NEW.status = 'DECLINED' THEN
            INSERT INTO notifications (user_id, type, title, message, data)
            SELECT 
                NEW.requester_id,
                'SWAP_DECLINED',
                'Swap Request Declined',
                'Your swap request for "' || books.title || '" has been declined.',
                jsonb_build_object(
                    'swap_request_id', NEW.id,
                    'book_id', NEW.book_id,
                    'owner_id', NEW.owner_id
                )
            FROM books WHERE books.id = NEW.book_id;
        END IF;
        
        RETURN NEW;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for automatic notification creation
CREATE TRIGGER trigger_create_swap_notifications
    AFTER INSERT OR UPDATE ON swap_requests
    FOR EACH ROW
    EXECUTE FUNCTION create_swap_request_notification();

-- Deny client inserts - only triggers with SECURITY DEFINER can insert
DROP POLICY "Only system can insert notifications" ON notifications;
CREATE POLICY "Deny client inserts" ON notifications
    FOR INSERT WITH CHECK (false);

-- Add comments
COMMENT ON TABLE notifications IS 'Stores notifications for users about swap request activities';
COMMENT ON COLUMN notifications.data IS 'JSONB field containing additional context like book_id, swap_request_id, etc.';
COMMENT ON FUNCTION create_swap_request_notification() IS 'Automatically creates notifications when swap requests are created or updated';