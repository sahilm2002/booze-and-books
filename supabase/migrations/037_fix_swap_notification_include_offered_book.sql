-- Fix swap request notifications to include offered book information
-- This updates the notification message to show what book the requester is offering in exchange

CREATE OR REPLACE FUNCTION create_swap_request_notification()
RETURNS TRIGGER AS $$
DECLARE
    book_record RECORD;
    offered_book_record RECORD;
    acting_user_id uuid;
    requester_username TEXT;
    owner_username TEXT;
    acting_username TEXT;
    notification_message TEXT;
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
        -- Build notification message based on whether an offered book exists
        IF NEW.offered_book_id IS NOT NULL THEN
            -- Get offered book information
            SELECT 
                title, 
                google_volume_id, 
                authors,
                condition 
            INTO offered_book_record 
            FROM public.books 
            WHERE id = NEW.offered_book_id;
            
            notification_message := requester_username || ' wants to swap "' || offered_book_record.title || '" for your book "' || book_record.title || '"';
        ELSE
            -- Simple request without offered book
            notification_message := requester_username || ' wants to swap for your book "' || book_record.title || '"';
        END IF;
        
        INSERT INTO public.notifications (user_id, type, title, message, data)
        VALUES (
            NEW.owner_id,
            'SWAP_REQUEST',
            'New Swap Request',
            notification_message,
            jsonb_build_object(
                'swap_request_id', NEW.id,
                'book_id', NEW.book_id,
                'offered_book_id', NEW.offered_book_id,
                'requester_id', NEW.requester_id,
                'book_title', book_record.title,
                'book_cover', book_record.google_volume_id,
                'book_authors', book_record.authors,
                'book_condition', book_record.condition,
                'offered_book_title', COALESCE(offered_book_record.title, NULL),
                'offered_book_cover', COALESCE(offered_book_record.google_volume_id, NULL),
                'offered_book_authors', COALESCE(offered_book_record.authors, NULL),
                'offered_book_condition', COALESCE(offered_book_record.condition, NULL),
                'requester_username', requester_username
            )
        );
        RETURN NEW;
    END IF;
    
    -- Create notifications for status updates
    IF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
        -- Notify requester when request is accepted
        IF NEW.status = 'ACCEPTED' THEN
            DECLARE
                acceptance_message TEXT;
            BEGIN
                -- Get offered book information if it exists
                IF NEW.offered_book_id IS NOT NULL THEN
                    SELECT 
                        title, 
                        google_volume_id, 
                        authors,
                        condition 
                    INTO offered_book_record 
                    FROM public.books 
                    WHERE id = NEW.offered_book_id;
                    
                    acceptance_message := owner_username || ' accepted your swap of "' || offered_book_record.title || '" for "' || book_record.title || '"!';
                ELSE
                    acceptance_message := owner_username || ' accepted your swap request for "' || book_record.title || '"!';
                END IF;
                
                INSERT INTO public.notifications (user_id, type, title, message, data)
                VALUES (
                    NEW.requester_id,
                    'SWAP_ACCEPTED',
                    'Swap Request Accepted',
                    acceptance_message,
                    jsonb_build_object(
                        'swap_request_id', NEW.id,
                        'book_id', NEW.book_id,
                        'offered_book_id', NEW.offered_book_id,
                        'owner_id', NEW.owner_id,
                        'book_title', book_record.title,
                        'book_cover', book_record.google_volume_id,
                        'book_authors', book_record.authors,
                        'book_condition', book_record.condition,
                        'offered_book_title', COALESCE(offered_book_record.title, NULL),
                        'offered_book_cover', COALESCE(offered_book_record.google_volume_id, NULL),
                        'offered_book_authors', COALESCE(offered_book_record.authors, NULL),
                        'offered_book_condition', COALESCE(offered_book_record.condition, NULL),
                        'owner_username', owner_username
                    )
                );
            END;
            
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
                
                -- Get offered book information if it exists for better cancellation messages
                IF NEW.offered_book_id IS NOT NULL THEN
                    SELECT 
                        title, 
                        google_volume_id, 
                        authors,
                        condition 
                    INTO offered_book_record 
                    FROM public.books 
                    WHERE id = NEW.offered_book_id;
                END IF;
                
                -- Determine who to notify based on who cancelled
                IF canceller_id = NEW.requester_id THEN
                    -- Requester cancelled, notify owner
                    notify_user_id := NEW.owner_id;
                    IF NEW.offered_book_id IS NOT NULL THEN
                        cancel_message := requester_username || ' cancelled their swap of "' || offered_book_record.title || '" for your book "' || book_record.title || '"';
                    ELSE
                        cancel_message := requester_username || ' cancelled their swap request for "' || book_record.title || '"';
                    END IF;
                ELSE
                    -- Owner cancelled (or unknown), notify requester
                    notify_user_id := NEW.requester_id;
                    IF NEW.offered_book_id IS NOT NULL THEN
                        cancel_message := owner_username || ' cancelled your swap of "' || offered_book_record.title || '" for "' || book_record.title || '"';
                    ELSE
                        cancel_message := owner_username || ' cancelled your swap request for "' || book_record.title || '"';
                    END IF;
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
            DECLARE
                requester_completion_message TEXT;
                owner_completion_message TEXT;
            BEGIN
                -- Get offered book information if it exists for better completion messages
                IF NEW.offered_book_id IS NOT NULL THEN
                    SELECT 
                        title, 
                        google_volume_id, 
                        authors,
                        condition 
                    INTO offered_book_record 
                    FROM public.books 
                    WHERE id = NEW.offered_book_id;
                    
                    requester_completion_message := 'Your swap of "' || offered_book_record.title || '" for "' || book_record.title || '" with ' || owner_username || ' has been completed!';
                    owner_completion_message := 'Your swap of "' || book_record.title || '" for "' || offered_book_record.title || '" with ' || requester_username || ' has been completed!';
                ELSE
                    requester_completion_message := 'Your swap with ' || owner_username || ' for "' || book_record.title || '" has been completed!';
                    owner_completion_message := 'Your swap with ' || requester_username || ' for "' || book_record.title || '" has been completed!';
                END IF;
                
                -- Notify requester
                INSERT INTO public.notifications (user_id, type, title, message, data)
                VALUES (
                    NEW.requester_id,
                    'SWAP_COMPLETED',
                    'Swap Completed',
                    requester_completion_message,
                    jsonb_build_object(
                        'swap_request_id', NEW.id,
                        'book_id', NEW.book_id,
                        'offered_book_id', NEW.offered_book_id,
                        'completed_by', acting_user_id,
                        'book_title', book_record.title,
                        'book_cover', book_record.google_volume_id,
                        'book_authors', book_record.authors,
                        'book_condition', book_record.condition,
                        'offered_book_title', COALESCE(offered_book_record.title, NULL),
                        'offered_book_cover', COALESCE(offered_book_record.google_volume_id, NULL),
                        'offered_book_authors', COALESCE(offered_book_record.authors, NULL),
                        'offered_book_condition', COALESCE(offered_book_record.condition, NULL),
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
                    owner_completion_message,
                    jsonb_build_object(
                        'swap_request_id', NEW.id,
                        'book_id', NEW.book_id,
                        'offered_book_id', NEW.offered_book_id,
                        'completed_by', acting_user_id,
                        'book_title', book_record.title,
                        'book_cover', book_record.google_volume_id,
                        'book_authors', book_record.authors,
                        'book_condition', book_record.condition,
                        'offered_book_title', COALESCE(offered_book_record.title, NULL),
                        'offered_book_cover', COALESCE(offered_book_record.google_volume_id, NULL),
                        'offered_book_authors', COALESCE(offered_book_record.authors, NULL),
                        'offered_book_condition', COALESCE(offered_book_record.condition, NULL),
                        'requester_username', requester_username,
                        'completed_by_username', acting_username
                    )
                );
            END;
            
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

COMMENT ON FUNCTION create_swap_request_notification() IS 'Enhanced notification function that includes offered book information in swap request notifications';
