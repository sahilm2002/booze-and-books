-- Add online status tracking to profiles table
ALTER TABLE profiles 
ADD COLUMN is_online BOOLEAN DEFAULT FALSE,
ADD COLUMN last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN first_login_at TIMESTAMP WITH TIME ZONE;

-- Create index for efficient online status queries
CREATE INDEX idx_profiles_is_online ON profiles(is_online);
CREATE INDEX idx_profiles_last_seen_at ON profiles(last_seen_at);

-- Create function to update last seen timestamp
CREATE OR REPLACE FUNCTION update_user_last_seen(user_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE profiles 
  SET 
    last_seen_at = NOW(),
    is_online = TRUE,
    first_login_at = COALESCE(first_login_at, NOW())
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to set user offline
CREATE OR REPLACE FUNCTION set_user_offline(user_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE profiles 
  SET 
    is_online = FALSE,
    last_seen_at = NOW()
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get user online status
CREATE OR REPLACE FUNCTION get_user_online_status(user_id UUID)
RETURNS TABLE(
  is_online BOOLEAN,
  last_seen_at TIMESTAMP WITH TIME ZONE,
  first_login_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.is_online,
    p.last_seen_at,
    p.first_login_at
  FROM profiles p
  WHERE p.id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION update_user_last_seen(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION set_user_offline(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_online_status(UUID) TO authenticated;

-- RLS policies for online status (allow users to see others' online status)
-- The existing RLS policies on profiles table will handle access control
