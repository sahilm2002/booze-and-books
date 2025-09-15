-- Create trigger to automatically populate owner_id from book_id
-- This ensures the database is the single source of truth for owner_id

-- Create function to populate owner_id from book_id
CREATE OR REPLACE FUNCTION public.populate_swap_request_owner_id()
RETURNS TRIGGER AS $$
BEGIN
    -- Only populate owner_id if it's NULL or if book_id has changed (on UPDATE)
    IF NEW.owner_id IS NULL OR 
       (TG_OP = 'UPDATE' AND NEW.book_id IS DISTINCT FROM OLD.book_id) THEN
        
        -- Get the owner_id from the books table
        SELECT owner_id INTO NEW.owner_id
        FROM public.books
        WHERE id = NEW.book_id;
        
        -- If book not found, the foreign key constraint will handle the error
        -- This just ensures owner_id is always populated correctly
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists for idempotency
DROP TRIGGER IF EXISTS trigger_populate_swap_request_owner_id ON public.swap_requests;

-- Create trigger that runs before INSERT or UPDATE
CREATE TRIGGER trigger_populate_swap_request_owner_id
    BEFORE INSERT OR UPDATE ON public.swap_requests
    FOR EACH ROW
    EXECUTE FUNCTION public.populate_swap_request_owner_id();

-- Add comment explaining the trigger
COMMENT ON FUNCTION public.populate_swap_request_owner_id() IS 'Automatically populates owner_id from the books table based on book_id to ensure data consistency. Runs on INSERT when owner_id is NULL or on UPDATE when book_id changes.';