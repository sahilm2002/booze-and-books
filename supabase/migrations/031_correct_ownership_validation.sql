-- Correct ownership validation logic for swap completion
-- Validates ORIGINAL ownership before transfer, then performs the transfer
-- Note: This is an alternate version - the canonical implementation is in migration 027

DROP FUNCTION IF EXISTS transfer_book_ownership_on_completion_validation_031();

CREATE OR REPLACE FUNCTION transfer_book_ownership_on_completion_validation_031()
RETURNS TRIGGER AS $$
DECLARE
    current_requested_book_owner UUID;
    current_offered_book_owner UUID;
BEGIN
    -- Only proceed if swap is being marked as completed for the first time
    IF NEW.status = 'COMPLETED' AND (OLD.status IS NULL OR OLD.status != 'COMPLETED') THEN
        -- Validate that both books exist and are required
        IF NEW.book_id IS NULL OR NEW.offered_book_id IS NULL THEN
            RAISE EXCEPTION 'Cannot complete swap: missing book_id or offered_book_id';
        END IF;
        
        -- Get current owners of both books
        SELECT owner_id INTO current_requested_book_owner 
        FROM books WHERE id = NEW.book_id;
        
        SELECT owner_id INTO current_offered_book_owner 
        FROM books WHERE id = NEW.offered_book_id;
        
        -- Validate that books are not missing
        IF current_requested_book_owner IS NULL THEN
            RAISE EXCEPTION 'Cannot complete swap: requested book % not found', NEW.book_id;
        END IF;
        
        IF current_offered_book_owner IS NULL THEN
            RAISE EXCEPTION 'Cannot complete swap: offered book % not found', NEW.offered_book_id;
        END IF;
        
        -- CORRECT VALIDATION: Check original ownership (before any transfer)
        -- The requested book should currently be owned by the swap's owner_id
        IF current_requested_book_owner != NEW.owner_id THEN
            RAISE EXCEPTION 'Cannot complete swap: requested book % is currently owned by % but should be owned by % (the original book owner)', 
                NEW.book_id, current_requested_book_owner, NEW.owner_id;
        END IF;
        
        -- The offered book should currently be owned by the swap's requester_id  
        IF current_offered_book_owner != NEW.requester_id THEN
            RAISE EXCEPTION 'Cannot complete swap: offered book % is currently owned by % but should be owned by % (the requester)', 
                NEW.offered_book_id, current_offered_book_owner, NEW.requester_id;
        END IF;
        
        -- Now perform the ownership transfer atomically
        -- Transfer requested book: original owner (owner_id) → requester (requester_id)
        UPDATE books 
        SET 
            owner_id = NEW.requester_id,
            updated_at = now()
        WHERE id = NEW.book_id;
        
        -- Transfer offered book: requester (requester_id) → original owner (owner_id)
        UPDATE books 
        SET 
            owner_id = NEW.owner_id,
            updated_at = now()
        WHERE id = NEW.offered_book_id;
        
        RAISE NOTICE 'Successfully completed swap %: transferred book % to user %, book % to user %', 
            NEW.id, NEW.book_id, NEW.requester_id, NEW.offered_book_id, NEW.owner_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
DROP TRIGGER IF EXISTS trigger_transfer_ownership_on_completion_validation_031 ON swap_requests;
CREATE TRIGGER trigger_transfer_ownership_on_completion_validation_031
    AFTER UPDATE ON swap_requests
    FOR EACH ROW
    WHEN (NEW.status = 'COMPLETED')
    EXECUTE FUNCTION transfer_book_ownership_on_completion_validation_031();

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION transfer_book_ownership_on_completion_validation_031() TO authenticated;

-- Add comment explaining the correct logic
COMMENT ON FUNCTION transfer_book_ownership_on_completion_validation_031() 
IS 'Validates original book ownership then transfers books when swap is completed. Either party can mark swap as completed.';
