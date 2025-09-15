-- Fix swap completion to only mark as COMPLETED when BOTH parties complete
-- The current trigger marks as completed when either party completes, which is wrong

-- Drop the incorrect trigger
DROP TRIGGER IF EXISTS trigger_check_and_complete_swap ON swap_requests;
DROP FUNCTION IF EXISTS check_and_complete_swap();

-- Create correct function that only completes when BOTH parties are done
CREATE OR REPLACE FUNCTION check_and_complete_swap_both_parties()
RETURNS TRIGGER AS $$
BEGIN
    -- Only check if this is an update to completion fields and status is still ACCEPTED
    IF NEW.status = 'ACCEPTED' AND OLD.status = 'ACCEPTED' THEN
        
        -- Check if BOTH parties have now completed
        IF NEW.requester_completed_at IS NOT NULL AND NEW.owner_completed_at IS NOT NULL THEN
            -- Both parties completed - mark swap as COMPLETED
            NEW.status = 'COMPLETED';
            NEW.completed_at = GREATEST(NEW.requester_completed_at, NEW.owner_completed_at);
            
            RAISE NOTICE 'Swap % marked as COMPLETED - both parties finished', NEW.id;
        ELSE
            -- Only one party completed - keep status as ACCEPTED
            RAISE NOTICE 'Swap % - one party completed, waiting for other party', NEW.id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the corrected trigger
CREATE TRIGGER trigger_check_and_complete_swap_both_parties
    BEFORE UPDATE ON swap_requests
    FOR EACH ROW
    EXECUTE FUNCTION check_and_complete_swap_both_parties();

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION check_and_complete_swap_both_parties() TO authenticated;

-- Comment explaining the corrected logic
COMMENT ON FUNCTION check_and_complete_swap_both_parties() 
IS 'Marks swap as COMPLETED only when BOTH parties have completed their part of the swap';

-- Verify the function was created successfully
SELECT 'Corrected swap completion trigger created - requires both parties' as status;
