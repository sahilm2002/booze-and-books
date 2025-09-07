-- Create trigger to automatically populate owner_id from book_id
-- This ensures the database is the single source of truth for owner_id

-- Create function to populate owner_id from book_id
CREATE OR REPLACE FUNCTION public.populate_swap_request_owner_id()
RETURNS TRIGGER AS $$
DECLARE
BEGIN
    -- Set search_path to public for safety
    PERFORM set_config('search_path', 'public', true);
    -- Get the owner_id from the books table, fail fast if not found
    BEGIN
        SELECT owner_id INTO STRICT NEW.owner_id
        FROM public.books
        WHERE id = NEW.book_id;
    EXCEPTION WHEN NO_DATA_FOUND THEN
        RAISE EXCEPTION 'Book with id % not found when populating owner_id for swap_requests', NEW.book_id;
    END;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists for idempotency
DROP TRIGGER IF EXISTS trigger_populate_swap_request_owner_id ON public.swap_requests;

-- Create trigger that runs before INSERT or UPDATE with conditional execution
CREATE TRIGGER trigger_populate_swap_request_owner_id
    BEFORE INSERT OR UPDATE ON public.swap_requests
    FOR EACH ROW
    WHEN (
        NEW.owner_id IS NULL OR 
        (TG_OP = 'UPDATE' AND NEW.book_id IS DISTINCT FROM OLD.book_id)
    )
    EXECUTE FUNCTION public.populate_swap_request_owner_id();

-- Add comment explaining the trigger
COMMENT ON FUNCTION public.populate_swap_request_owner_id() IS 'Automatically populates owner_id from the books table based on book_id to ensure data consistency. Runs on INSERT when owner_id is NULL or on UPDATE when book_id changes.';