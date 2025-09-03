-- Add is_available field to books table for swap functionality
-- This field controls whether a book is available for swap requests

ALTER TABLE books ADD COLUMN is_available BOOLEAN DEFAULT true;

-- Create index for better query performance when filtering available books
CREATE INDEX idx_books_is_available ON books(is_available);

-- Create composite index for discovery queries (available books from other users)
CREATE INDEX idx_books_available_owner ON books(is_available, owner_id);

-- Add comment explaining the field's purpose
COMMENT ON COLUMN books.is_available IS 'Controls whether a book is available for swap requests';