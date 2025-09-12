-- Enhancement to transfer_book_ownership_on_completion function
-- Adds automatic availability management when swaps complete
-- Books are marked as unavailable after transfer to prevent immediate re-swapping

CREATE OR REPLACE FUNCTION transfer_book_ownership_on_completion()
RETURNS TRIGGER AS $$
DECLARE
  book_to_transfer_id UUID;
  updated_count int;
BEGIN
  PERFORM set_config('search_path', 'pg_catalog,public', true);
  -- Only process when status changes to 'COMPLETED'
  IF NEW.status = 'COMPLETED' AND (OLD.status IS NULL OR OLD.status <> 'COMPLETED') THEN
    
    -- Determine which book to transfer (counter-offered book takes precedence over originally offered book)
    book_to_transfer_id := COALESCE(NEW.counter_offered_book_id, NEW.offered_book_id);
    
    -- Validate that requested and offered books are different
    IF NEW.book_id = book_to_transfer_id THEN
      RAISE EXCEPTION 'Cannot swap identical books: requested book % and offered book % are the same', NEW.book_id, book_to_transfer_id;
    END IF;
    
    -- Validate that we have a book to transfer
    IF book_to_transfer_id IS NULL THEN
      RAISE EXCEPTION 'No book to transfer found in swap request';
    END IF;
    
    RAISE NOTICE 'Starting book ownership transfer for swap %: book % to user %, book % to user %', 
      NEW.id, NEW.book_id, NEW.requester_id, book_to_transfer_id, NEW.owner_id;
    
    -- Set session variable to bypass RLS for ownership transfers
    PERFORM set_config('swap_transfer_mode', 'true', true);
    
    BEGIN
      -- Transfer the requested book to requester and mark as unavailable
      UPDATE books 
      SET owner_id = NEW.requester_id, 
          is_available = false,
          updated_at = now()
      WHERE id = NEW.book_id 
        AND owner_id = NEW.owner_id;
      
      GET DIAGNOSTICS updated_count = ROW_COUNT;
      IF updated_count != 1 THEN
        RAISE EXCEPTION 'Failed to transfer requested book %: expected 1 row updated, got %', NEW.book_id, updated_count;
      END IF;
      
      -- Transfer the offered/counter-offered book to owner and mark as unavailable  
      UPDATE books 
      SET owner_id = NEW.owner_id,
          is_available = false,
          updated_at = now()
      WHERE id = book_to_transfer_id
        AND owner_id = NEW.requester_id;
      
      GET DIAGNOSTICS updated_count = ROW_COUNT;
      IF updated_count != 1 THEN
        RAISE EXCEPTION 'Failed to transfer offered book %: expected 1 row updated, got %', book_to_transfer_id, updated_count;
      END IF;
      
      -- Reset session variable on success
      PERFORM set_config('swap_transfer_mode', 'false', true);
      
    EXCEPTION WHEN OTHERS THEN
      -- Reset session variable on exception
      PERFORM set_config('swap_transfer_mode', 'false', true);
      RAISE;
    END;
    
    RAISE NOTICE 'Book ownership transfer completed for swap %: both books marked as unavailable for new swaps', NEW.id;
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;