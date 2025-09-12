-- Fix counter-offer handling in book ownership transfer function
-- This migration addresses the critical flaw where counter-offers don't transfer the correct books

-- Drop the existing function to recreate it with counter-offer support
DROP FUNCTION IF EXISTS transfer_book_ownership_on_completion();

-- Create updated function that properly handles both regular swaps and counter-offers
CREATE OR REPLACE FUNCTION transfer_book_ownership_on_completion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    book_to_transfer_id UUID;
BEGIN
    PERFORM set_config('search_path', 'pg_catalog,public', true);
    
    -- Only proceed if swap is being completed
    IF NEW.status = 'COMPLETED' AND OLD.status != 'COMPLETED' THEN
        
        -- Validate that we have either an offered_book_id or counter_offered_book_id
        IF (NEW.offered_book_id IS NULL AND NEW.counter_offered_book_id IS NULL) THEN
            RAISE EXCEPTION 'Cannot complete swap: no book offered (both offered_book_id and counter_offered_book_id are null)';
        END IF;

        -- Validate that requested book exists
        IF NEW.book_id IS NULL THEN
            RAISE EXCEPTION 'Cannot complete swap: book_id is null';
        END IF;

        -- Determine which book to transfer from requester to owner
        -- If counter-offer exists, use counter_offered_book_id, otherwise use offered_book_id
        book_to_transfer_id := COALESCE(NEW.counter_offered_book_id, NEW.offered_book_id);

        -- Validate that the requested book and offered/counter-offered book are different
        IF NEW.book_id = book_to_transfer_id THEN
            RAISE EXCEPTION 'Invalid swap: requested_book (%) and offered/counter-offered_book (%) cannot be the same',
                            NEW.book_id, book_to_transfer_id;
        END IF;

        -- Set session variable to bypass RLS during ownership transfer
        PERFORM set_config('swap_transfer_mode', 'true', true);

        -- Log the transfer details for debugging
        IF NEW.counter_offered_book_id IS NOT NULL THEN
            RAISE NOTICE 'Processing counter-offer swap completion: requested_book=%, counter_offered_book=%, offered_book=%', 
                NEW.book_id, NEW.counter_offered_book_id, NEW.offered_book_id;
        ELSE
            RAISE NOTICE 'Processing regular swap completion: requested_book=%, offered_book=%', 
                NEW.book_id, NEW.offered_book_id;
        END IF;

        DECLARE
            updated_count int;
        BEGIN
            -- Transfer requested book: owner -> requester
            UPDATE books
            SET owner_id = NEW.requester_id
            WHERE id = NEW.book_id AND owner_id = NEW.owner_id;
            GET DIAGNOSTICS updated_count = ROW_COUNT;
            IF updated_count <> 1 THEN
                RAISE EXCEPTION 'Requested book % not owned by expected owner % or missing', NEW.book_id, NEW.owner_id;
            END IF;

            -- Transfer offered/counter-offered: requester -> owner
            UPDATE books
            SET owner_id = NEW.owner_id
            WHERE id = book_to_transfer_id AND owner_id = NEW.requester_id;
            GET DIAGNOSTICS updated_count = ROW_COUNT;
            IF updated_count <> 1 THEN
                RAISE EXCEPTION 'Offered/counter-offered book % not owned by requester % or missing', book_to_transfer_id, NEW.requester_id;
            END IF;

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
$$;

-- Recreate the trigger
DROP TRIGGER IF EXISTS trigger_transfer_book_ownership_on_completion ON swap_requests;

CREATE TRIGGER trigger_transfer_book_ownership_on_completion
AFTER UPDATE ON swap_requests
FOR EACH ROW
WHEN (NEW.status = 'COMPLETED' AND (OLD.status IS NULL OR OLD.status <> 'COMPLETED'))
EXECUTE FUNCTION transfer_book_ownership_on_completion();