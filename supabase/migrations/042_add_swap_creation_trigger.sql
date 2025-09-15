-- Add trigger to automatically mark books as unavailable when swap requests are created
-- This replaces the complex function approach with a simple, clean trigger

-- Create function to mark books unavailable when swap is created
CREATE OR REPLACE FUNCTION mark_books_unavailable_on_swap_creation()
RETURNS TRIGGER AS $$
BEGIN
    -- Mark the requested book as unavailable
    UPDATE books 
    SET is_available = false, updated_at = NOW()
    WHERE id = NEW.book_id;
    
    -- Mark the offered book as unavailable (if provided)
    IF NEW.offered_book_id IS NOT NULL THEN
        UPDATE books 
        SET is_available = false, updated_at = NOW()
        WHERE id = NEW.offered_book_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically mark books unavailable when swap requests are created
DROP TRIGGER IF EXISTS mark_books_unavailable_trigger ON swap_requests;
CREATE TRIGGER mark_books_unavailable_trigger
    AFTER INSERT ON swap_requests
    FOR EACH ROW
    EXECUTE FUNCTION mark_books_unavailable_on_swap_creation();

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION mark_books_unavailable_on_swap_creation() TO authenticated;

-- Add comment
COMMENT ON FUNCTION mark_books_unavailable_on_swap_creation() 
IS 'Automatically marks books as unavailable when swap requests are created';

-- Verify the trigger was created
SELECT 'Swap creation trigger created successfully' as status;
