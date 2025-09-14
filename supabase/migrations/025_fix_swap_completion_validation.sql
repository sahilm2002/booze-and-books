-- Fix swap completion validation trigger
-- The validation logic needs to properly check current book ownership

DROP FUNCTION IF EXISTS transfer_book_ownership_on_completion() CASCADE;

CREATE OR REPLACE FUNCTION transfer_book_ownership_on_completion()
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
        
        -- Lock both books in deterministic order to prevent deadlocks and ensure they exist
        -- This will raise an exception immediately if either book is missing or inaccessible under RLS
        PERFORM 1 FROM books 
        WHERE id IN (NEW.book_id, NEW.offered_book_id) 
        ORDER BY id 
        FOR UPDATE;
        
        -- Verify we have exactly 2 books locked
        IF (SELECT COUNT(*) FROM books WHERE id IN (NEW.book_id, NEW.offered_book_id)) != 2 THEN
            RAISE EXCEPTION 'Cannot complete swap: one or both books are missing or inaccessible';
        END IF;
        
        -- Get current owners of both books with strict validation
        SELECT owner_id INTO STRICT current_requested_book_owner 
        FROM books WHERE id = NEW.book_id;
        
        SELECT owner_id INTO STRICT current_offered_book_owner 
        FROM books WHERE id = NEW.offered_book_id;
        
        -- Validate current ownership matches what the swap request expects
        IF current_requested_book_owner != NEW.owner_id THEN
            RAISE EXCEPTION 'Cannot complete swap: requested book owner has changed from % to %, expected %', 
                current_requested_book_owner, NEW.owner_id, NEW.owner_id;
        END IF;
        
        IF current_offered_book_owner != NEW.requester_id THEN
            RAISE EXCEPTION 'Cannot complete swap: offered book owner has changed from % to %, expected %', 
                current_offered_book_owner, NEW.requester_id, NEW.requester_id;
        END IF;
        
        -- Perform the ownership transfer atomically with concurrency safety
        -- Transfer requested book from current owner (NEW.owner_id) to requester (NEW.requester_id)
        UPDATE public.books 
        SET 
            owner_id = NEW.requester_id,
            updated_at = now()
        WHERE id = NEW.book_id AND owner_id = NEW.owner_id;
        
        -- Verify the first update affected exactly one row
        IF NOT FOUND THEN
            RAISE EXCEPTION 'Cannot complete swap: requested book % ownership changed during transaction (expected owner: %)', 
                NEW.book_id, NEW.owner_id;
        END IF;
        
        -- Transfer offered book from current owner (NEW.requester_id) to owner (NEW.owner_id)  
        UPDATE public.books 
        SET 
            owner_id = NEW.owner_id,
            updated_at = now()
        WHERE id = NEW.offered_book_id AND owner_id = NEW.requester_id;
        
        -- Verify the second update affected exactly one row
        IF NOT FOUND THEN
            RAISE EXCEPTION 'Cannot complete swap: offered book % ownership changed during transaction (expected owner: %)', 
                NEW.offered_book_id, NEW.requester_id;
        END IF;
        
        -- Log the successful transfer
        RAISE NOTICE 'Book ownership transferred for swap %: book % -> user %, book % -> user %', 
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

-- Add comment
COMMENT ON FUNCTION transfer_book_ownership_on_completion() 
IS 'Transfers book ownership when a swap is marked as completed with proper validation';
