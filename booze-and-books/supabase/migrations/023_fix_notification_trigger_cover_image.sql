-- Fix notification trigger to use google_volume_id instead of cover_image
-- The cover_image column was removed in migration 014, but the trigger still references it

CREATE OR REPLACE FUNCTION create_swap_request_notification()
RETURNS TRIGGER AS $$
DECLARE
    book_record RECORD;
    acting_user_id uuid;
BEGIN
    -- Pin search_path to trusted schemas
    PERFORM set_config('search_path', 'pg_catalog,public', true);
    
    -- Get acting user ID, with fallback to auth.uid()
    acting_user_id := COALESCE(NEW.cancelled_by, auth.uid());
    
    -- Get book information including google_volume_id (instead of cover_image)
    SELECT 
        title, 
        google_volume_id, 
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
                'book_cover', book_record.google_volume_id,
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
                    'book_cover', book_record.google_volume_id,
                    'book_authors', book_record.authors,
                    'book_condition', book_record.condition
                )
            );
            
        -- Notify the other party when request is cancelled
        ELSIF NEW.status = 'CANCELLED' THEN
            DECLARE
                notify_user_id UUID;
                cancel_message TEXT;
                canceller_id UUID;
            BEGIN
                -- Use cancelled_by if available, fallback to acting_user_id
                canceller_id := COALESCE(NEW.cancelled_by, acting_user_id);
                
                -- Determine who to notify based on who cancelled
                IF canceller_id = NEW.requester_id THEN
                    -- Requester cancelled, notify owner
                    notify_user_id := NEW.owner_id;
                    cancel_message := 'The requester cancelled their swap request for "' || book_record.title || '"';
                ELSE
                    -- Owner cancelled (or unknown), notify requester
                    notify_user_id := NEW.requester_id;
                    cancel_message := 'The owner cancelled your swap request for "' || book_record.title || '"';
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
                        'cancelled_by', canceller_id,
                        'book_title', book_record.title,
                        'book_cover', book_record.google_volume_id,
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
                    'completed_by', acting_user_id,
                    'book_title', book_record.title,
                    'book_cover', book_record.google_volume_id,
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
                    'completed_by', acting_user_id,
                    'book_title', book_record.title,
                    'book_cover', book_record.google_volume_id,
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
                    google_volume_id, 
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
                        'book_cover', book_record.google_volume_id,
                        'book_authors', book_record.authors,
                        'book_condition', book_record.condition,
                        'counter_book_title', counter_book_record.title,
                        'counter_book_cover', counter_book_record.google_volume_id,
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
COMMENT ON FUNCTION create_swap_request_notification() IS 'Fixed notification function that uses google_volume_id instead of cover_image';