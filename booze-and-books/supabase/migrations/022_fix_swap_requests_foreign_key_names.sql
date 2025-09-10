-- Fix foreign key constraint names and relationships for proper Supabase relationship queries
-- The PostgREST API expects specific foreign key constraint naming patterns

BEGIN;

-- First, ensure profiles table has proper foreign key to auth.users
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_id_fkey 
FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add counter_offered_book_id column if it doesn't exist
ALTER TABLE public.swap_requests 
ADD COLUMN IF NOT EXISTS counter_offered_book_id UUID REFERENCES public.books(id) ON DELETE SET NULL;

-- Create index for the new column if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_swap_requests_counter_offered_book_id 
ON public.swap_requests(counter_offered_book_id);

-- Drop existing swap_requests constraints (they might have auto-generated names)
ALTER TABLE public.swap_requests DROP CONSTRAINT IF EXISTS swap_requests_book_id_fkey;
ALTER TABLE public.swap_requests DROP CONSTRAINT IF EXISTS swap_requests_offered_book_id_fkey;
ALTER TABLE public.swap_requests DROP CONSTRAINT IF EXISTS swap_requests_counter_offered_book_id_fkey;
ALTER TABLE public.swap_requests DROP CONSTRAINT IF EXISTS swap_requests_requester_id_fkey;
ALTER TABLE public.swap_requests DROP CONSTRAINT IF EXISTS swap_requests_owner_id_fkey;

-- Recreate book relationships with proper constraint names
ALTER TABLE public.swap_requests 
ADD CONSTRAINT swap_requests_book_id_fkey 
FOREIGN KEY (book_id) REFERENCES public.books(id) ON DELETE CASCADE;

ALTER TABLE public.swap_requests 
ADD CONSTRAINT swap_requests_offered_book_id_fkey 
FOREIGN KEY (offered_book_id) REFERENCES public.books(id) ON DELETE SET NULL;

ALTER TABLE public.swap_requests 
ADD CONSTRAINT swap_requests_counter_offered_book_id_fkey 
FOREIGN KEY (counter_offered_book_id) REFERENCES public.books(id) ON DELETE SET NULL;

-- Create profile relationships that PostgREST can understand
-- Since requester_id and owner_id reference auth.users, and profiles.id also references auth.users,
-- we can join through the common auth.users.id field
ALTER TABLE public.swap_requests 
ADD CONSTRAINT swap_requests_requester_id_fkey 
FOREIGN KEY (requester_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.swap_requests 
ADD CONSTRAINT swap_requests_owner_id_fkey 
FOREIGN KEY (owner_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

COMMIT;

-- Add comments for clarity
COMMENT ON TABLE public.swap_requests IS 'Book swap requests with properly named foreign key constraints for PostgREST API compatibility';
COMMENT ON COLUMN public.swap_requests.counter_offered_book_id IS 'Book offered by owner as counter-offer to original request';
COMMENT ON CONSTRAINT swap_requests_requester_id_fkey ON public.swap_requests IS 'References profiles table to enable PostgREST joins';
COMMENT ON CONSTRAINT swap_requests_owner_id_fkey ON public.swap_requests IS 'References profiles table to enable PostgREST joins';