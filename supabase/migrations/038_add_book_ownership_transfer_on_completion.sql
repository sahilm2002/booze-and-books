-- CRITICAL FIX: Replace the incorrect trigger from migration 027
-- Migration 027's trigger was transferring ownership when either party completed (wrong!)
-- This migration fixes it to only transfer when BOTH parties complete

-- Drop the incorrect trigger and function from migration 027
DROP TRIGGER IF EXISTS trigger_transfer_ownership_on_completion ON swap_requests;
DROP FUNCTION IF EXISTS transfer_book_ownership_on_completion();

-- Create the correct function that only transfers when both parties complete
CREATE OR REPLACE FUNCTION transfer_book_ownership_on_completion()
RETURNS TRIGGER AS $$
DECLARE
    current_requested_book_owner UUID;
    current_offered_book_owner UUID;
BEGIN
    -- Only proceed if both parties have completed the swap and it's not already fully completed
    IF NEW.requester_completed_at IS NOT NULL AND NEW.owner_completed_at IS NOT NULL AND OLD.completed_at IS NULL THEN
        -- Set the overall completion timestamp and status
        NEW.completed_at = NOW();
        NEW.status = 'COMPLETED';
        
        -- Validate that both books exist
        IF NEW.book_id IS NULL OR NEW.offered_book_id IS NULL THEN
            RAISE EXCEPTION 'Cannot complete swap: missing book_id or offered_book_id';
        END IF;
        
        -- Get current owners of both books
        SELECT owner_id INTO current_requested_book_owner 
        FROM books WHERE id = NEW.book_id;
        
        SELECT owner_id INTO current_offered_book_owner 
        FROM books WHERE id = NEW.offered_book_id;
        
        -- Validate current ownership matches the swap agreement
        IF current_requested_book_owner != NEW.owner_id THEN
            RAISE EXCEPTION 'Cannot complete swap: requested book % is owned by % but swap expects %', 
                NEW.book_id, current_requested_book_owner, NEW.owner_id;
        END IF;
        
        IF current_offered_book_owner != NEW.requester_id THEN
            RAISE EXCEPTION 'Cannot complete swap: offered book % is owned by % but swap expects %', 
                NEW.offered_book_id, current_offered_book_owner, NEW.requester_id;
        END IF;
        
        -- Perform the ownership transfer atomically
        -- Transfer requested book: owner_id → requester_id
        UPDATE books 
        SET 
            owner_id = NEW.requester_id,
            is_available = true,  -- Make available for future swaps
            updated_at = now()
        WHERE id = NEW.book_id;
        
        -- Transfer offered book: requester_id → owner_id
        UPDATE books 
        SET 
            owner_id = NEW.owner_id,
            is_available = true,  -- Make available for future swaps
            updated_at = now()
        WHERE id = NEW.offered_book_id;
        
        -- Handle counter-offered book ownership transfer
        IF NEW.counter_offered_book_id IS NOT NULL THEN
            UPDATE books 
            SET 
                owner_id = NEW.requester_id,
                is_available = true,
                updated_at = now()
            WHERE id = NEW.counter_offered_book_id;
        END IF;
        
        RAISE NOTICE 'SWAP COMPLETION - Successfully transferred ownership for swap %: both parties completed', NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the corrected trigger that only fires when both parties have completed
CREATE TRIGGER trigger_transfer_ownership_on_completion
    BEFORE UPDATE ON swap_requests
    FOR EACH ROW
    EXECUTE FUNCTION transfer_book_ownership_on_completion();

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION transfer_book_ownership_on_completion() TO authenticated;

COMMENT ON FUNCTION transfer_book_ownership_on_completion() IS 'FIXED: Transfers book ownership only when both parties mark a swap as completed (not when either party completes)';
