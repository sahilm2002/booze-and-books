-- Add foreign key constraints from swap_requests to profiles table

-- Drop existing foreign key constraints to auth.users
ALTER TABLE swap_requests DROP CONSTRAINT swap_requests_requester_id_fkey;
ALTER TABLE swap_requests DROP CONSTRAINT swap_requests_owner_id_fkey;

-- Add new foreign key constraints to profiles table
ALTER TABLE swap_requests 
ADD CONSTRAINT swap_requests_requester_id_profiles_fkey 
FOREIGN KEY (requester_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE swap_requests 
ADD CONSTRAINT swap_requests_owner_id_profiles_fkey 
FOREIGN KEY (owner_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- Add comments
COMMENT ON CONSTRAINT swap_requests_requester_id_profiles_fkey ON swap_requests IS 'Foreign key to profiles table for swap requester';
COMMENT ON CONSTRAINT swap_requests_owner_id_profiles_fkey ON swap_requests IS 'Foreign key to profiles table for book owner';