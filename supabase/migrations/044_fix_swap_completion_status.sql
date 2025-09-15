-- Fix swap completion status - ensure status changes to COMPLETED when user marks swap as complete
-- The current system only updates individual completion fields but doesn't change status

-- Create function to check if swap should be marked as completed
CREATE OR REPLACE FUNCTION check_and_complete_swap()
RETURNS TRIGGER AS $$
BEGIN
    -- If this is an update to completion fields, check if swap should be marked as completed
    IF (NEW.requester_completed_at IS NOT NULL OR NEW.owner_completed_at IS NOT NULL) 
       AND NEW.status = 'ACCEPTED' THEN
        
        -- For now, mark as completed when either party completes
        -- (This matches the current UI expectation)
        NEW.status = 'COMPLETED';
        NEW.completed_at = COALESCE(NEW.requester_completed_at, NEW.owner_completed_at);
        
        RAISE NOTICE 'Swap % marked as COMPLETED', NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update swap status
DROP TRIGGER IF EXISTS trigger_check_and_complete_swap ON swap_requests;
CREATE TRIGGER trigger_check_and_complete_swap
    BEFORE UPDATE ON swap_requests
    FOR EACH ROW
    EXECUTE FUNCTION check_and_complete_swap();

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION check_and_complete_swap() TO authenticated;

-- Comment explaining the function
COMMENT ON FUNCTION check_and_complete_swap() 
IS 'Automatically marks swap as COMPLETED when a party marks it as complete';

-- Verify the function was created successfully
SELECT 'Swap completion status trigger created successfully' as status;
