-- Fix book condition constraint that's causing book creation to fail
-- The constraint is too restrictive or has wrong values

-- First, let's see what the current constraint allows
-- Then update it to match the actual BookCondition enum values

-- Drop the existing constraint
ALTER TABLE books DROP CONSTRAINT IF EXISTS books_condition_check;

-- Add the correct constraint with proper condition values
-- These should match the BookCondition enum in your TypeScript code
ALTER TABLE books ADD CONSTRAINT books_condition_check 
CHECK (condition IN ('LIKE_NEW', 'VERY_GOOD', 'GOOD', 'FAIR', 'POOR'));

-- Also ensure is_available has a default value
ALTER TABLE books ALTER COLUMN is_available SET DEFAULT true;

-- Verify the fix
SELECT 'Book condition constraint fixed successfully' as status;
