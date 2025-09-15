-- Rebuild swap system from scratch with clean architecture
-- This migration creates a complete, bug-free swap system

-- Drop existing swap-related objects to start fresh
DROP TABLE IF EXISTS swap_requests CASCADE;
DROP TYPE IF EXISTS swap_status CASCADE;

-- Create new swap status enum with simplified flow
CREATE TYPE swap_status AS ENUM ('PENDING', 'COUNTER_OFFER', 'ACCEPTED', 'COMPLETED', 'CANCELLED');

-- Create the new swap_requests table with complete functionality
CREATE TABLE swap_requests (
    -- Primary key
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    
    -- Core swap data
    book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    offered_book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    counter_offered_book_id UUID REFERENCES books(id) ON DELETE CASCADE,
    
    -- Parties involved
    requester_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Status and messaging
    status swap_status DEFAULT 'PENDING' NOT NULL,
    message TEXT, -- Initial request message
    counter_offer_message TEXT, -- Message with counter-offer
    
    -- Completion tracking (key feature for proper completion flow)
    completed_at TIMESTAMP WITH TIME ZONE, -- When BOTH parties completed
    requester_completed_at TIMESTAMP WITH TIME ZONE, -- Individual completion timestamp
    owner_completed_at TIMESTAMP WITH TIME ZONE, -- Individual completion timestamp
    
    -- Ratings and feedback (collected during completion)
    requester_rating INTEGER CHECK (requester_rating >= 1 AND requester_rating <= 5),
    owner_rating INTEGER CHECK (owner_rating >= 1 AND owner_rating <= 5),
    requester_feedback TEXT,
    owner_feedback TEXT,
    
    -- Audit trail
    cancelled_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    
    -- Constraints
    CONSTRAINT different_users CHECK (requester_id != owner_id),
    CONSTRAINT different_books CHECK (book_id != offered_book_id),
    CONSTRAINT counter_offer_different CHECK (counter_offered_book_id IS NULL OR counter_offered_book_id != book_id),
    CONSTRAINT completion_logic CHECK (
        (completed_at IS NULL) OR 
        (completed_at IS NOT NULL AND requester_completed_at IS NOT NULL AND owner_completed_at IS NOT NULL)
    )
);

-- Create indexes for performance
CREATE INDEX idx_swap_requests_book_id ON swap_requests(book_id);
CREATE INDEX idx_swap_requests_offered_book_id ON swap_requests(offered_book_id);
CREATE INDEX idx_swap_requests_counter_offered_book_id ON swap_requests(counter_offered_book_id);
CREATE INDEX idx_swap_requests_requester_id ON swap_requests(requester_id);
CREATE INDEX idx_swap_requests_owner_id ON swap_requests(owner_id);
CREATE INDEX idx_swap_requests_status ON swap_requests(status);
CREATE INDEX idx_swap_requests_created_at ON swap_requests(created_at);

-- Composite indexes for common queries
CREATE INDEX idx_swap_requests_requester_status ON swap_requests(requester_id, status);
CREATE INDEX idx_swap_requests_owner_status ON swap_requests(owner_id, status);
CREATE INDEX idx_swap_requests_active_books ON swap_requests(book_id, offered_book_id) WHERE status IN ('PENDING', 'COUNTER_OFFER', 'ACCEPTED');

-- Unique constraint to prevent duplicate pending requests
CREATE UNIQUE INDEX idx_swap_requests_unique_pending 
ON swap_requests(book_id, requester_id) 
WHERE status IN ('PENDING', 'COUNTER_OFFER');

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_swap_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
CREATE TRIGGER trigger_update_swap_requests_updated_at
    BEFORE UPDATE ON swap_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_swap_requests_updated_at();

-- Function to handle completion logic and book ownership transfer
CREATE OR REPLACE FUNCTION handle_swap_completion()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if both parties have now completed
    IF NEW.requester_completed_at IS NOT NULL AND NEW.owner_completed_at IS NOT NULL AND OLD.completed_at IS NULL THEN
        -- Set the overall completion timestamp
        NEW.completed_at = now();
        NEW.status = 'COMPLETED';
        
        -- Transfer book ownership
        -- The books being exchanged depend on whether there was a counter-offer
        IF NEW.counter_offered_book_id IS NOT NULL THEN
            -- Counter-offer was accepted: requester gets counter_offered_book, owner gets offered_book
            UPDATE books SET owner_id = NEW.requester_id WHERE id = NEW.counter_offered_book_id;
            UPDATE books SET owner_id = NEW.owner_id WHERE id = NEW.offered_book_id;
        ELSE
            -- Original request was accepted: requester gets requested_book, owner gets offered_book
            UPDATE books SET owner_id = NEW.requester_id WHERE id = NEW.book_id;
            UPDATE books SET owner_id = NEW.owner_id WHERE id = NEW.offered_book_id;
        END IF;
        
        -- Mark books as available again (they can be used in new swaps)
        UPDATE books SET is_available = true WHERE id IN (NEW.book_id, NEW.offered_book_id, NEW.counter_offered_book_id);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for completion handling
