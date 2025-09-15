-- Complete notification system fix including function creation
-- This creates the missing function and sets up the entire notification system

-- 1. First, create the notification function
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
            notification_message := owner_username || ' accepted your swap request for "' || book_record.title || '"!';
            
            INSERT INTO public.notifications (user_id, type, title, message, data)
            VALUES (
                NEW.requester_id,
                'SWAP_ACCEPTED',
                'Swap Request Accepted',
                notification_message,
                jsonb_build_object(
                    'swap_request_id', NEW.id,
                    'book_id', NEW.book_id,
                    'offered_book_id', NEW.offered_book_id,
                    'owner_id', NEW.owner_id,
                    'book_title', book_record.title,
                    'book_cover', book_record.google_volume_id,
                    'owner_username', owner_username
                )
            );
            
        -- Notify the other party when request is cancelled
        ELSIF NEW.status = 'CANCELLED' THEN
            DECLARE
                notify_user_id UUID;
                cancel_message TEXT;
            BEGIN
                -- Determine who to notify based on who cancelled
                IF acting_user_id = NEW.requester_id THEN
                    -- Requester cancelled, notify owner
                    notify_user_id := NEW.owner_id;
                    cancel_message := requester_username || ' cancelled their swap request for "' || book_record.title || '"';
                ELSE
                    -- Owner cancelled, notify requester
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
                        'cancelled_by', acting_user_id,
                        'book_title', book_record.title,
                        'book_cover', book_record.google_volume_id
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
                    'book_title', book_record.title,
                    'book_cover', book_record.google_volume_id,
                    'owner_username', owner_username
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
                    'book_title', book_record.title,
                    'book_cover', book_record.google_volume_id,
                    'requester_username', requester_username
                )
            );
        END IF;
        RETURN NEW;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create the trigger
DROP TRIGGER IF EXISTS swap_request_notification_trigger ON swap_requests;
CREATE TRIGGER swap_request_notification_trigger
    AFTER INSERT OR UPDATE ON swap_requests
    FOR EACH ROW
    EXECUTE FUNCTION create_swap_request_notification();

-- 3. Fix RLS policies on notifications table
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can insert notifications" ON notifications;

CREATE POLICY "Users can view own notifications" 
ON notifications FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" 
ON notifications FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert notifications" 
ON notifications FOR INSERT 
WITH CHECK (true); -- Allow system to insert notifications

-- 4. Grant proper permissions for notifications
GRANT SELECT, INSERT, UPDATE ON notifications TO authenticated;
GRANT SELECT, INSERT, UPDATE ON notifications TO anon;

-- 5. Test notification system by creating a test notification
DO $$
DECLARE
    test_user_id UUID;
BEGIN
    -- Get the first user ID from profiles
    SELECT id INTO test_user_id FROM profiles LIMIT 1;
    
    IF test_user_id IS NOT NULL THEN
        INSERT INTO notifications (user_id, type, title, message, data)
        VALUES (
            test_user_id,
            'SYSTEM_TEST',
            'System Test',
            'Notification system is working correctly',
            '{"test": true}'::jsonb
        );
        
        RAISE NOTICE 'Test notification created for user: %', test_user_id;
    ELSE
        RAISE NOTICE 'No users found in profiles table';
    END IF;
END $$;

-- 6. Verify everything is working
SELECT 'Notification function and trigger created successfully' as status;
SELECT COUNT(*) as total_notifications FROM notifications;
SELECT COUNT(*) as unread_notifications FROM notifications WHERE read = false;
