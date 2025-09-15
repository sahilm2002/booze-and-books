-- Fix books table issues causing 406 errors
-- This addresses RLS policy and table structure problems

-- First, let's check if the books table exists and has the right structure
DO $$
BEGIN
    -- Ensure the books table has all required columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'books' AND column_name = 'google_volume_id') THEN
        ALTER TABLE books ADD COLUMN google_volume_id TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'books' AND column_name = 'is_available') THEN
        ALTER TABLE books ADD COLUMN is_available BOOLEAN DEFAULT true;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'books' AND column_name = 'thumbnail_url') THEN
        ALTER TABLE books ADD COLUMN thumbnail_url TEXT;
    END IF;
END $$;

-- Fix the unique constraint if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE constraint_name = 'unique_user_google_book' 
                   AND table_name = 'books') THEN
        ALTER TABLE books ADD CONSTRAINT unique_user_google_book 
        UNIQUE (owner_id, google_volume_id);
    END IF;
END $$;

-- Recreate RLS policies to fix 406 errors
DROP POLICY IF EXISTS "Books are viewable by everyone" ON books;
DROP POLICY IF EXISTS "Users can insert own books" ON books;
DROP POLICY IF EXISTS "Users can update own books" ON books;
DROP POLICY IF EXISTS "Users can delete own books" ON books;

-- Create comprehensive RLS policies
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

-- Ensure RLS is enabled
ALTER TABLE books ENABLE ROW LEVEL SECURITY;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_books_owner_id ON books(owner_id);
CREATE INDEX IF NOT EXISTS idx_books_google_volume_id ON books(google_volume_id);
CREATE INDEX IF NOT EXISTS idx_books_is_available ON books(is_available);
CREATE INDEX IF NOT EXISTS idx_books_created_at ON books(created_at DESC);

-- Verify the table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'books' 
ORDER BY ordinal_position;
