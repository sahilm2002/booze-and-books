-- Add book ownership transfer functionality when swaps are completed
-- This migration fixes the critical bug where completed swaps don't transfer book ownership

-- Create function to handle book ownership transfer on swap completion
CREATE OR REPLACE FUNCTION transfer_book_ownership_on_completion_020()
RETURNS TRIGGER AS $$
BEGIN
    -- Only proceed if swap is being marked as completed for the first time
    IF NEW.status = 'COMPLETED' AND (OLD.status IS NULL OR OLD.status != 'COMPLETED') THEN
        -- Validate that both books exist and have the expected owners
        IF NEW.book_id IS NULL OR NEW.offered_book_id IS NULL THEN
            RAISE EXCEPTION 'Cannot complete swap: missing book_id or offered_book_id';
        END IF;
        
        -- Verify the books still belong to the expected users before transfer
        DECLARE
            requested_book_owner_id UUID;
            offered_book_owner_id UUID;
        BEGIN
            -- Get current owners of both books
            SELECT owner_id INTO requested_book_owner_id 
            FROM books WHERE id = NEW.book_id;
            
            SELECT owner_id INTO offered_book_owner_id 
            FROM books WHERE id = NEW.offered_book_id;
            
            -- Validate ownership before transfer
            IF requested_book_owner_id != NEW.owner_id THEN
                RAISE EXCEPTION 'Cannot complete swap: requested book owner has changed';
            END IF;
            
            IF offered_book_owner_id != NEW.requester_id THEN
                RAISE EXCEPTION 'Cannot complete swap: offered book owner has changed';
            END IF;
            
            -- Perform the ownership transfer atomically
            -- Transfer requested book from owner to requester
            UPDATE books 
            SET 
                owner_id = NEW.requester_id,
                updated_at = now()
            WHERE id = NEW.book_id;
            
            -- Transfer offered book from requester to owner  
            UPDATE books 
            SET 
                owner_id = NEW.owner_id,
                updated_at = now()
            WHERE id = NEW.offered_book_id;
            
            -- Log the successful transfer
            RAISE NOTICE 'Book ownership transferred for swap %: book % -> user %, book % -> user %', 
                NEW.id, NEW.book_id, NEW.requester_id, NEW.offered_book_id, NEW.owner_id;
        END;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to execute ownership transfer after swap completion
DROP TRIGGER IF EXISTS trigger_transfer_ownership_on_completion_020 ON swap_requests;
CREATE TRIGGER trigger_transfer_ownership_on_completion_020
    AFTER UPDATE ON swap_requests
    FOR EACH ROW
    WHEN (NEW.status = 'COMPLETED')
    EXECUTE FUNCTION transfer_book_ownership_on_completion_020();

-- Create function to validate swap completion prerequisites
CREATE OR REPLACE FUNCTION validate_swap_completion()
RETURNS TRIGGER AS $$
BEGIN
    -- Only validate when marking as completed
    IF NEW.status = 'COMPLETED' AND (OLD.status IS NULL OR OLD.status != 'COMPLETED') THEN
        -- Ensure both books are still available and owned by the right users
        IF NEW.offered_book_id IS NULL THEN
            RAISE EXCEPTION 'Cannot complete swap without offered_book_id';
        END IF;
        
        -- Validate that books haven't been deleted or transferred
        IF NOT EXISTS (SELECT 1 FROM books WHERE id = NEW.book_id AND owner_id = NEW.owner_id) THEN
            RAISE EXCEPTION 'Cannot complete swap: requested book is no longer owned by the owner';
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM books WHERE id = NEW.offered_book_id AND owner_id = NEW.requester_id) THEN
            RAISE EXCEPTION 'Cannot complete swap: offered book is no longer owned by the requester';
        END IF;
        
        -- Ensure at least one rating is provided
        IF NEW.requester_rating IS NULL AND NEW.owner_rating IS NULL THEN
            RAISE EXCEPTION 'Cannot complete swap: at least one rating must be provided';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create validation trigger that runs before the ownership transfer
DROP TRIGGER IF EXISTS trigger_validate_swap_completion ON swap_requests;
CREATE TRIGGER trigger_validate_swap_completion
    BEFORE UPDATE ON swap_requests
    FOR EACH ROW
    WHEN (NEW.status = 'COMPLETED')
    EXECUTE FUNCTION validate_swap_completion();

-- Add function to handle rollback of failed swaps (for future use)
CREATE OR REPLACE FUNCTION rollback_swap_if_needed(swap_request_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    swap_record RECORD;
    success BOOLEAN := FALSE;
BEGIN
    -- Get the swap request details
    SELECT * INTO swap_record 
    FROM swap_requests 
    WHERE id = swap_request_id AND status = 'COMPLETED';
    
    IF NOT FOUND THEN
        RAISE NOTICE 'Swap request % not found or not completed', swap_request_id;
        RETURN FALSE;
    END IF;
    
    -- Rollback ownership transfer
    BEGIN
        -- Transfer books back to original owners
        UPDATE books 
        SET 
            owner_id = swap_record.owner_id,
            updated_at = now()
        WHERE id = swap_record.book_id;
        
        UPDATE books 
        SET 
            owner_id = swap_record.requester_id,
            updated_at = now()
        WHERE id = swap_record.offered_book_id;
        
        -- Mark swap as cancelled
        UPDATE swap_requests 
        SET 
            status = 'CANCELLED',
            updated_at = now()
        WHERE id = swap_request_id;
        
        success := TRUE;
        RAISE NOTICE 'Successfully rolled back swap %', swap_request_id;
        
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Failed to rollback swap %: %', swap_request_id, SQLERRM;
        success := FALSE;
    END;
    
    RETURN success;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION transfer_book_ownership_on_completion_020() TO authenticated;
GRANT EXECUTE ON FUNCTION validate_swap_completion() TO authenticated;
GRANT EXECUTE ON FUNCTION rollback_swap_if_needed(UUID) TO authenticated;

-- Add comments
COMMENT ON FUNCTION transfer_book_ownership_on_completion_020() IS 'Transfers book ownership when a swap is marked as completed (migration 020 version)';
COMMENT ON FUNCTION validate_swap_completion() IS 'Validates that swap completion prerequisites are met';
COMMENT ON FUNCTION rollback_swap_if_needed(UUID) IS 'Rollback function for failed swaps (admin use)';

-- Create index for efficient swap completion queries
CREATE INDEX IF NOT EXISTS idx_swap_requests_books_completion 
ON swap_requests(book_id, offered_book_id, status) 
WHERE status = 'COMPLETED';
