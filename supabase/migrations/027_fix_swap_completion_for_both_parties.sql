-- Fix swap completion trigger to work regardless of which party completes it
-- Either the book owner OR the requester can mark a swap as completed

DROP FUNCTION IF EXISTS transfer_book_ownership_on_completion() CASCADE;

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
        
        -- Get current owners of both books
        SELECT owner_id INTO current_requested_book_owner 
        FROM books WHERE id = NEW.book_id;
        
        SELECT owner_id INTO current_offered_book_owner 
        FROM books WHERE id = NEW.offered_book_id;
        
        -- Log for debugging
        RAISE NOTICE 'SWAP COMPLETION - Swap ID: %, book_id: %, offered_book_id: %', NEW.id, NEW.book_id, NEW.offered_book_id;
        RAISE NOTICE 'SWAP COMPLETION - Expected: book % owned by %, book % owned by %', 
            NEW.book_id, NEW.owner_id, NEW.offered_book_id, NEW.requester_id;
        RAISE NOTICE 'SWAP COMPLETION - Actual: book % owned by %, book % owned by %', 
            NEW.book_id, current_requested_book_owner, NEW.offered_book_id, current_offered_book_owner;
        
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
        
        -- Perform the ownership transfer atomically
        -- Transfer requested book: owner_id → requester_id
        UPDATE books 
        SET 
            owner_id = NEW.requester_id,
            updated_at = now()
        WHERE id = NEW.book_id;
        
        -- Transfer offered book: requester_id → owner_id
        UPDATE books 
        SET 
            owner_id = NEW.owner_id,
            updated_at = now()
        WHERE id = NEW.offered_book_id;
        
        RAISE NOTICE 'SWAP COMPLETION - Successfully transferred ownership for swap %: book % → user %, book % → user %', 
            NEW.id, NEW.book_id, NEW.requester_id, NEW.offered_book_id, NEW.owner_id;
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

-- Comment explaining the logic
COMMENT ON FUNCTION transfer_book_ownership_on_completion() 
IS 'Transfers book ownership when a swap is completed by either party. Validates that books are owned by the expected users before transfer.';