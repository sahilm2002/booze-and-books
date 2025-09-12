-- Migration 015: Add Counter Offer Functionality
-- This migration adds support for book counter-offers in swap requests

-- 1. First, drop ALL existing RLS policies on swap_requests table
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'swap_requests') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON swap_requests';
    END LOOP;
END $$;

-- 2. Update the swap_status enum by removing 'DECLINED' and adding 'COUNTER_OFFER'

-- Step 1: Convert column to text temporarily
ALTER TABLE swap_requests ALTER COLUMN status TYPE TEXT;

-- Step 2: Update any 'DECLINED' values to 'CANCELLED'
UPDATE swap_requests SET status = 'CANCELLED' WHERE status = 'DECLINED';

-- Step 3: Drop the old enum type
DROP TYPE swap_status;

-- Step 4: Create the new enum type
CREATE TYPE swap_status AS ENUM (
    'PENDING',
    'ACCEPTED', 
    'COUNTER_OFFER',
    'CANCELLED',
    'COMPLETED'
);

-- Step 5: Convert column back to the new enum type
ALTER TABLE swap_requests ALTER COLUMN status TYPE swap_status USING status::swap_status;

-- Step 6: Restore the default value
ALTER TABLE swap_requests ALTER COLUMN status SET DEFAULT 'PENDING'::swap_status;

-- 3. Add offered_book_id column to store the book that the requester is offering
ALTER TABLE swap_requests 
ADD COLUMN offered_book_id uuid REFERENCES books(id) ON DELETE CASCADE;

-- 4. Add counter_offered_book_id column to store the alternative book proposed by owner
ALTER TABLE swap_requests 
ADD COLUMN counter_offered_book_id uuid REFERENCES books(id) ON DELETE CASCADE;

-- 5. Create performance indexes for the new columns
CREATE INDEX IF NOT EXISTS idx_swap_requests_offered_book_id 
ON swap_requests(offered_book_id);

CREATE INDEX IF NOT EXISTS idx_swap_requests_counter_offered_book_id 
ON swap_requests(counter_offered_book_id);

-- 6. Update unique constraint to work with the new counter-offer system
-- Drop existing unique constraint first
ALTER TABLE swap_requests DROP CONSTRAINT IF EXISTS unique_pending_swap_request;

-- Add new unique constraint that prevents duplicate pending requests
-- but allows counter-offers and multiple requests for different books
CREATE UNIQUE INDEX unique_pending_swap_request_v2 
ON swap_requests(requester_id, book_id) 
WHERE status IN ('PENDING', 'COUNTER_OFFER');

-- 7. Recreate RLS policies with counter-offer support
CREATE POLICY "Users can view swap requests they are involved in" ON swap_requests
FOR SELECT USING (
    auth.uid() = requester_id OR 
    auth.uid() = owner_id
);

CREATE POLICY "Users can create swap requests" ON swap_requests
FOR INSERT WITH CHECK (
    auth.uid() = requester_id AND
    auth.uid() != owner_id AND
    -- Ensure offered book belongs to requester if provided
    (offered_book_id IS NULL OR 
     EXISTS (SELECT 1 FROM books WHERE id = offered_book_id AND owner_id = auth.uid()))
);

CREATE POLICY "Users can update their own swap requests" ON swap_requests
FOR UPDATE USING (
    -- Requesters can cancel their own requests
    (auth.uid() = requester_id AND status IN ('PENDING', 'COUNTER_OFFER')) OR
    -- Owners can accept, make counter-offers, or cancel requests for their books
    (auth.uid() = owner_id AND status IN ('PENDING', 'COUNTER_OFFER'))
) WITH CHECK (
    -- Requesters can only cancel or accept counter-offers
    (auth.uid() = requester_id AND (
        status = 'CANCELLED' OR 
        (status = 'ACCEPTED' AND OLD.status = 'COUNTER_OFFER')
    )) OR
    -- Owners can accept, counter-offer, or cancel
    (auth.uid() = owner_id AND (
        status IN ('ACCEPTED', 'COUNTER_OFFER', 'CANCELLED') OR
        -- Allow owners to complete swaps
        (status = 'COMPLETED' AND OLD.status = 'ACCEPTED')
    )) AND
    -- Ensure counter-offered book belongs to owner if provided
    (counter_offered_book_id IS NULL OR 
     EXISTS (SELECT 1 FROM books WHERE id = counter_offered_book_id AND owner_id = auth.uid()))
);

-- 8. Add comments for documentation
COMMENT ON COLUMN swap_requests.offered_book_id IS 'The book that the requester is offering in exchange (optional)';
COMMENT ON COLUMN swap_requests.counter_offered_book_id IS 'Alternative book proposed by owner when making a counter-offer (optional)';
COMMENT ON TYPE swap_status IS 'Status of swap request: PENDING (awaiting response), ACCEPTED (agreed), COUNTER_OFFER (owner proposes alternative), CANCELLED (rejected/cancelled), COMPLETED (swap finished)';

-- 9. Create a function to help exclude books involved in pending swaps from discovery
CREATE OR REPLACE FUNCTION get_books_in_pending_swaps()
RETURNS TABLE(book_id uuid)
LANGUAGE sql
STABLE
AS $$
    SELECT DISTINCT book_id FROM swap_requests 
    WHERE status IN ('PENDING', 'COUNTER_OFFER', 'ACCEPTED')
    UNION
    SELECT DISTINCT offered_book_id FROM swap_requests 
    WHERE offered_book_id IS NOT NULL AND status IN ('PENDING', 'COUNTER_OFFER', 'ACCEPTED')
    UNION
    SELECT DISTINCT counter_offered_book_id FROM swap_requests 
    WHERE counter_offered_book_id IS NOT NULL AND status IN ('PENDING', 'COUNTER_OFFER', 'ACCEPTED');
$$;

COMMENT ON FUNCTION get_books_in_pending_swaps() IS 'Returns all book IDs that are currently involved in pending, counter-offer, or accepted swap requests';