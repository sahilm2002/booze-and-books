-- Enhance notifications with book covers and additional notification types
-- Update notification types and include book images in notification data

-- Add missing notification types to enum
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'SWAP_COUNTER_OFFER';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'SWAP_CANCELLED';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'SWAP_COMPLETED';

-- Update the notification function to include book cover and additional data
CREATE OR REPLACE FUNCTION create_swap_request_notification()
RETURNS TRIGGER AS $$
DECLARE
    book_record RECORD;
BEGIN
    -- Pin search_path to trusted schemas
    PERFORM set_config('search_path', 'pg_catalog,public', true);
    
    -- Get book information including cover
    SELECT 
        title, 
        cover_image, 
        authors,
        condition 
    INTO book_record 
    FROM public.books 
    WHERE id = NEW.book_id;
    
    -- Create notification for new swap request
    IF TG_OP = 'INSERT' THEN
        INSERT INTO public.notifications (user_id, type, title, message, data)
        VALUES (
            NEW.owner_id,
            'SWAP_REQUEST',
            'New Swap Request',
            'Someone wants to swap for your book "' || book_record.title || '"',
            jsonb_build_object(
                'swap_request_id', NEW.id,
                'book_id', NEW.book_id,
                'requester_id', NEW.requester_id,
                'book_title', book_record.title,
                'book_cover', book_record.cover_image,
                'book_authors', book_record.authors,
                'book_condition', book_record.condition
            )
        );
        RETURN NEW;
    END IF;
    
    -- Create notifications for status updates
    IF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
        -- Notify requester when request is accepted
        IF NEW.status = 'ACCEPTED' THEN
            INSERT INTO public.notifications (user_id, type, title, message, data)
            VALUES (
                NEW.requester_id,
                'SWAP_ACCEPTED',
                'Swap Request Accepted',
                'Your swap request for "' || book_record.title || '" has been accepted!',
                jsonb_build_object(
                    'swap_request_id', NEW.id,
                    'book_id', NEW.book_id,
                    'owner_id', NEW.owner_id,
                    'book_title', book_record.title,
                    'book_cover', book_record.cover_image,
                    'book_authors', book_record.authors,
                    'book_condition', book_record.condition
                )
            );
            
        -- Notify requester when request is cancelled
        ELSIF NEW.status = 'CANCELLED' THEN
            -- Determine who to notify based on who didn't cancel
            DECLARE
                notify_user_id UUID;
                cancel_message TEXT;
            BEGIN
                -- If owner cancelled, notify requester
                -- If requester cancelled, notify owner
                -- This is a simplified approach - in practice you might want to track who cancelled
                IF NEW.requester_id != auth.uid() THEN
                    notify_user_id := NEW.requester_id;
                    cancel_message := 'The owner cancelled your swap request for "' || book_record.title || '"';
                ELSE
                    notify_user_id := NEW.owner_id;
                    cancel_message := 'The requester cancelled their swap request for "' || book_record.title || '"';
                END IF;
                
                INSERT INTO public.notifications (user_id, type, title, message, data)
                VALUES (
                    notify_user_id,
                    'SWAP_CANCELLED',
                    'Swap Request Cancelled',
                    cancel_message,
                    jsonb_build_object(
                        'swap_request_id', NEW.id,
                        'book_id', NEW.book_id,
                        'cancelled_by', auth.uid(),
                        'book_title', book_record.title,
                        'book_cover', book_record.cover_image,
                        'book_authors', book_record.authors,
                        'book_condition', book_record.condition
                    )
                );
            END;
            
        -- Notify both parties when swap is completed
        ELSIF NEW.status = 'COMPLETED' THEN
            -- Notify requester
            INSERT INTO public.notifications (user_id, type, title, message, data)
            VALUES (
                NEW.requester_id,
                'SWAP_COMPLETED',
                'Swap Completed',
                'Your swap for "' || book_record.title || '" has been completed!',
                jsonb_build_object(
                    'swap_request_id', NEW.id,
                    'book_id', NEW.book_id,
                    'completed_by', auth.uid(),
                    'book_title', book_record.title,
                    'book_cover', book_record.cover_image,
                    'book_authors', book_record.authors,
                    'book_condition', book_record.condition
                )
            );
            
            -- Notify owner
            INSERT INTO public.notifications (user_id, type, title, message, data)
            VALUES (
                NEW.owner_id,
                'SWAP_COMPLETED',
                'Swap Completed',
                'The swap for your book "' || book_record.title || '" has been completed!',
                jsonb_build_object(
                    'swap_request_id', NEW.id,
                    'book_id', NEW.book_id,
                    'completed_by', auth.uid(),
                    'book_title', book_record.title,
                    'book_cover', book_record.cover_image,
                    'book_authors', book_record.authors,
                    'book_condition', book_record.condition
                )
            );
            
        -- Handle counter offers (if you add this feature later)
        ELSIF NEW.status = 'COUNTER_OFFER' AND NEW.counter_offered_book_id IS NOT NULL THEN
            DECLARE
                counter_book_record RECORD;
            BEGIN
                -- Get counter offered book information
                SELECT 
                    title, 
                    cover_image, 
                    authors,
                    condition 
                INTO counter_book_record 
                FROM public.books 
                WHERE id = NEW.counter_offered_book_id;
                
                INSERT INTO public.notifications (user_id, type, title, message, data)
                VALUES (
                    NEW.requester_id,
                    'SWAP_COUNTER_OFFER',
                    'Counter Offer Received',
                    'The owner made a counter-offer for "' || book_record.title || '". They are offering "' || counter_book_record.title || '" instead.',
                    jsonb_build_object(
                        'swap_request_id', NEW.id,
                        'book_id', NEW.book_id,
                        'counter_offered_book_id', NEW.counter_offered_book_id,
                        'owner_id', NEW.owner_id,
                        'book_title', book_record.title,
                        'book_cover', book_record.cover_image,
                        'book_authors', book_record.authors,
                        'book_condition', book_record.condition,
                        'counter_book_title', counter_book_record.title,
                        'counter_book_cover', counter_book_record.cover_image,
                        'counter_book_authors', counter_book_record.authors,
                        'counter_book_condition', counter_book_record.condition
                    )
                );
            END;
        END IF;
        RETURN NEW;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments
COMMENT ON FUNCTION create_swap_request_notification() IS 'Enhanced notification function that includes book covers and handles all swap status changes';