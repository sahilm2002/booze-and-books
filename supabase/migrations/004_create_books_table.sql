-- Enable pgcrypto extension for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create books table with RLS policies
CREATE TABLE IF NOT EXISTS books (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  authors TEXT[] NOT NULL DEFAULT '{}',
  isbn TEXT,
  condition TEXT NOT NULL CHECK (condition IN ('AS_NEW', 'FINE', 'VERY_GOOD', 'GOOD', 'FAIR', 'POOR')),
  genre TEXT,
  description TEXT,
  thumbnail_url TEXT,
  google_volume_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CONSTRAINT unique_user_google_book UNIQUE (owner_id, google_volume_id)
);

-- Remove conflicting FK to auth.users
ALTER TABLE books DROP CONSTRAINT IF EXISTS books_owner_id_fkey;

-- Ensure FK references profiles.id only
ALTER TABLE books DROP CONSTRAINT IF EXISTS books_owner_id_profiles_fkey;
ALTER TABLE books
  ADD CONSTRAINT books_owner_id_profiles_fkey
  FOREIGN KEY (owner_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- Set up Row Level Security (RLS)
ALTER TABLE books ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view all books (for discovery features)
CREATE POLICY "Books are viewable by everyone" 
ON books FOR SELECT 
USING (true);

-- Policy: Users can insert own books
CREATE POLICY "Users can insert own books" 
ON books FOR INSERT 
WITH CHECK (auth.uid() = owner_id);

-- Policy: Users can update own books
CREATE POLICY "Users can update own books" 
ON books FOR UPDATE 
USING (auth.uid() = owner_id);

-- Policy: Users can delete own books
CREATE POLICY "Users can delete own books" 
ON books FOR DELETE 
USING (auth.uid() = owner_id);

-- Create or replace function to update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for books table to update updated_at timestamp
CREATE TRIGGER update_books_updated_at 
BEFORE UPDATE ON books 
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_books_owner_id ON books(owner_id);
CREATE INDEX IF NOT EXISTS idx_books_title ON books USING gin(to_tsvector('english', title));
CREATE INDEX IF NOT EXISTS idx_books_authors ON books USING gin(authors);
CREATE INDEX IF NOT EXISTS idx_books_genre ON books(genre);
CREATE INDEX IF NOT EXISTS idx_books_condition ON books(condition);
CREATE INDEX IF NOT EXISTS idx_books_created_at ON books(created_at DESC);