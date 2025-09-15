-- Fix missing foreign key relationships between swap_requests and profiles
-- This resolves the "Could not find a relationship" error

-- Add foreign key constraints to link swap_requests to profiles
ALTER TABLE swap_requests 
ADD CONSTRAINT swap_requests_requester_profile_fkey 
FOREIGN KEY (requester_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE swap_requests 
ADD CONSTRAINT swap_requests_owner_profile_fkey 
FOREIGN KEY (owner_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE swap_requests 
ADD CONSTRAINT swap_requests_cancelled_by_profile_fkey 
FOREIGN KEY (cancelled_by) REFERENCES profiles(id) ON DELETE SET NULL;

-- Also ensure books table has proper relationship to profiles
ALTER TABLE books 
DROP CONSTRAINT IF EXISTS books_owner_id_profiles_fkey;

ALTER TABLE books 
ADD CONSTRAINT books_owner_id_profiles_fkey 
FOREIGN KEY (owner_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- Add comments for clarity
COMMENT ON CONSTRAINT swap_requests_requester_profile_fkey ON swap_requests IS 'Links swap requester to their profile';
COMMENT ON CONSTRAINT swap_requests_owner_profile_fkey ON swap_requests IS 'Links swap owner to their profile';
COMMENT ON CONSTRAINT swap_requests_cancelled_by_profile_fkey ON swap_requests IS 'Links cancellation user to their profile';
COMMENT ON CONSTRAINT books_owner_id_profiles_fkey ON books IS 'Links book owner to their profile';