CREATE TRIGGER trigger_handle_swap_completion
    BEFORE UPDATE ON swap_requests
    FOR EACH ROW
    EXECUTE FUNCTION handle_swap_completion();

-- Function to create notifications for swap events
CREATE OR REPLACE FUNCTION create_swap_notification()
RETURNS TRIGGER AS $$
DECLARE
    notification_message TEXT;
    recipient_id UUID;
    book_title TEXT;
    offered_book_title TEXT;
    counter_book_title TEXT;
    requester_username TEXT;
    owner_username TEXT;
BEGIN
    -- Get book titles and usernames for notification messages
    SELECT title INTO book_title FROM books WHERE id = NEW.book_id;
    SELECT title INTO offered_book_title FROM books WHERE id = NEW.offered_book_id;
    IF NEW.counter_offered_book_id IS NOT NULL THEN
        SELECT title INTO counter_book_title FROM books WHERE id = NEW.counter_offered_book_id;
    END IF;
    
    SELECT username INTO requester_username FROM profiles WHERE id = NEW.requester_id;
    SELECT username INTO owner_username FROM profiles WHERE id = NEW.owner_id;
    
    -- Handle different notification scenarios
    IF TG_OP = 'INSERT' THEN
        -- New swap request created
        notification_message := requester_username || ' wants to swap "' || offered_book_title || '" for your "' || book_title || '"';
        -- Include custom message if provided
        IF NEW.message IS NOT NULL AND NEW.message != '' THEN
            notification_message := notification_message || '. Message: "' || NEW.message || '"';
        END IF;
        recipient_id := NEW.owner_id;
        
    ELSIF TG_OP = 'UPDATE' THEN
        -- Status changed
        IF OLD.status != NEW.status THEN
            CASE NEW.status
                WHEN 'COUNTER_OFFER' THEN
                    notification_message := owner_username || ' made a counter-offer: "' || counter_book_title || '" instead of "' || book_title || '"';
                    -- Include counter-offer message if provided
                    IF NEW.counter_offer_message IS NOT NULL AND NEW.counter_offer_message != '' THEN
                        notification_message := notification_message || '. Message: "' || NEW.counter_offer_message || '"';
                    END IF;
                    recipient_id := NEW.requester_id;
                    
                WHEN 'ACCEPTED' THEN
                    IF OLD.status = 'COUNTER_OFFER' THEN
                        notification_message := requester_username || ' accepted your counter-offer for "' || counter_book_title || '"';
                        recipient_id := NEW.owner_id;
                    ELSE
                        notification_message := owner_username || ' accepted your swap request for "' || book_title || '"';
                        recipient_id := NEW.requester_id;
                    END IF;
                    
                WHEN 'COMPLETED' THEN
                    -- Notify both parties
                    INSERT INTO notifications (user_id, type, title, message, metadata)
                    VALUES (
                        NEW.requester_id,
                        'swap_completed',
                        'Swap Completed!',
                        'Your swap with ' || owner_username || ' has been completed successfully',
                        jsonb_build_object('swap_id', NEW.id, 'other_user', owner_username)
                    );
                    
                    INSERT INTO notifications (user_id, type, title, message, metadata)
                    VALUES (
                        NEW.owner_id,
                        'swap_completed',
                        'Swap Completed!',
                        'Your swap with ' || requester_username || ' has been completed successfully',
                        jsonb_build_object('swap_id', NEW.id, 'other_user', requester_username)
                    );
                    
                    RETURN NEW; -- Exit early since we handled both notifications
                    
                WHEN 'CANCELLED' THEN
                    IF NEW.cancelled_by = NEW.requester_id THEN
                        notification_message := requester_username || ' cancelled the swap request for "' || book_title || '"';
                        recipient_id := NEW.owner_id;
                    ELSE
                        notification_message := owner_username || ' cancelled the swap request for "' || book_title || '"';
                        recipient_id := NEW.requester_id;
                    END IF;
            END CASE;
        END IF;
        
        -- Handle individual completion notifications
        IF OLD.requester_completed_at IS NULL AND NEW.requester_completed_at IS NOT NULL THEN
            notification_message := requester_username || ' marked the swap as completed. Please confirm your completion too.';
            recipient_id := NEW.owner_id;
        ELSIF OLD.owner_completed_at IS NULL AND NEW.owner_completed_at IS NOT NULL THEN
            notification_message := owner_username || ' marked the swap as completed. Please confirm your completion too.';
            recipient_id := NEW.requester_id;
        END IF;
    END IF;
    
    -- Insert notification if we have a message and recipient
    IF notification_message IS NOT NULL AND recipient_id IS NOT NULL THEN
        INSERT INTO notifications (user_id, type, title, message, metadata)
        VALUES (
            recipient_id,
            'swap_update',
            'Swap Update',
            notification_message,
            jsonb_build_object('swap_id', NEW.id, 'book_title', book_title)
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for swap notifications
CREATE TRIGGER trigger_create_swap_notification
    AFTER INSERT OR UPDATE ON swap_requests
    FOR EACH ROW
    EXECUTE FUNCTION create_swap_notification();

-- Enable RLS
ALTER TABLE swap_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Users can view their own swap requests (as requester OR owner)
CREATE POLICY "Users can view their own swap requests" ON swap_requests
    FOR SELECT USING (
        auth.uid() = requester_id OR auth.uid() = owner_id
    );

-- Users can create swap requests (with validation)
CREATE POLICY "Users can create swap requests" ON swap_requests
    FOR INSERT WITH CHECK (
        auth.uid() = requester_id
        AND requester_id != owner_id
        -- Ensure the requested book exists, is available, and not owned by requester
        AND EXISTS (
            SELECT 1 FROM books 
            WHERE books.id = book_id 
            AND books.is_available = true
            AND books.owner_id = owner_id
            AND books.owner_id != auth.uid()
        )
        -- Ensure the offered book exists, is available, and owned by requester
        AND EXISTS (
            SELECT 1 FROM books 
            WHERE books.id = offered_book_id 
            AND books.is_available = true
            AND books.owner_id = auth.uid()
        )
    );

-- Users can update their own swap requests with proper state transitions
CREATE POLICY "Users can update swap requests" ON swap_requests
    FOR UPDATE USING (
        auth.uid() = requester_id OR auth.uid() = owner_id
    )
    WITH CHECK (
        -- Requester can: cancel, accept counter-offers, mark as completed
        (auth.uid() = requester_id AND (
            (OLD.status IN ('PENDING', 'COUNTER_OFFER', 'ACCEPTED') AND NEW.status = 'CANCELLED' AND NEW.cancelled_by = auth.uid()) OR
            (OLD.status = 'COUNTER_OFFER' AND NEW.status = 'ACCEPTED') OR
            (OLD.status = 'ACCEPTED' AND NEW.requester_completed_at IS NOT NULL)
        )) OR
        -- Owner can: accept, counter-offer, cancel, mark as completed
        (auth.uid() = owner_id AND (
            (OLD.status = 'PENDING' AND NEW.status = 'ACCEPTED') OR
            (OLD.status = 'PENDING' AND NEW.status = 'COUNTER_OFFER' AND NEW.counter_offered_book_id IS NOT NULL) OR
            (OLD.status IN ('PENDING', 'COUNTER_OFFER', 'ACCEPTED') AND NEW.status = 'CANCELLED' AND NEW.cancelled_by = auth.uid()) OR
            (OLD.status = 'ACCEPTED' AND NEW.owner_completed_at IS NOT NULL)
        ))
    );

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON swap_requests TO authenticated;
GRANT USAGE ON SEQUENCE swap_requests_id_seq TO authenticated;

-- Add comments for documentation
COMMENT ON TABLE swap_requests IS 'Complete swap system with counter-offers and proper completion tracking';
COMMENT ON COLUMN swap_requests.book_id IS 'The book being requested';
COMMENT ON COLUMN swap_requests.offered_book_id IS 'The book being offered in exchange (required)';
COMMENT ON COLUMN swap_requests.counter_offered_book_id IS 'Alternative book proposed by owner (optional)';
COMMENT ON COLUMN swap_requests.completed_at IS 'When both parties marked as completed (triggers book transfer)';
COMMENT ON COLUMN swap_requests.requester_completed_at IS 'When requester marked their side as completed';
COMMENT ON COLUMN swap_requests.owner_completed_at IS 'When owner marked their side as completed';

-- Create function to get books involved in active swaps (for availability checking)
CREATE OR REPLACE FUNCTION get_books_in_active_swaps()
RETURNS TABLE(book_id UUID) AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT unnest(ARRAY[sr.book_id, sr.offered_book_id, sr.counter_offered_book_id])
    FROM swap_requests sr
    WHERE sr.status IN ('PENDING', 'COUNTER_OFFER', 'ACCEPTED')
    AND unnest(ARRAY[sr.book_id, sr.offered_book_id, sr.counter_offered_book_id]) IS NOT NULL;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_books_in_active_swaps() TO authenticated;
