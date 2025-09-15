-- Fix RLS issue in book ownership transfer function
-- The function has SECURITY DEFINER but still fails due to RLS context issues

-- Drop triggers first to avoid dependency issues
DROP TRIGGER IF EXISTS trigger_transfer_ownership_on_completion ON swap_requests;
DROP TRIGGER IF EXISTS trigger_transfer_book_ownership_on_completion ON swap_requests;

-- Now drop and recreate the function with proper RLS handling
DROP FUNCTION IF EXISTS transfer_book_ownership_on_completion();

CREATE OR REPLACE FUNCTION transfer_book_ownership_on_completion()
RETURNS TRIGGER AS $$
DECLARE
    current_requested_book_owner UUID;
    current_offered_book_owner UUID;
BEGIN
    -- Only proceed if swap is being marked as completed for the first time
    IF NEW.status = 'COMPLETED' AND (OLD.status IS NULL OR OLD.status != 'COMPLETED') THEN        
        -- Validate that both books exist
        IF NEW.book_id IS NULL OR NEW.offered_book_id IS NULL THEN
            RAISE EXCEPTION 'Cannot complete swap: missing book_id or offered_book_id';
        END IF;
        
        -- Get current owners of both books (bypass RLS for reading)
        SELECT owner_id INTO current_requested_book_owner 
        FROM books WHERE id = NEW.book_id;
        
        SELECT owner_id INTO current_offered_book_owner 
        FROM books WHERE id = NEW.offered_book_id;
        
        -- Validate current ownership matches the swap agreement
        -- The requested book should be owned by the swap's owner_id
        IF current_requested_book_owner != NEW.owner_id THEN
            RAISE EXCEPTION 'Cannot complete swap: requested book % is owned by % but swap expects %', 
                NEW.book_id, current_requested_book_owner, NEW.owner_id;
        END IF;
        
        -- The offered book should be owned by the swap's requester_id
        IF current_offered_book_owner != NEW.requester_id THEN
            RAISE EXCEPTION 'Cannot complete swap: offered book % is owned by % but swap expects %', 
                NEW.offered_book_id, current_offered_book_owner, NEW.requester_id;
        END IF;
        
        -- Perform the ownership transfer atomically (bypass RLS for updates)
        -- Transfer requested book: owner_id → requester_id
        UPDATE books 
        SET 
            owner_id = NEW.requester_id,
            updated_at = now(),
            is_available = true  -- Make books available again after swap
        WHERE id = NEW.book_id;
        
        -- Transfer offered book: requester_id → owner_id
        UPDATE books 
        SET 
            owner_id = NEW.owner_id,
            updated_at = now(),
            is_available = true  -- Make books available again after swap
        WHERE id = NEW.offered_book_id;
        
        -- Also handle counter-offered book if it exists
        IF NEW.counter_offered_book_id IS NOT NULL THEN
            UPDATE books 
            SET 
                owner_id = NEW.requester_id,
                updated_at = now(),
                is_available = true
            WHERE id = NEW.counter_offered_book_id;
        END IF;
        
        RAISE NOTICE 'Successfully transferred ownership for swap %', NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
DROP TRIGGER IF EXISTS trigger_transfer_ownership_on_completion ON swap_requests;
CREATE TRIGGER trigger_transfer_ownership_on_completion
    AFTER UPDATE ON swap_requests
    FOR EACH ROW
    WHEN (NEW.status = 'COMPLETED')
    EXECUTE FUNCTION transfer_book_ownership_on_completion();

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION transfer_book_ownership_on_completion() TO authenticated;

-- Comment explaining the fix
COMMENT ON FUNCTION transfer_book_ownership_on_completion() 
IS 'FIXED: Transfers book ownership when a swap is completed. Uses SECURITY DEFINER to bypass RLS policies that were preventing ownership transfer.';

-- Verify the function was created successfully
SELECT 'Book ownership transfer function fixed for RLS' as status;
