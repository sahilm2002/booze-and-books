-- Create trigger to automatically populate owner_id from book_id
-- This ensures the database is the single source of truth for owner_id

-- Create function to populate owner_id from book_id
CREATE OR REPLACE FUNCTION populate_swap_request_owner_id()
RETURNS TRIGGER AS $$
BEGIN
    -- Get the owner_id from the books table
    SELECT owner_id INTO NEW.owner_id
    FROM books
    WHERE id = NEW.book_id;
    
    -- If book not found, the foreign key constraint will handle the error
    -- This just ensures owner_id is always populated correctly
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger that runs before INSERT
CREATE TRIGGER trigger_populate_swap_request_owner_id
    BEFORE INSERT ON swap_requests
    FOR EACH ROW
    EXECUTE FUNCTION populate_swap_request_owner_id();

-- Add comment explaining the trigger
COMMENT ON FUNCTION populate_swap_request_owner_id() IS 'Automatically populates owner_id from the books table based on book_id to ensure data consistency';