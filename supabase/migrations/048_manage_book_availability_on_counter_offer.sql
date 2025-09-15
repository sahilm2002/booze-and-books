-- Manage book availability when counter-offers are created
-- When a counter-offer is made:
-- 1. The original offered book should become available again (is_available = true)
-- 2. The new counter-offered book should become unavailable (is_available = false)

-- Create function to manage book availability on counter-offers
CREATE OR REPLACE FUNCTION manage_book_availability_on_counter_offer()
RETURNS TRIGGER AS $$
BEGIN
    -- Only process when a counter-offer is being created (status changes to COUNTER_OFFER)
    IF NEW.status = 'COUNTER_OFFER' AND OLD.status != 'COUNTER_OFFER' THEN
        
        -- Make the original offered book available again (if it exists)
        IF OLD.offered_book_id IS NOT NULL THEN
            UPDATE books 
            SET is_available = true 
            WHERE id = OLD.offered_book_id;
            
            RAISE NOTICE 'Made original offered book % available again', OLD.offered_book_id;
        END IF;
        
        -- Make the new counter-offered book unavailable
        IF NEW.counter_offered_book_id IS NOT NULL THEN
            UPDATE books 
            SET is_available = false 
            WHERE id = NEW.counter_offered_book_id;
            
            RAISE NOTICE 'Made counter-offered book % unavailable', NEW.counter_offered_book_id;
        END IF;
        
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for counter-offer book availability management
DROP TRIGGER IF EXISTS trigger_manage_book_availability_on_counter_offer ON swap_requests;
CREATE TRIGGER trigger_manage_book_availability_on_counter_offer
    AFTER UPDATE ON swap_requests
    FOR EACH ROW
    EXECUTE FUNCTION manage_book_availability_on_counter_offer();

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION manage_book_availability_on_counter_offer() TO authenticated;

-- Comment explaining the function
COMMENT ON FUNCTION manage_book_availability_on_counter_offer() 
IS 'Manages book availability when counter-offers are created: makes original offered book available again and makes counter-offered book unavailable';

-- Verify the function was created successfully
SELECT 'Counter-offer book availability management trigger created successfully' as status;
