-- Fix RLS policy conflict that prevents book ownership transfer during swap completion
-- The issue: Two UPDATE policies on books table create an AND condition that blocks transfers
-- Solution: Use session variable to allow trigger to bypass RLS during legitimate swap transfers

-- Drop the conflicting policy added in migration 024
DROP POLICY IF EXISTS "Allow book ownership transfer during swap completion" ON books;

-- Update the existing RLS policy to allow transfers when session variable is set
DROP POLICY IF EXISTS "Users can update own books" ON books;

CREATE POLICY "Users can update own books" ON books
FOR UPDATE
USING (
  auth.uid() = owner_id OR 
  (pg_trigger_depth() > 0 AND COALESCE(current_setting('swap_transfer_mode', true), 'false') = 'true')
)
WITH CHECK (
  auth.uid() = owner_id OR 
  (pg_trigger_depth() > 0 AND COALESCE(current_setting('swap_transfer_mode', true), 'false') = 'true')
);

-- Update the trigger function to set session variable before transfers
CREATE OR REPLACE FUNCTION transfer_book_ownership_on_completion()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM set_config('search_path', 'pg_catalog,public', true);
  
  -- Only proceed if swap is being completed
  IF NEW.status = 'COMPLETED' AND OLD.status != 'COMPLETED' THEN
    -- Set session variable to bypass RLS during ownership transfer
    PERFORM set_config('swap_transfer_mode', 'true', true);
    
    BEGIN
      -- Transfer ownership of both books
      UPDATE books 
      SET owner_id = NEW.requester_id 
      WHERE id = NEW.book_id;
      
      UPDATE books 
      SET owner_id = NEW.owner_id 
      WHERE id = NEW.offered_book_id;
      
      -- Reset session variable after successful transfers
      PERFORM set_config('swap_transfer_mode', 'false', true);
      
    EXCEPTION
      WHEN OTHERS THEN
        -- Ensure session variable is reset even on error
        PERFORM set_config('swap_transfer_mode', 'false', true);
        RAISE;
    END;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;