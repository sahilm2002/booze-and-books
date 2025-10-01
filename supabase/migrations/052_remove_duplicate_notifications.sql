-- Remove duplicate notification creation for chat messages
-- This migration eliminates the automatic notification creation when chat messages are sent
-- Chat messages will appear directly in the notification dropdown without creating separate notifications

-- Drop the trigger that creates duplicate notifications for chat messages
DROP TRIGGER IF EXISTS trigger_create_chat_notification ON notifications;

-- Drop the function that creates duplicate notifications
DROP FUNCTION IF EXISTS create_chat_notification();

-- Update existing swap request triggers to only create system notifications for non-chat events
-- Keep notifications for: swap accepted, declined, completed, cancelled, counter offers
-- Remove notifications for: initial swap requests (these will be chat-only)

-- Update the swap request notification function to exclude initial requests
CREATE OR REPLACE FUNCTION create_swap_request_notification()
RETURNS TRIGGER AS $$
DECLARE
BEGIN
    -- Pin search_path to trusted schemas
    PERFORM set_config('search_path', 'pg_catalog,public', true);
    
    -- Only create notifications for status updates, not initial requests
    IF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
        -- Notify requester when request is accepted/declined
        IF NEW.status = 'ACCEPTED' THEN
            INSERT INTO public.notifications (user_id, type, title, message, data, message_type)
            SELECT 
                NEW.requester_id,
                'SWAP_ACCEPTED',
                'Swap Request Accepted',
                'Your swap request for "' || public.books.title || '" has been accepted!',
                jsonb_build_object(
                    'swap_request_id', NEW.id,
                    'book_id', NEW.book_id,
                    'owner_id', NEW.owner_id
                ),
                'notification'
            FROM public.books WHERE public.books.id = NEW.book_id;
        ELSIF NEW.status = 'DECLINED' THEN
            INSERT INTO public.notifications (user_id, type, title, message, data, message_type)
            SELECT 
                NEW.requester_id,
                'SWAP_DECLINED',
                'Swap Request Declined',
                'Your swap request for "' || public.books.title || '" has been declined.',
                jsonb_build_object(
                    'swap_request_id', NEW.id,
                    'book_id', NEW.book_id,
                    'owner_id', NEW.owner_id
                ),
                'notification'
            FROM public.books WHERE public.books.id = NEW.book_id;
        ELSIF NEW.status = 'COMPLETED' THEN
            -- Notify both parties when swap is completed
            INSERT INTO public.notifications (user_id, type, title, message, data, message_type)
            SELECT 
                NEW.requester_id,
                'SWAP_COMPLETED',
                'Swap Completed',
                'Your swap for "' || public.books.title || '" has been completed!',
                jsonb_build_object(
                    'swap_request_id', NEW.id,
                    'book_id', NEW.book_id,
                    'owner_id', NEW.owner_id
                ),
                'notification'
            FROM public.books WHERE public.books.id = NEW.book_id;
            
            INSERT INTO public.notifications (user_id, type, title, message, data, message_type)
            SELECT 
                NEW.owner_id,
                'SWAP_COMPLETED',
                'Swap Completed',
                'Your swap for "' || public.books.title || '" has been completed!',
                jsonb_build_object(
                    'swap_request_id', NEW.id,
                    'book_id', NEW.book_id,
                    'requester_id', NEW.requester_id
                ),
                'notification'
            FROM public.books WHERE public.books.id = NEW.book_id;
        ELSIF NEW.status = 'CANCELLED' THEN
            -- Notify the other party when swap is cancelled
            IF NEW.cancelled_by = NEW.requester_id THEN
                INSERT INTO public.notifications (user_id, type, title, message, data, message_type)
                SELECT 
                    NEW.owner_id,
                    'SWAP_CANCELLED',
                    'Swap Request Cancelled',
                    'The swap request for "' || public.books.title || '" has been cancelled.',
                    jsonb_build_object(
                        'swap_request_id', NEW.id,
                        'book_id', NEW.book_id,
                        'cancelled_by', NEW.cancelled_by
                    ),
                    'notification'
                FROM public.books WHERE public.books.id = NEW.book_id;
            ELSE
                INSERT INTO public.notifications (user_id, type, title, message, data, message_type)
                SELECT 
                    NEW.requester_id,
                    'SWAP_CANCELLED',
                    'Swap Request Cancelled',
                    'The swap request for "' || public.books.title || '" has been cancelled.',
                    jsonb_build_object(
                        'swap_request_id', NEW.id,
                        'book_id', NEW.book_id,
                        'cancelled_by', NEW.cancelled_by
                    ),
                    'notification'
                FROM public.books WHERE public.books.id = NEW.book_id;
            END IF;
        END IF;
        RETURN NEW;
    END IF;
    
    -- No notification for initial INSERT operations (these will be chat-only)
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger with the updated function
DROP TRIGGER IF EXISTS trigger_create_swap_notifications ON swap_requests;
CREATE TRIGGER trigger_create_swap_notifications
    AFTER INSERT OR UPDATE ON swap_requests
    FOR EACH ROW
    EXECUTE FUNCTION create_swap_request_notification();

-- Add comments for clarity
COMMENT ON FUNCTION create_swap_request_notification() IS 'Creates system notifications for swap status changes only. Initial swap requests use chat messages instead of notifications.';
