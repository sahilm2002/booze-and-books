-- Add zip_code column to profiles table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'zip_code'
    ) THEN
        ALTER TABLE profiles ADD COLUMN zip_code VARCHAR(10);
        CREATE INDEX idx_profiles_zip_code ON profiles(zip_code);
    END IF;
END $$;
