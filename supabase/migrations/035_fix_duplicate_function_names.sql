-- Fix duplicate function/trigger names from previous migrations
-- This migration resolves conflicts where multiple migrations created the same function names
-- NOTE: The canonical implementation is in migration 027_fix_swap_completion_for_both_parties.sql

-- Drop any conflicting triggers that might interfere with the canonical implementation
DROP TRIGGER IF EXISTS trigger_transfer_book_ownership_on_completion ON swap_requests;
DROP TRIGGER IF EXISTS trigger_validate_swap_completion ON swap_requests;

-- Drop any conflicting functions that might interfere with the canonical implementation
DROP FUNCTION IF EXISTS validate_swap_completion();

-- Ensure the canonical function and trigger from migration 027 are preserved
-- (Migration 027 creates transfer_book_ownership_on_completion() and trigger_transfer_ownership_on_completion)
-- This migration only cleans up conflicts without recreating the canonical implementation

-- Verify that the canonical function exists (it should be created by migration 027)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_proc p 
        JOIN pg_namespace n ON p.pronamespace = n.oid 
        WHERE n.nspname = 'public' AND p.proname = 'transfer_book_ownership_on_completion'
    ) THEN
        RAISE EXCEPTION 'Canonical function transfer_book_ownership_on_completion() not found. Migration 027 must run before this migration.';
    END IF;
END $$;

-- Verify that the canonical trigger exists (it should be created by migration 027)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'trigger_transfer_ownership_on_completion'
    ) THEN
        RAISE EXCEPTION 'Canonical trigger trigger_transfer_ownership_on_completion not found. Migration 027 must run before this migration.';
    END IF;
END $$;

-- Update the comment to clarify this is a cleanup migration
COMMENT ON FUNCTION transfer_book_ownership_on_completion() 
IS 'CANONICAL: Transfers book ownership when a swap is completed by either party. Validates that books are owned by the expected users before transfer. (Canonical implementation from migration 027)';

-- Note: The debug and alternate versions from other migrations now have unique names:
-- - transfer_book_ownership_on_completion_020() (migration 020)
-- - transfer_book_ownership_on_completion_counter_offer_026() (migration 026 counter-offer)
-- - transfer_book_ownership_on_completion_debug_026() (migration 026 debug)
-- - transfer_book_ownership_on_completion_availability_027() (migration 027 availability)
-- - transfer_book_ownership_on_completion_debug_028() (migration 028 debug)
-- These alternate versions are preserved but inactive.
