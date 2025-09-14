-- Fix potential RLS context issues in swap completion trigger

DROP FUNCTION IF EXISTS transfer_book_ownership_on_completion() CASCADE;

CREATE OR REPLACE FUNCTION transfer_book_ownership_on_completion()
RETURNS TRIGGER AS $$
DECLARE
    current_requested_book_owner UUID;
    current_offered_book_owner UUID;
    book_exists_check INTEGER;
    offered_book_exists_check INTEGER;
BEGIN
    -- Only proceed if swap is being marked as completed for the first time
    IF NEW.status = 'COMPLETED' AND (OLD.status IS NULL OR OLD.status != 'COMPLETED') THEN        
        -- Validate that both books exist
        IF NEW.book_id IS NULL OR NEW.offered_book_id IS NULL THEN
            RAISE EXCEPTION 'Cannot complete swap: missing book_id or offered_book_id';
        END IF;
        
        -- Check if books exist first (with explicit count to avoid RLS issues)
        SELECT COUNT(*) INTO book_exists_check FROM books WHERE id = NEW.book_id;
        SELECT COUNT(*) INTO offered_book_exists_check FROM books WHERE id = NEW.offered_book_id;
        
        IF book_exists_check = 0 THEN
            RAISE EXCEPTION 'Cannot complete swap: requested book % not found', NEW.book_id;
        END IF;
        
        IF offered_book_exists_check = 0 THEN
            RAISE EXCEPTION 'Cannot complete swap: offered book % not found', NEW.offered_book_id;
        END IF;
        
        -- Get current owners using a more explicit query to bypass potential RLS issues
        -- Use the superuser context of SECURITY DEFINER to see all rows
        PERFORM set_config('role', 'postgres', true);
        
        SELECT owner_id INTO current_requested_book_owner 
        FROM books WHERE id = NEW.book_id LIMIT 1;
        
        SELECT owner_id INTO current_offered_book_owner 
        FROM books WHERE id = NEW.offered_book_id LIMIT 1;
        
        -- Reset to original role
        PERFORM set_config('role', 'authenticated', true);
        
        -- Validate current ownership matches the swap agreement
        IF current_requested_book_owner != NEW.owner_id THEN
            RAISE EXCEPTION 'Cannot complete swap: requested book % is owned by % but swap expects % (owner_id)', 
                NEW.book_id, current_requested_book_owner, NEW.owner_id;
        END IF;
        
        IF current_offered_book_owner != NEW.requester_id THEN
            RAISE EXCEPTION 'Cannot complete swap: offered book % is owned by % but swap expects % (requester_id)', 
                NEW.offered_book_id, current_offered_book_owner, NEW.requester_id;
        END IF;
        
        -- Perform the ownership transfer atomically
        -- Use explicit role to ensure we can update all books
        PERFORM set_config('role', 'postgres', true);
        
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
        
        -- Reset role
        PERFORM set_config('role', 'authenticated', true);
        
        RAISE NOTICE 'Successfully completed swap % with book ownership transfer', NEW.id;
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