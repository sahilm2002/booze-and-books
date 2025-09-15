-- Add counter-offer notifications to the existing notification system
-- When a counter-offer is created, notify the original requester

-- Note: We'll use text for notification type since the enum might not exist
-- The application handles notification types as strings anyway

-- Update the notification trigger function to handle counter-offers
CREATE OR REPLACE FUNCTION create_swap_request_notification()
RETURNS TRIGGER AS $$
DECLARE
    counter_offered_book_title TEXT;
    original_book_title TEXT;
    requester_username TEXT;
    owner_username TEXT;
BEGIN
    -- Pin search_path to trusted schemas
    PERFORM set_config('search_path', 'pg_catalog,public', true);
    
    -- Create notification for new swap request
    IF TG_OP = 'INSERT' THEN
        -- Get requester username and book titles
        SELECT COALESCE(profiles.username, profiles.full_name, 'Someone') INTO requester_username
        FROM public.profiles WHERE profiles.id = NEW.requester_id;
        
        -- Get both book titles for the swap request
        SELECT title INTO original_book_title FROM public.books WHERE id = NEW.book_id;
        SELECT title INTO counter_offered_book_title FROM public.books WHERE id = NEW.offered_book_id;
        
        INSERT INTO public.notifications (user_id, type, title, message, data)
        VALUES (
            NEW.owner_id,
            'SWAP_REQUEST',
            'New Swap Request',
            requester_username || ' wants to swap their book "' || COALESCE(counter_offered_book_title, 'Unknown Book') || '" for your book "' || COALESCE(original_book_title, 'Unknown Book') || '"',
            jsonb_build_object(
                'swap_request_id', NEW.id,
                'book_id', NEW.book_id,
                'requester_id', NEW.requester_id,
                'offered_book_id', NEW.offered_book_id
            )
        );
        RETURN NEW;
    END IF;
    
    -- Create notifications for status updates
    IF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
        -- Get usernames for notifications
        SELECT COALESCE(profiles.username, profiles.full_name, 'The requester') INTO requester_username
        FROM public.profiles WHERE profiles.id = NEW.requester_id;
        
        SELECT COALESCE(profiles.username, profiles.full_name, 'The owner') INTO owner_username
        FROM public.profiles WHERE profiles.id = NEW.owner_id;
        
        -- Get book titles for accept/decline notifications
        SELECT title INTO original_book_title FROM public.books WHERE id = NEW.book_id;
        SELECT title INTO counter_offered_book_title FROM public.books WHERE id = NEW.offered_book_id;
        
        -- Notify requester when request is accepted/declined
        IF NEW.status = 'ACCEPTED' THEN
            INSERT INTO public.notifications (user_id, type, title, message, data)
            VALUES (
                NEW.requester_id,
                'SWAP_ACCEPTED',
                'Swap Request Accepted',
                owner_username || ' accepted your swap! You''ll exchange "' || COALESCE(counter_offered_book_title, 'Unknown Book') || '" for "' || COALESCE(original_book_title, 'Unknown Book') || '".',
                jsonb_build_object(
                    'swap_request_id', NEW.id,
                    'book_id', NEW.book_id,
                    'offered_book_id', NEW.offered_book_id,
                    'owner_id', NEW.owner_id
                )
            );
            
        ELSIF NEW.status = 'DECLINED' THEN
            INSERT INTO public.notifications (user_id, type, title, message, data)
            VALUES (
                NEW.requester_id,
                'SWAP_DECLINED',
                'Swap Request Declined',
                owner_username || ' declined your request to swap "' || COALESCE(counter_offered_book_title, 'Unknown Book') || '" for "' || COALESCE(original_book_title, 'Unknown Book') || '".',
                jsonb_build_object(
                    'swap_request_id', NEW.id,
                    'book_id', NEW.book_id,
                    'offered_book_id', NEW.offered_book_id,
                    'owner_id', NEW.owner_id
                )
            );
            
        ELSIF NEW.status = 'COUNTER_OFFER' THEN
            -- Get book titles for the notification message
            SELECT title INTO original_book_title 
            FROM public.books WHERE id = NEW.book_id;
            
            SELECT title INTO counter_offered_book_title 
            FROM public.books WHERE id = NEW.counter_offered_book_id;
            
            -- Notify the original requester about the counter-offer
            INSERT INTO public.notifications (user_id, type, title, message, data)
            VALUES (
                NEW.requester_id,
                'COUNTER_OFFER',
                'Counter-Offer Received',
                owner_username || ' made a counter-offer for your request of "' || COALESCE(original_book_title, 'Unknown Book') || '". They''re offering "' || COALESCE(counter_offered_book_title, 'Unknown Book') || '" instead.',
                jsonb_build_object(
                    'swap_request_id', NEW.id,
                    'book_id', NEW.book_id,
                    'counter_offered_book_id', NEW.counter_offered_book_id,
                    'owner_id', NEW.owner_id
                )
            );
            
            RAISE NOTICE 'Created counter-offer notification for user %', NEW.requester_id;
            
        -- Handle counter-offer acceptance (COUNTER_OFFER -> ACCEPTED)
        ELSIF OLD.status = 'COUNTER_OFFER' AND NEW.status = 'ACCEPTED' THEN
            -- Get book titles for the notification message
            SELECT title INTO original_book_title 
            FROM public.books WHERE id = NEW.book_id;
            
            SELECT title INTO counter_offered_book_title 
            FROM public.books WHERE id = NEW.counter_offered_book_id;
            
            -- Notify the person who made the counter-offer (owner) that it was accepted
            INSERT INTO public.notifications (user_id, type, title, message, data)
            VALUES (
                NEW.owner_id,
                'SWAP_ACCEPTED',
                'Counter-Offer Accepted',
                requester_username || ' accepted your counter-offer! You''ll exchange "' || COALESCE(counter_offered_book_title, 'Unknown Book') || '" for "' || COALESCE(original_book_title, 'Unknown Book') || '".',
                jsonb_build_object(
                    'swap_request_id', NEW.id,
                    'book_id', NEW.book_id,
                    'counter_offered_book_id', NEW.counter_offered_book_id,
                    'requester_id', NEW.requester_id
                )
            );
            
            RAISE NOTICE 'Created counter-offer acceptance notification for user %', NEW.owner_id;
            
        -- Handle cancellations
        ELSIF NEW.status = 'CANCELLED' THEN
            -- Get book titles for the notification message
            SELECT title INTO original_book_title 
            FROM public.books WHERE id = NEW.book_id;
            
            -- Get the offered book title (could be original offer or counter-offer)
            IF NEW.counter_offered_book_id IS NOT NULL THEN
                SELECT title INTO counter_offered_book_title 
                FROM public.books WHERE id = NEW.counter_offered_book_id;
            ELSE
                SELECT title INTO counter_offered_book_title 
                FROM public.books WHERE id = NEW.offered_book_id;
            END IF;
            
            -- Determine who to notify (the other party, not the one who cancelled)
            IF NEW.cancelled_by = NEW.requester_id THEN
                -- Requester cancelled, notify owner
                INSERT INTO public.notifications (user_id, type, title, message, data)
                VALUES (
                    NEW.owner_id,
                    'SWAP_CANCELLED',
                    'Swap Request Cancelled',
                    requester_username || ' cancelled the swap request to exchange "' || COALESCE(counter_offered_book_title, 'Unknown Book') || '" for your book "' || COALESCE(original_book_title, 'Unknown Book') || '".',
                    jsonb_build_object(
                        'swap_request_id', NEW.id,
                        'book_id', NEW.book_id,
                        'offered_book_id', NEW.offered_book_id,
                        'counter_offered_book_id', NEW.counter_offered_book_id,
                        'cancelled_by', NEW.cancelled_by,
                        'requester_id', NEW.requester_id
                    )
                );
                RAISE NOTICE 'Created cancellation notification for owner %', NEW.owner_id;
                
            ELSIF NEW.cancelled_by = NEW.owner_id THEN
                -- Owner cancelled, notify requester
                INSERT INTO public.notifications (user_id, type, title, message, data)
                VALUES (
                    NEW.requester_id,
                    'SWAP_CANCELLED',
                    'Swap Request Cancelled',
                    owner_username || ' cancelled the swap request to exchange "' || COALESCE(counter_offered_book_title, 'Unknown Book') || '" for "' || COALESCE(original_book_title, 'Unknown Book') || '".',
                    jsonb_build_object(
                        'swap_request_id', NEW.id,
                        'book_id', NEW.book_id,
                        'offered_book_id', NEW.offered_book_id,
                        'counter_offered_book_id', NEW.counter_offered_book_id,
                        'cancelled_by', NEW.cancelled_by,
                        'owner_id', NEW.owner_id
                    )
                );
                RAISE NOTICE 'Created cancellation notification for requester %', NEW.requester_id;
            END IF;
            
        -- Handle swap completion
        ELSIF NEW.status = 'COMPLETED' AND OLD.status = 'ACCEPTED' THEN
            -- Get book titles for the notification message
            SELECT title INTO original_book_title 
            FROM public.books WHERE id = NEW.book_id;
            
            -- Get the book being offered (could be original or counter-offer)
            IF NEW.counter_offered_book_id IS NOT NULL THEN
                SELECT title INTO counter_offered_book_title 
                FROM public.books WHERE id = NEW.counter_offered_book_id;
            ELSE
                SELECT title INTO counter_offered_book_title 
                FROM public.books WHERE id = NEW.offered_book_id;
            END IF;
            
            -- Notify both parties that the swap is completed
            INSERT INTO public.notifications (user_id, type, title, message, data)
            VALUES 
                (NEW.requester_id, 'SWAP_COMPLETED', 'Swap Completed', 
                 'Your swap with ' || owner_username || ' is complete! Enjoy "' || COALESCE(CASE WHEN NEW.counter_offered_book_id IS NOT NULL THEN counter_offered_book_title ELSE original_book_title END, 'Unknown Book') || '"!',
                 jsonb_build_object('swap_request_id', NEW.id, 'book_id', NEW.book_id, 'completed_by', 'both')),
                (NEW.owner_id, 'SWAP_COMPLETED', 'Swap Completed',
                 'Your swap with ' || requester_username || ' is complete! Enjoy "' || COALESCE(CASE WHEN NEW.counter_offered_book_id IS NOT NULL THEN counter_offered_book_title ELSE counter_offered_book_title END, 'Unknown Book') || '"!',
                 jsonb_build_object('swap_request_id', NEW.id, 'book_id', NEW.book_id, 'completed_by', 'both'));
                 
            RAISE NOTICE 'Created completion notifications for both parties';
        END IF;
        RETURN NEW;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- The trigger already exists, so we don't need to recreate it
-- It will automatically use the updated function

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION create_swap_request_notification() TO authenticated;

-- Add comment explaining the updated functionality
COMMENT ON FUNCTION create_swap_request_notification() 
IS 'Automatically creates notifications when swap requests are created or updated, including counter-offer notifications';

-- Verify the function was updated successfully
SELECT 'Counter-offer notifications added to swap notification system' as status;
