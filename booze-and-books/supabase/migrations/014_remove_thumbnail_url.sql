-- Remove thumbnail_url column from books table
-- Since thumbnail URLs are provided by Google Books API when needed, we don't need to store them

ALTER TABLE books DROP COLUMN IF EXISTS thumbnail_url;