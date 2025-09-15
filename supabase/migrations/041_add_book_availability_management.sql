-- Add proper book availability management for swap requests
-- Ensures books can only be in one swap at a time

-- Create function to atomically create swap request and mark books as unavailable
CREATE OR REPLACE FUNCTION create_swap_request_with_availability(
    p_book_id UUID,
    p_requester_id UUID,
    p_owner_id UUID,
    p_message TEXT DEFAULT NULL,
    p_offered_book_id UUID DEFAULT NULL
)
RETURNS TABLE(
    id UUID,
    book_id UUID,
    offered_book_id UUID,
    counter_offered_book_id UUID,
    requester_id UUID,
    owner_id UUID,
    status TEXT,
    message TEXT,
    counter_offer_message TEXT,
    completed_at TIMESTAMPTZ,
    requester_completed_at TIMESTAMPTZ,
    owner_completed_at TIMESTAMPTZ,
    requester_rating INTEGER,
    owner_rating INTEGER,
    requester_feedback TEXT,
    owner_feedback TEXT,
    cancelled_by UUID,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
) AS $$
DECLARE
    swap_record RECORD;
BEGIN
    -- Check if requested book is still available
    IF NOT EXISTS (
        SELECT 1 FROM books 
        WHERE books.id = p_book_id 
        AND books.is_available = true
    ) THEN
        RAISE EXCEPTION 'The requested book is no longer available for swapping';
    END IF;
    
    -- Check if offered book is still available (if provided)
    IF p_offered_book_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM books 
        WHERE books.id = p_offered_book_id 
        AND books.is_available = true
    ) THEN
        RAISE EXCEPTION 'The offered book is no longer available for swapping';
    END IF;
    
    -- Create the swap request
    INSERT INTO swap_requests (
        book_id,
        requester_id,
        owner_id,
        message,
        offered_book_id,
        status
    ) VALUES (
        p_book_id,
        p_requester_id,
        p_owner_id,
        p_message,
        p_offered_book_id,
        'PENDING'
    ) RETURNING * INTO swap_record;
    
    -- Mark requested book as unavailable
    UPDATE books 
    SET is_available = false, updated_at = NOW()
    WHERE books.id = p_book_id;
    
    -- Mark offered book as unavailable (if provided)
    IF p_offered_book_id IS NOT NULL THEN
        UPDATE books 
        SET is_available = false, updated_at = NOW()
        WHERE books.id = p_offered_book_id;
    END IF;
    
    -- Return the created swap request
    RETURN QUERY SELECT 
        swap_record.id,
        swap_record.book_id,
        swap_record.offered_book_id,
        swap_record.counter_offered_book_id,
        swap_record.requester_id,
        swap_record.owner_id,
        swap_record.status,
        swap_record.message,
        swap_record.counter_offer_message,
        swap_record.completed_at,
        swap_record.requester_completed_at,
        swap_record.owner_completed_at,
        swap_record.requester_rating,
        swap_record.owner_rating,
        swap_record.requester_feedback,
        swap_record.owner_feedback,
        swap_record.cancelled_by,
        swap_record.created_at,
        swap_record.updated_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to restore book availability when swaps end
CREATE OR REPLACE FUNCTION restore_book_availability_on_swap_end()
RETURNS TRIGGER AS $$
BEGIN
    -- Only restore availability when swap moves to CANCELLED or COMPLETED
    IF NEW.status IN ('CANCELLED', 'COMPLETED') AND OLD.status NOT IN ('CANCELLED', 'COMPLETED') THEN
        -- Mark requested book as available again
        UPDATE books 
        SET is_available = true, updated_at = NOW()
        WHERE id = NEW.book_id;
        
        -- Mark offered book as available again (if exists)
        IF NEW.offered_book_id IS NOT NULL THEN
            UPDATE books 
            SET is_available = true, updated_at = NOW()
            WHERE id = NEW.offered_book_id;
        END IF;
        
        -- Mark counter-offered book as available again (if exists)
        IF NEW.counter_offered_book_id IS NOT NULL THEN
            UPDATE books 
            SET is_available = true, updated_at = NOW()
            WHERE id = NEW.counter_offered_book_id;
        END IF;
        
        RAISE NOTICE 'Restored availability for books in swap %', NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically restore book availability
DROP TRIGGER IF EXISTS restore_book_availability_trigger ON swap_requests;
CREATE TRIGGER restore_book_availability_trigger
    AFTER UPDATE ON swap_requests
    FOR EACH ROW
    EXECUTE FUNCTION restore_book_availability_on_swap_end();

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION create_swap_request_with_availability(UUID, UUID, UUID, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION restore_book_availability_on_swap_end() TO authenticated;

-- Add comments
COMMENT ON FUNCTION create_swap_request_with_availability(UUID, UUID, UUID, TEXT, UUID) 
IS 'Atomically creates a swap request and marks involved books as unavailable to prevent double-booking';

COMMENT ON FUNCTION restore_book_availability_on_swap_end() 
IS 'Automatically restores book availability when swaps are cancelled or completed';

-- Update existing swap requests to mark their books as unavailable
-- (Only for active swaps - PENDING, COUNTER_OFFER, ACCEPTED)
UPDATE books 
SET is_available = false, updated_at = NOW()
WHERE id IN (
    SELECT DISTINCT book_id 
    FROM swap_requests 
    WHERE status IN ('PENDING', 'COUNTER_OFFER', 'ACCEPTED')
);

UPDATE books 
SET is_available = false, updated_at = NOW()
WHERE id IN (
    SELECT DISTINCT offered_book_id 
    FROM swap_requests 
    WHERE offered_book_id IS NOT NULL 
    AND status IN ('PENDING', 'COUNTER_OFFER', 'ACCEPTED')
);

UPDATE books 
SET is_available = false, updated_at = NOW()
WHERE id IN (
    SELECT DISTINCT counter_offered_book_id 
    FROM swap_requests 
    WHERE counter_offered_book_id IS NOT NULL 
    AND status IN ('PENDING', 'COUNTER_OFFER', 'ACCEPTED')
);

-- Verify the changes
SELECT 'Book availability management functions created successfully' as status;
