-- Add email field to profiles table and populate it from auth.users
-- This allows us to show email addresses in swap contact information

-- Add email column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email TEXT;

-- Create function to sync email from auth.users to profiles
CREATE OR REPLACE FUNCTION sync_user_email_to_profile()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the profile with the user's email when auth.users is updated
    UPDATE profiles 
    SET email = NEW.email 
    WHERE id = NEW.id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to sync email changes from auth.users to profiles
DROP TRIGGER IF EXISTS sync_email_to_profile_trigger ON auth.users;
CREATE TRIGGER sync_email_to_profile_trigger
    AFTER UPDATE OF email ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION sync_user_email_to_profile();

-- Update existing profiles with current email addresses from auth.users
UPDATE profiles 
SET email = auth_users.email
FROM auth.users AS auth_users
WHERE profiles.id = auth_users.id
AND profiles.email IS NULL;

-- Update the handle_new_user function to include email
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, username, full_name, email)
  VALUES (
    NEW.id, 
    COALESCE(
      NEW.raw_user_meta_data->>'username',
      -- Sanitize email local part for username
      COALESCE(
        NULLIF(TRIM(TRAILING '_' FROM TRIM(LEADING '_' FROM REGEXP_REPLACE(SPLIT_PART(NEW.email, '@', 1), '[^a-zA-Z0-9_-]', '_', 'g'))), ''),
        'user'
      )
    ),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.email
  );
  RETURN NEW;
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION sync_user_email_to_profile() TO authenticated;

-- Add comment
COMMENT ON COLUMN profiles.email IS 'User email address synced from auth.users for contact purposes';
