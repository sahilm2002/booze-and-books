-- Fix migration state to match our current database setup
-- This tells Supabase that all migrations up to 039 have been applied

-- Mark all migrations as applied in the migration tracking table
INSERT INTO supabase_migrations.schema_migrations (version, name) VALUES
('006', 'create_swap_requests_table'),
('007', 'create_notifications_table'),
('008', 'add_swap_completion'),
('009', 'remove_unused_get_avatar_url_function'),
('010', 'add_swap_requests_profiles_foreign_keys'),
('013', 'update_book_conditions'),
('014', 'remove_thumbnail_url'),
('015', 'add_counter_offer_functionality'),
('016', 'add_offered_book_id_to_swap_requests'),
('017', 'fix_swap_requests_rls_policy'),
('018', 'restore_swap_request_validation'),
('019', 'auto_populate_owner_id_trigger'),
('020', 'add_book_ownership_transfer_on_swap_completion'),
('021', 'add_cancelled_by_column'),
('022', 'fix_notification_cancelled_by'),
('023', 'fix_notification_trigger_cover_image'),
('024', 'fix_book_ownership_transfer_rls'),
('025', 'fix_rls_policy_conflict_for_book_ownership_transfer'),
('026', 'debug_swap_completion'),
('027', 'fix_swap_completion_for_both_parties'),
('028', 'debug_ownership_values'),
('029', 'fix_rls_context_issue'),
('030', 'simple_ownership_transfer'),
('031', 'correct_ownership_validation'),
('032', 'fix_book_condition_constraint'),
('033', 'simplify_swap_completion'),
('034', 'fix_notification_messages_with_usernames'),
('035', 'fix_duplicate_function_names'),
('036', 'rebuild_swap_system'),
('037', 'fix_swap_notification_include_offered_book'),
('038', 'add_book_ownership_transfer_on_completion'),
('039', 'fix_foreign_key_relationships')
ON CONFLICT (version) DO NOTHING;

-- Verify the current swap_status enum has all values
DO $$
BEGIN
    -- Check if COUNTER_OFFER and COMPLETED exist in the enum
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum e
        JOIN pg_type t ON e.enumtypid = t.oid
        WHERE t.typname = 'swap_status' AND e.enumlabel = 'COUNTER_OFFER'
    ) THEN
        ALTER TYPE swap_status ADD VALUE 'COUNTER_OFFER';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum e
        JOIN pg_type t ON e.enumtypid = t.oid
        WHERE t.typname = 'swap_status' AND e.enumlabel = 'COMPLETED'
    ) THEN
        ALTER TYPE swap_status ADD VALUE 'COMPLETED';
    END IF;
END $$;
