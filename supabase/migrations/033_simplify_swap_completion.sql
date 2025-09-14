-- Simplify swap completion trigger to remove problematic ownership validation
-- The ownership validation is causing issues as it tries to validate original ownership
-- when books may have already changed hands through the swap process
-- Note: This is an alternate version - the canonical implementation is in migration 027

DROP FUNCTION IF EXISTS transfer_book_ownership_on_completion_simplified_033();

CREATE OR REPLACE FUNCTION transfer_book_ownership_on_completion_simplified_033()
RETURNS TRIGGER AS $$
BEGIN
    -- Only proceed if this swap record is transitioning to COMPLETED status
    -- This prevents the trigger from running multiple times on the same swap record
    IF NEW.status = 'COMPLETED' AND (OLD.status IS NULL OR OLD.status != 'COMPLETED') THEN
        
        -- Validate that both books exist and are required
        IF NEW.book_id IS NULL OR NEW.offered_book_id IS NULL THEN
            RAISE EXCEPTION 'Cannot complete swap: missing book_id or offered_book_id';
        END IF;
        
        -- Verify both books exist (without ownership validation)
        IF NOT EXISTS (SELECT 1 FROM books WHERE id = NEW.book_id) THEN
            RAISE EXCEPTION 'Cannot complete swap: requested book % not found', NEW.book_id;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM books WHERE id = NEW.offered_book_id) THEN
            RAISE EXCEPTION 'Cannot complete swap: offered book % not found', NEW.offered_book_id;
        END IF;
        
        -- Perform the ownership transfer without validation
        -- Transfer requested book: current owner → requester
        UPDATE books 
        SET 
            owner_id = NEW.requester_id,
            updated_at = now()
        WHERE id = NEW.book_id;
        
        -- Transfer offered book: current owner → original book owner
        UPDATE books 
        SET 
            owner_id = NEW.owner_id,
            updated_at = now()
        WHERE id = NEW.offered_book_id;
        
        RAISE NOTICE 'Successfully completed swap %: transferred books between users', NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
DROP TRIGGER IF EXISTS trigger_transfer_ownership_on_completion_simplified_033 ON swap_requests;
CREATE TRIGGER trigger_transfer_ownership_on_completion_simplified_033
    AFTER UPDATE ON swap_requests
    FOR EACH ROW
    WHEN (NEW.status = 'COMPLETED')
    EXECUTE FUNCTION transfer_book_ownership_on_completion_simplified_033();

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION transfer_book_ownership_on_completion_simplified_033() TO authenticated;

-- Add comment explaining the simplified logic
COMMENT ON FUNCTION transfer_book_ownership_on_completion_simplified_033() 
IS 'Transfers book ownership when swap is completed without ownership validation checks that were causing issues';
