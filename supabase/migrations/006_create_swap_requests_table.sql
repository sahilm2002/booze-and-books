-- Create swap_requests table for managing book swap requests

-- Create enum for swap request status
CREATE TYPE swap_status AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'CANCELLED');

-- Create swap_requests table
CREATE TABLE swap_requests (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    requester_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status swap_status DEFAULT 'PENDING' NOT NULL,
    message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create indexes for performance
CREATE INDEX idx_swap_requests_book_id ON swap_requests(book_id);
CREATE INDEX idx_swap_requests_requester_id ON swap_requests(requester_id);
CREATE INDEX idx_swap_requests_owner_id ON swap_requests(owner_id);
CREATE INDEX idx_swap_requests_status ON swap_requests(status);
CREATE INDEX idx_swap_requests_created_at ON swap_requests(created_at);

-- Create composite indexes for common queries
CREATE INDEX idx_swap_requests_requester_status ON swap_requests(requester_id, status);
CREATE INDEX idx_swap_requests_owner_status ON swap_requests(owner_id, status);

-- Add unique constraint to prevent duplicate pending requests for the same book by the same user
CREATE UNIQUE INDEX idx_swap_requests_unique_pending 
ON swap_requests(book_id, requester_id) 
WHERE status = 'PENDING';

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_swap_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_swap_requests_updated_at
    BEFORE UPDATE ON swap_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_swap_requests_updated_at();

-- Enable RLS
ALTER TABLE swap_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Users can select their own requests (as requester OR owner)
CREATE POLICY "Users can view their own swap requests" ON swap_requests
    FOR SELECT USING (
        auth.uid() = requester_id OR auth.uid() = owner_id
    );

-- Only requester can insert new swap requests
CREATE POLICY "Users can create swap requests" ON swap_requests
    FOR INSERT WITH CHECK (
        auth.uid() = requester_id
        -- Ensure user is not requesting their own book
        AND requester_id != owner_id
        -- Ensure the book exists and is available
        AND EXISTS (
            SELECT 1 FROM books 
            WHERE books.id = book_id 
            AND books.is_available = true
            AND books.owner_id != auth.uid()
        )
    );

-- Only owner can update status to ACCEPTED/DECLINED
-- Only requester can update status to CANCELLED
CREATE POLICY "Users can update swap request status" ON swap_requests
    FOR UPDATE USING (
        -- Owner can update their requests
        (auth.uid() = owner_id AND status = 'PENDING')
        OR
        -- Requester can update their requests
        (auth.uid() = requester_id AND status = 'PENDING')
    );

-- Add comments
COMMENT ON TABLE swap_requests IS 'Stores book swap requests between users';
COMMENT ON COLUMN swap_requests.message IS 'Optional message from requester to book owner';
