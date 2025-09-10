-- Update book condition enum values
-- Change AS_NEW to LIKE_NEW and remove FINE

-- First, update any existing books with AS_NEW to LIKE_NEW
UPDATE books SET condition = 'LIKE_NEW' WHERE condition = 'AS_NEW';

-- Update any existing books with FINE to VERY_GOOD (closest equivalent)
UPDATE books SET condition = 'VERY_GOOD' WHERE condition = 'FINE';

-- Drop the old check constraint
ALTER TABLE books DROP CONSTRAINT IF EXISTS books_condition_check;

-- Add new check constraint with updated values
ALTER TABLE books 
ADD CONSTRAINT books_condition_check 
CHECK (condition IN ('LIKE_NEW', 'VERY_GOOD', 'GOOD', 'FAIR', 'POOR'));