-- Add offered_book_id column to swap_requests table
-- This allows users to specify which book they are offering in exchange

-- Add the offered_book_id column (nullable since not all swap requests need to specify a book)
ALTER TABLE swap_requests 
ADD COLUMN offered_book_id UUID REFERENCES books(id) ON DELETE SET NULL;

-- Create index for performance
CREATE INDEX idx_swap_requests_offered_book_id ON swap_requests(offered_book_id);

-- Add comment
COMMENT ON COLUMN swap_requests.offered_book_id IS 'Optional book that the requester is offering in exchange';

-- Update RLS policy to ensure offered book belongs to requester if provided
DROP POLICY IF EXISTS "Users can create swap requests" ON swap_requests;

CREATE POLICY "Users can create swap requests" ON swap_requests
    FOR INSERT WITH CHECK (
        auth.uid() = requester_id
        -- Ensure user is not requesting their own book
        AND requester_id != owner_id
        -- Ensure the requested book exists and is available
        AND EXISTS (
            SELECT 1 FROM books 
            WHERE books.id = book_id 
            AND books.is_available = true
            AND books.owner_id != auth.uid()
        )
        -- If offered_book_id is provided, ensure it belongs to the requester and is available
        AND (
            offered_book_id IS NULL
            OR EXISTS (
                SELECT 1 FROM books 
                WHERE books.id = offered_book_id 
                AND books.owner_id = auth.uid()
                AND books.is_available = true
            )
        )
    );