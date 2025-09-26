-- Add zip_code column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS zip_code VARCHAR(10);

-- Add index for zip_code lookups
CREATE INDEX IF NOT EXISTS idx_profiles_zip_code ON profiles(zip_code);
