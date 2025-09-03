-- Add completion functionality to swap_requests table

-- First, add COMPLETED to the existing swap_status enum
ALTER TYPE swap_status ADD VALUE 'COMPLETED';

-- Add completion-related columns to swap_requests table
ALTER TABLE swap_requests 
ADD COLUMN completion_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN requester_rating INTEGER CHECK (requester_rating >= 1 AND requester_rating <= 5),
ADD COLUMN owner_rating INTEGER CHECK (owner_rating >= 1 AND owner_rating <= 5),
ADD COLUMN requester_feedback TEXT,
ADD COLUMN owner_feedback TEXT;

-- Create indexes for completion queries
CREATE INDEX idx_swap_requests_completion_date ON swap_requests(completion_date);
CREATE INDEX idx_swap_requests_requester_rating ON swap_requests(requester_rating);
CREATE INDEX idx_swap_requests_owner_rating ON swap_requests(owner_rating);

-- Create composite index for rating statistics
CREATE INDEX idx_swap_requests_completed_ratings ON swap_requests(status, requester_rating, owner_rating) 
WHERE status = 'COMPLETED';

-- Create index for completion rate calculations
CREATE INDEX idx_swap_requests_user_completion_stats ON swap_requests(requester_id, owner_id, status);

-- Update RLS policies to allow completion updates

-- Drop the existing update policy
DROP POLICY IF EXISTS "Users can update swap request status" ON swap_requests;

-- Create new update policy that handles completion
CREATE POLICY "Users can update swap request status and completion" ON swap_requests
    FOR UPDATE USING (
        -- Owner can update their requests when pending
        (auth.uid() = owner_id AND status = 'PENDING')
        OR
        -- Requester can update their requests when pending
        (auth.uid() = requester_id AND status = 'PENDING')
        OR
        -- Both parties can mark as completed when accepted or add missing rating when completed
        ((auth.uid() = owner_id OR auth.uid() = requester_id) AND status IN ('ACCEPTED', 'COMPLETED'))
    )
    WITH CHECK (
        -- Owner can only accept/decline when pending
        (auth.uid() = owner_id AND status = 'PENDING' AND NEW.status IN ('ACCEPTED', 'DECLINED'))
        OR
        -- Requester can only cancel when pending
        (auth.uid() = requester_id AND status = 'PENDING' AND NEW.status = 'CANCELLED')
        OR
        -- Both parties can mark as completed when accepted (with ratings)
        ((auth.uid() = owner_id OR auth.uid() = requester_id) 
         AND status = 'ACCEPTED' 
         AND NEW.status = 'COMPLETED'
         AND NEW.completion_date IS NOT NULL
         -- Ensure rating is provided by the user making the update
         AND (
             (auth.uid() = requester_id AND NEW.requester_rating BETWEEN 1 AND 5)
             OR
             (auth.uid() = owner_id AND NEW.owner_rating BETWEEN 1 AND 5)
         ))
        OR
        -- Allow adding missing rating to already completed swap without changing status
        ((auth.uid() = owner_id OR auth.uid() = requester_id)
         AND status = 'COMPLETED'
         AND NEW.status = 'COMPLETED'
         -- User can only add their own rating if it's missing
         AND (
             (auth.uid() = requester_id AND requester_rating IS NULL AND NEW.requester_rating BETWEEN 1 AND 5)
             OR
             (auth.uid() = owner_id AND owner_rating IS NULL AND NEW.owner_rating BETWEEN 1 AND 5)
         ))
    );

-- Create function to automatically set completion_date when status changes to COMPLETED
CREATE OR REPLACE FUNCTION set_completion_date()
RETURNS TRIGGER AS $$
BEGIN
    -- If status is being changed to COMPLETED and completion_date is not set
    IF NEW.status = 'COMPLETED' AND OLD.status != 'COMPLETED' AND NEW.completion_date IS NULL THEN
        NEW.completion_date = now();
    END IF;
    
    -- Update the updated_at timestamp
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for completion date
CREATE TRIGGER trigger_set_completion_date
    BEFORE UPDATE ON swap_requests
    FOR EACH ROW
    EXECUTE FUNCTION set_completion_date();

-- Create function to get user completion statistics
CREATE OR REPLACE FUNCTION get_user_completion_stats(user_id UUID)
RETURNS TABLE (
    total_completed BIGINT,
    average_rating NUMERIC,
    completion_rate NUMERIC,
    total_swaps BIGINT
) AS $$
BEGIN
    RETURN QUERY
    WITH user_swaps AS (
        SELECT 
            sr.*,
            CASE 
                WHEN sr.requester_id = user_id THEN sr.owner_rating
                ELSE sr.requester_rating
            END as user_rating
        FROM swap_requests sr
        WHERE sr.requester_id = user_id OR sr.owner_id = user_id
    ),
    completion_stats AS (
        SELECT 
            COUNT(*) FILTER (WHERE status = 'COMPLETED') as completed_count,
            COUNT(*) as total_count,
            AVG(user_rating) FILTER (WHERE status = 'COMPLETED' AND user_rating IS NOT NULL) as avg_rating
        FROM user_swaps
    )
    SELECT 
        completed_count,
        COALESCE(avg_rating, 0),
        CASE 
            WHEN total_count > 0 THEN (completed_count::NUMERIC / total_count::NUMERIC) * 100
            ELSE 0
        END,
        total_count
    FROM completion_stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_user_completion_stats(UUID) TO authenticated;

-- Add comments for the new columns
COMMENT ON COLUMN swap_requests.completion_date IS 'Timestamp when swap was marked as completed';
COMMENT ON COLUMN swap_requests.requester_rating IS 'Rating given by requester (1-5 stars)';
COMMENT ON COLUMN swap_requests.owner_rating IS 'Rating given by owner (1-5 stars)';
COMMENT ON COLUMN swap_requests.requester_feedback IS 'Optional feedback from requester';
COMMENT ON COLUMN swap_requests.owner_feedback IS 'Optional feedback from owner';