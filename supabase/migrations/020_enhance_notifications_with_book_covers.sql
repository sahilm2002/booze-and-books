-- Fix notification messages to include actual usernames instead of generic terms
-- This migration updates the notification trigger function to fetch usernames from profiles

CREATE OR REPLACE FUNCTION create_swap_request_notification()
RETURNS TRIGGER AS $$
DECLARE
    book_record RECORD;
    acting_user_id uuid;
    requester_username TEXT;
    owner_username TEXT;
    acting_username TEXT;
BEGIN
    -- Pin search_path to trusted schemas
    PERFORM set_config('search_path', 'pg_catalog,public', true);
    
    -- Get acting user ID, with fallback to auth.uid() and then requester_id
    acting_user_id := COALESCE(NEW.cancelled_by, auth.uid(), NEW.requester_id);
    
    -- Get book information including google_volume_id
    SELECT 
        title, 
        google_volume_id, 
        authors,
        condition 
    INTO book_record 
    FROM public.books 
    WHERE id = NEW.book_id;
    
    -- Get usernames for requester and owner
    SELECT COALESCE(full_name, username, 'User') INTO requester_username
    FROM public.profiles 
    WHERE id = NEW.requester_id;
    
    SELECT COALESCE(full_name, username, 'User') INTO owner_username
    FROM public.profiles 
    WHERE id = NEW.owner_id;
    
    -- Get acting user's username
    SELECT COALESCE(full_name, username, 'User') INTO acting_username
    FROM public.profiles 
    WHERE id = acting_user_id;
    
    -- Create notification for new swap request
    IF TG_OP = 'INSERT' THEN
        INSERT INTO public.notifications (user_id, type, title, message, data)
        VALUES (
            NEW.owner_id,
            'SWAP_REQUEST',
            'New Swap Request',
            requester_username || ' wants to swap for your book "' || book_record.title || '"',
            jsonb_build_object(
                'swap_request_id', NEW.id,
                'book_id', NEW.book_id,
                'requester_id', NEW.requester_id,
                'book_title', book_record.title,
                'book_cover', book_record.google_volume_id,
                'book_authors', book_record.authors,
                'book_condition', book_record.condition,
                'requester_username', requester_username
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
                owner_username || ' accepted your swap request for "' || book_record.title || '"!',
                jsonb_build_object(
                    'swap_request_id', NEW.id,
                    'book_id', NEW.book_id,
                    'owner_id', NEW.owner_id,
                    'book_title', book_record.title,
                    'book_cover', book_record.google_volume_id,
                    'book_authors', book_record.authors,
                    'book_condition', book_record.condition,
                    'owner_username', owner_username
                )
            );
            
        -- Notify the other party when request is cancelled
        ELSIF NEW.status = 'CANCELLED' THEN
            DECLARE
                notify_user_id UUID;
                cancel_message TEXT;
                canceller_id UUID;
                canceller_username TEXT;
            BEGIN
                -- Use cancelled_by if available, fallback to acting_user_id
                canceller_id := COALESCE(NEW.cancelled_by, acting_user_id);
                
                -- Get canceller's username
                SELECT COALESCE(full_name, username, 'User') INTO canceller_username
                FROM public.profiles 
                WHERE id = canceller_id;
                
                -- Determine who to notify based on who cancelled
                IF canceller_id = NEW.requester_id THEN
                    -- Requester cancelled, notify owner
                    notify_user_id := NEW.owner_id;
                    cancel_message := requester_username || ' cancelled their swap request for "' || book_record.title || '"';
                ELSE
                    -- Owner cancelled (or unknown), notify requester
                    notify_user_id := NEW.requester_id;
                    cancel_message := owner_username || ' cancelled your swap request for "' || book_record.title || '"';
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
                        'book_condition', book_record.condition,
                        'canceller_username', canceller_username
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
                'Your swap with ' || owner_username || ' for "' || book_record.title || '" has been completed!',
                jsonb_build_object(
                    'swap_request_id', NEW.id,
                    'book_id', NEW.book_id,
                    'completed_by', acting_user_id,
                    'book_title', book_record.title,
                    'book_cover', book_record.google_volume_id,
                    'book_authors', book_record.authors,
                    'book_condition', book_record.condition,
                    'owner_username', owner_username,
                    'completed_by_username', acting_username
                )
            );
            
            -- Notify owner
            INSERT INTO public.notifications (user_id, type, title, message, data)
            VALUES (
                NEW.owner_id,
                'SWAP_COMPLETED',
                'Swap Completed',
                'Your swap with ' || requester_username || ' for "' || book_record.title || '" has been completed!',
                jsonb_build_object(
                    'swap_request_id', NEW.id,
                    'book_id', NEW.book_id,
                    'completed_by', acting_user_id,
                    'book_title', book_record.title,
                    'book_cover', book_record.google_volume_id,
                    'book_authors', book_record.authors,
                    'book_condition', book_record.condition,
                    'requester_username', requester_username,
                    'completed_by_username', acting_username
                )
            );
            
        -- Handle counter offers
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
                    owner_username || ' made a counter-offer for "' || book_record.title || '". They are offering "' || counter_book_record.title || '" instead.',
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
                        'counter_book_condition', counter_book_record.condition,
                        'owner_username', owner_username
                    )
                );
            END;
        END IF;
        RETURN NEW;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION create_swap_request_notification() IS 'Enhanced notification function that includes actual usernames instead of generic terms like "someone" or "the requester"';
