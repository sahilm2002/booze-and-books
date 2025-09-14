-- Debug trigger to show exact UUID values during execution

DROP FUNCTION IF EXISTS transfer_book_ownership_on_completion() CASCADE;

CREATE OR REPLACE FUNCTION transfer_book_ownership_on_completion()
RETURNS TRIGGER AS $$
DECLARE
    current_requested_book_owner UUID;
    current_offered_book_owner UUID;
BEGIN
    -- Only proceed if swap is being marked as completed for the first time
    IF NEW.status = 'COMPLETED' AND (OLD.status IS NULL OR OLD.status != 'COMPLETED') THEN        
        -- Log all the UUID values we're working with
        RAISE NOTICE 'SWAP DEBUG - NEW.id: %', NEW.id;
        RAISE NOTICE 'SWAP DEBUG - NEW.book_id: %', NEW.book_id;
        RAISE NOTICE 'SWAP DEBUG - NEW.owner_id: %', NEW.owner_id;
        RAISE NOTICE 'SWAP DEBUG - NEW.offered_book_id: %', NEW.offered_book_id;
        RAISE NOTICE 'SWAP DEBUG - NEW.requester_id: %', NEW.requester_id;
        
        -- Validate that both books exist
        IF NEW.book_id IS NULL OR NEW.offered_book_id IS NULL THEN
            RAISE EXCEPTION 'Cannot complete swap: missing book_id or offered_book_id';
        END IF;
        
        -- Get current owners of both books with explicit logging
        SELECT owner_id INTO current_requested_book_owner 
        FROM books WHERE id = NEW.book_id;
        
        RAISE NOTICE 'SWAP DEBUG - Query result for book %: owner_id = %', NEW.book_id, current_requested_book_owner;
        
        SELECT owner_id INTO current_offered_book_owner 
        FROM books WHERE id = NEW.offered_book_id;
        
        RAISE NOTICE 'SWAP DEBUG - Query result for book %: owner_id = %', NEW.offered_book_id, current_offered_book_owner;
        
        -- Show the comparison values before validation
        RAISE NOTICE 'SWAP DEBUG - Comparing requested book owner: % (current) vs % (expected)', 
            current_requested_book_owner, NEW.owner_id;
        RAISE NOTICE 'SWAP DEBUG - Comparing offered book owner: % (current) vs % (expected)', 
            current_offered_book_owner, NEW.requester_id;
            
        -- Check if the values are equal using explicit comparison
        IF current_requested_book_owner = NEW.owner_id THEN
            RAISE NOTICE 'SWAP DEBUG - Requested book ownership validation: PASSED';
        ELSE
            RAISE NOTICE 'SWAP DEBUG - Requested book ownership validation: FAILED';
            RAISE EXCEPTION 'Cannot complete swap: requested book % is owned by % but swap expects %', 
                NEW.book_id, current_requested_book_owner, NEW.owner_id;
        END IF;
        
        IF current_offered_book_owner = NEW.requester_id THEN
            RAISE NOTICE 'SWAP DEBUG - Offered book ownership validation: PASSED';
        ELSE
            RAISE NOTICE 'SWAP DEBUG - Offered book ownership validation: FAILED';
            RAISE EXCEPTION 'Cannot complete swap: offered book % is owned by % but swap expects %', 
                NEW.offered_book_id, current_offered_book_owner, NEW.requester_id;
        END IF;
        
        RAISE NOTICE 'SWAP DEBUG - All validations passed, proceeding with transfer...';
        
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
        
        RAISE NOTICE 'SWAP DEBUG - Successfully transferred ownership for swap %', NEW.id;
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