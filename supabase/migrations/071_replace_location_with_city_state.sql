-- Migration to replace location field with separate city and state fields
-- This migration will:
-- 1. Add city and state columns if they don't exist
-- 2. Parse existing location data into city and state
-- 3. Remove the location column

-- Add city and state columns if they don't already exist
DO $$ 
BEGIN
    -- Add city column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'city') THEN
        ALTER TABLE profiles ADD COLUMN city TEXT;
    END IF;
    
    -- Add state column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'state') THEN
        ALTER TABLE profiles ADD COLUMN state TEXT;
    END IF;
END $$;

-- Migrate existing location data to city and state
-- This handles common formats like "City, State", "City, ST", etc.
UPDATE profiles 
SET 
    city = CASE 
        WHEN location IS NOT NULL AND location != '' THEN
            CASE 
                -- Handle "City, State" format
                WHEN location ~ '^[^,]+,\s*[A-Za-z]{2,}$' THEN
                    TRIM(SPLIT_PART(location, ',', 1))
                -- Handle single word (assume it's a city)
                WHEN location !~ ',' THEN
                    TRIM(location)
                -- Handle other comma-separated formats, take first part as city
                ELSE
                    TRIM(SPLIT_PART(location, ',', 1))
            END
        ELSE NULL
    END,
    state = CASE 
        WHEN location IS NOT NULL AND location != '' THEN
            CASE 
                -- Handle "City, State" format
                WHEN location ~ '^[^,]+,\s*[A-Za-z]{2,}$' THEN
                    UPPER(TRIM(SPLIT_PART(location, ',', 2)))
                -- Single word locations don't have state info
                ELSE NULL
            END
        ELSE NULL
    END
WHERE location IS NOT NULL AND location != '' AND (city IS NULL OR state IS NULL);

-- Drop the location column
ALTER TABLE profiles DROP COLUMN IF EXISTS location;

-- Update RLS policies if needed (they should automatically apply to new columns)
-- No additional RLS policies needed as city and state inherit from the table's existing policies

-- Add helpful comment
COMMENT ON COLUMN profiles.city IS 'User city for location display and store finding';
COMMENT ON COLUMN profiles.state IS 'User state (2-letter abbreviation preferred) for location display and store finding';
