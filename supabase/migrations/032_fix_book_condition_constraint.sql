-- Fix book condition constraint to ensure LIKE_NEW is accepted
-- This addresses the issue where LIKE_NEW condition fails the check constraint

-- First drop the existing constraint if it exists
ALTER TABLE books DROP CONSTRAINT IF EXISTS books_condition_check;

-- Add the correct constraint with proper condition values
ALTER TABLE books 
ADD CONSTRAINT books_condition_check 
CHECK (condition IN ('LIKE_NEW', 'VERY_GOOD', 'GOOD', 'FAIR', 'POOR'));

-- Add comment to track this fix
COMMENT ON CONSTRAINT books_condition_check ON books 
IS 'Ensures book condition values match the BookCondition enum: LIKE_NEW, VERY_GOOD, GOOD, FAIR, POOR';