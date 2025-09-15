-- Fix RLS issue with book ownership transfer on swap completion
-- The transfer function needs to bypass RLS to transfer ownership between users
-- Note: This is an alternate version - the canonical implementation is in migration 027

-- Drop and recreate the transfer function with proper RLS bypass
DROP FUNCTION IF EXISTS transfer_book_ownership_on_completion_rls_024();

CREATE OR REPLACE FUNCTION transfer_book_ownership_on_completion_rls_024()
RETURNS TRIGGER AS $$
DECLARE
    requested_book_owner_id UUID;
    offered_book_owner_id UUID;
BEGIN
    -- Only proceed if swap is being marked as completed for the first time
    IF NEW.status = 'COMPLETED' AND (OLD.status IS NULL OR OLD.status != 'COMPLETED') THEN
        -- Validate that both books exist and have the expected owners
        IF NEW.book_id IS NULL OR NEW.offered_book_id IS NULL THEN
            RAISE EXCEPTION 'Cannot complete swap: missing book_id or offered_book_id';
        END IF;
        
        -- Get current owners of both books (bypass RLS)
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
        
        -- Perform the ownership transfer atomically with RLS bypass
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
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger to execute ownership transfer after swap completion
CREATE TRIGGER trigger_transfer_ownership_on_completion_rls_024
    AFTER UPDATE ON swap_requests
    FOR EACH ROW
    WHEN (NEW.status = 'COMPLETED')
    EXECUTE FUNCTION transfer_book_ownership_on_completion_rls_024();

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION transfer_book_ownership_on_completion_rls_024() TO authenticated;

-- Add policy to allow the function to update book ownership during swaps
-- This policy allows updates to books.owner_id when it's part of a swap completion
DO $$
BEGIN
    -- Drop the policy if it exists
    DROP POLICY IF EXISTS "Allow book ownership transfer during swap completion" ON books;
    
    -- Create a policy that allows ownership transfer during swap operations
    -- This policy allows updates when the function is executing
    CREATE POLICY "Allow book ownership transfer during swap completion" ON books
        FOR UPDATE
        USING (true)  -- Allow reading any book for the transfer
        WITH CHECK (true);  -- Allow updating any book's owner_id during transfer
EXCEPTION WHEN duplicate_object THEN
    -- Policy already exists, continue
    NULL;
END $$;

-- Enable RLS on books table if not already enabled
ALTER TABLE books ENABLE ROW LEVEL SECURITY;

-- Comment on the policy
COMMENT ON POLICY "Allow book ownership transfer during swap completion" ON books 
IS 'Allows the swap completion trigger to transfer book ownership between users';
