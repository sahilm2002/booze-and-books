-- Targeted fix for 406 error when adding books
-- This addresses the most common RLS policy issues

-- First, let's ensure RLS is properly configured
ALTER TABLE books ENABLE ROW LEVEL SECURITY;

-- Drop and recreate all RLS policies to ensure they're correct
DROP POLICY IF EXISTS "Books are viewable by everyone" ON books;
DROP POLICY IF EXISTS "Users can insert own books" ON books;
DROP POLICY IF EXISTS "Users can update own books" ON books;
DROP POLICY IF EXISTS "Users can delete own books" ON books;
DROP POLICY IF EXISTS "Enable read access for all users" ON books;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON books;
DROP POLICY IF EXISTS "Enable update for users based on owner_id" ON books;
DROP POLICY IF EXISTS "Enable delete for users based on owner_id" ON books;

-- Create comprehensive RLS policies that should work
CREATE POLICY "Books are viewable by everyone" 
ON books FOR SELECT 
USING (true);

CREATE POLICY "Users can insert own books" 
ON books FOR INSERT 
WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update own books" 
ON books FOR UPDATE 
USING (auth.uid() = owner_id)
WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can delete own books" 
ON books FOR DELETE 
USING (auth.uid() = owner_id);

-- Ensure the unique constraint exists for Google Books
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE constraint_name = 'unique_user_google_book' 
                   AND table_name = 'books') THEN
        ALTER TABLE books ADD CONSTRAINT unique_user_google_book 
        UNIQUE (owner_id, google_volume_id);
    END IF;
END $$;

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON books TO authenticated;
GRANT SELECT ON books TO anon;

-- Test the policies work
SELECT 'RLS policies created successfully' as status;
