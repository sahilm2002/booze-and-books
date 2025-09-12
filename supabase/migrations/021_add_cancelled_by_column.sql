-- Add cancelled_by column to swap_requests table
-- This tracks who actually cancelled the swap request, avoiding auth.uid() issues

-- Add cancelled_by column to track who cancelled the swap
ALTER TABLE public.swap_requests 
ADD COLUMN cancelled_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Add index for performance on cancelled_by
CREATE INDEX idx_swap_requests_cancelled_by ON public.swap_requests(cancelled_by);

-- Add comment explaining the column
COMMENT ON COLUMN public.swap_requests.cancelled_by IS 'Tracks which user cancelled the swap request. NULL means not cancelled or cancellation source unknown.';