-- Complete database setup script
-- This ensures all required tables and relationships exist

-- 1. Create profiles table if it doesn't exist
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE,
  full_name TEXT,
  bio TEXT,
  location TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable RLS on profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for profiles
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON profiles;
CREATE POLICY "Profiles are viewable by everyone" 
ON profiles FOR SELECT 
USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" 
ON profiles FOR UPDATE 
USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile" 
ON profiles FOR INSERT 
WITH CHECK (auth.uid() = id);

-- 2. Create notifications table if it doesn't exist
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable RLS on notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for notifications
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
CREATE POLICY "Users can view own notifications" 
ON notifications FOR SELECT 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
CREATE POLICY "Users can update own notifications" 
ON notifications FOR UPDATE 
USING (auth.uid() = user_id);

-- Create indexes for notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);

-- 3. Ensure books table exists with proper relationships
CREATE TABLE IF NOT EXISTS books (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  authors TEXT[] NOT NULL DEFAULT '{}',
  isbn TEXT,
  condition TEXT NOT NULL CHECK (condition IN ('AS_NEW', 'FINE', 'VERY_GOOD', 'GOOD', 'FAIR', 'POOR')),
  genre TEXT,
  description TEXT,
  thumbnail_url TEXT,
  google_volume_id TEXT,
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CONSTRAINT unique_user_google_book UNIQUE (owner_id, google_volume_id)
);

-- Enable RLS on books
ALTER TABLE books ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for books
DROP POLICY IF EXISTS "Books are viewable by everyone" ON books;
CREATE POLICY "Books are viewable by everyone" 
ON books FOR SELECT 
USING (true);

DROP POLICY IF EXISTS "Users can insert own books" ON books;
CREATE POLICY "Users can insert own books" 
ON books FOR INSERT 
WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Users can update own books" ON books;
CREATE POLICY "Users can update own books" 
ON books FOR UPDATE 
USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Users can delete own books" ON books;
CREATE POLICY "Users can delete own books" 
ON books FOR DELETE 
USING (auth.uid() = owner_id);

-- 4. Create swap_status enum if it doesn't exist
DO $$ BEGIN
    CREATE TYPE swap_status AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'CANCELLED', 'COUNTER_OFFER', 'COMPLETED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add missing enum values if they don't exist
DO $$
BEGIN
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

-- 5. Create swap_requests table if it doesn't exist
CREATE TABLE IF NOT EXISTS swap_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    offered_book_id UUID REFERENCES books(id) ON DELETE SET NULL,
    counter_offered_book_id UUID REFERENCES books(id) ON DELETE SET NULL,
    requester_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    cancelled_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    status swap_status DEFAULT 'PENDING' NOT NULL,
    message TEXT,
    counter_offer_message TEXT,
    requester_completed_at TIMESTAMPTZ,
    owner_completed_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    requester_rating INTEGER CHECK (requester_rating >= 1 AND requester_rating <= 5),
    owner_rating INTEGER CHECK (owner_rating >= 1 AND owner_rating <= 5),
    requester_feedback TEXT,
    owner_feedback TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable RLS on swap_requests
ALTER TABLE swap_requests ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for swap_requests
DROP POLICY IF EXISTS "Users can view their own swap requests" ON swap_requests;
CREATE POLICY "Users can view their own swap requests" ON swap_requests
    FOR SELECT USING (
        auth.uid() = requester_id OR auth.uid() = owner_id
    );

DROP POLICY IF EXISTS "Users can create swap requests" ON swap_requests;
CREATE POLICY "Users can create swap requests" ON swap_requests
    FOR INSERT WITH CHECK (
        auth.uid() = requester_id
        AND requester_id != owner_id
        AND EXISTS (
            SELECT 1 FROM books 
            WHERE books.id = book_id 
            AND books.is_available = true
            AND books.owner_id != auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can update swap request status" ON swap_requests;
CREATE POLICY "Users can update swap request status" ON swap_requests
    FOR UPDATE USING (
        (auth.uid() = owner_id AND status = 'PENDING')
        OR
        (auth.uid() = requester_id AND status = 'PENDING')
        OR
        (auth.uid() = owner_id AND status = 'COUNTER_OFFER')
        OR
        (auth.uid() = requester_id AND status = 'COUNTER_OFFER')
        OR
        (auth.uid() = owner_id AND status = 'ACCEPTED')
        OR
        (auth.uid() = requester_id AND status = 'ACCEPTED')
    );

-- Create indexes for swap_requests
CREATE INDEX IF NOT EXISTS idx_swap_requests_book_id ON swap_requests(book_id);
CREATE INDEX IF NOT EXISTS idx_swap_requests_requester_id ON swap_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_swap_requests_owner_id ON swap_requests(owner_id);
CREATE INDEX IF NOT EXISTS idx_swap_requests_status ON swap_requests(status);
CREATE INDEX IF NOT EXISTS idx_swap_requests_created_at ON swap_requests(created_at);

-- 6. Create the correct completion trigger
CREATE OR REPLACE FUNCTION transfer_book_ownership_on_completion()
RETURNS TRIGGER AS $$
BEGIN
    -- Only proceed if both parties have completed
    IF NEW.requester_completed_at IS NOT NULL AND NEW.owner_completed_at IS NOT NULL AND OLD.completed_at IS NULL THEN
        -- Mark the swap as fully completed
        NEW.completed_at = NOW();
        NEW.status = 'COMPLETED';
        
        -- Transfer book ownership atomically
        BEGIN
            -- Get the books involved in the swap
            DECLARE
                requested_book_id UUID := NEW.book_id;
                offered_book_id UUID := COALESCE(NEW.counter_offered_book_id, NEW.offered_book_id);
                requester_id UUID := NEW.requester_id;
                owner_id UUID := NEW.owner_id;
            BEGIN
                -- Transfer the requested book to the requester
                UPDATE books 
                SET owner_id = requester_id, is_available = true
                WHERE id = requested_book_id;
                
                -- Transfer the offered book to the original owner (if there is one)
                IF offered_book_id IS NOT NULL THEN
                    UPDATE books 
                    SET owner_id = owner_id, is_available = true
                    WHERE id = offered_book_id;
                END IF;
            END;
        EXCEPTION
            WHEN OTHERS THEN
                RAISE EXCEPTION 'Failed to transfer book ownership: %', SQLERRM;
        END;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS trigger_transfer_book_ownership_on_completion ON swap_requests;
CREATE TRIGGER trigger_transfer_book_ownership_on_completion
    BEFORE UPDATE ON swap_requests
    FOR EACH ROW
    EXECUTE FUNCTION transfer_book_ownership_on_completion();

-- 7. Create profile creation trigger
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, username, full_name)
  VALUES (
    NEW.id, 
    COALESCE(
      NEW.raw_user_meta_data->>'username',
      COALESCE(
        NULLIF(TRIM(TRAILING '_' FROM TRIM(LEADING '_' FROM REGEXP_REPLACE(SPLIT_PART(NEW.email, '@', 1), '[^a-zA-Z0-9_-]', '_', 'g'))), ''),
        'user'
      )
    ),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  RETURN NEW;
END;
$$;

-- Create the auth trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 8. Mark all migrations as applied to prevent conflicts
INSERT INTO supabase_migrations.schema_migrations (version, name) VALUES
('001', 'create_profiles_table'),
('002', 'create_avatars_bucket'),
('003', 'add_username_case_insensitive_index'),
('004', 'create_books_table'),
('005', 'add_is_available_to_books'),
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
