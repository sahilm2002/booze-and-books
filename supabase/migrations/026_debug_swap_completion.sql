-- Debug version of swap completion trigger to see what's happening

DROP FUNCTION IF EXISTS transfer_book_ownership_on_completion() CASCADE;

CREATE OR REPLACE FUNCTION transfer_book_ownership_on_completion()
RETURNS TRIGGER AS $$
DECLARE
    current_requested_book_owner UUID;
    current_offered_book_owner UUID;
BEGIN
    -- Only proceed if swap is being marked as completed for the first time
    IF NEW.status = 'COMPLETED' AND (OLD.status IS NULL OR OLD.status != 'COMPLETED') THEN
        -- Log the swap request details
        RAISE NOTICE 'SWAP COMPLETION DEBUG - Swap ID: %', NEW.id;
        RAISE NOTICE 'SWAP COMPLETION DEBUG - book_id (requested): %, owner_id (current book owner): %', NEW.book_id, NEW.owner_id;
        RAISE NOTICE 'SWAP COMPLETION DEBUG - offered_book_id: %, requester_id (offering user): %', NEW.offered_book_id, NEW.requester_id;
        
        -- Validate that both books exist
        IF NEW.book_id IS NULL OR NEW.offered_book_id IS NULL THEN
            RAISE EXCEPTION 'Cannot complete swap: missing book_id or offered_book_id';
        END IF;
        
        -- Get current owners of both books
        SELECT owner_id INTO current_requested_book_owner 
        FROM books WHERE id = NEW.book_id;
        
        SELECT owner_id INTO current_offered_book_owner 
        FROM books WHERE id = NEW.offered_book_id;
        
        RAISE NOTICE 'SWAP COMPLETION DEBUG - Current owner of requested book (%): %', NEW.book_id, current_requested_book_owner;
        RAISE NOTICE 'SWAP COMPLETION DEBUG - Expected owner of requested book: %', NEW.owner_id;
        RAISE NOTICE 'SWAP COMPLETION DEBUG - Current owner of offered book (%): %', NEW.offered_book_id, current_offered_book_owner;
        RAISE NOTICE 'SWAP COMPLETION DEBUG - Expected owner of offered book: %', NEW.requester_id;
        
        -- Validate current ownership matches expectations
        IF current_requested_book_owner IS NULL THEN
            RAISE EXCEPTION 'Cannot complete swap: requested book % not found', NEW.book_id;
        END IF;
        
        IF current_offered_book_owner IS NULL THEN
            RAISE EXCEPTION 'Cannot complete swap: offered book % not found', NEW.offered_book_id;
        END IF;
        
        IF current_requested_book_owner != NEW.owner_id THEN
            RAISE EXCEPTION 'Cannot complete swap: requested book % currently owned by % but swap expects owner %', 
                NEW.book_id, current_requested_book_owner, NEW.owner_id;
        END IF;
        
        IF current_offered_book_owner != NEW.requester_id THEN
            RAISE EXCEPTION 'Cannot complete swap: offered book % currently owned by % but swap expects owner %', 
                NEW.offered_book_id, current_offered_book_owner, NEW.requester_id;
        END IF;
        
        RAISE NOTICE 'SWAP COMPLETION DEBUG - Ownership validation passed, starting transfer...';
        
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
        
        RAISE NOTICE 'SWAP COMPLETION DEBUG - Transfer completed successfully for swap %', NEW.id;
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