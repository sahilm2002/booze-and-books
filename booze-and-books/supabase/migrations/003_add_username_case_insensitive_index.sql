-- Add unique index on lower(username) to prevent case-variant duplicates
-- This allows 'User1' and 'user1' to be treated as the same username
CREATE UNIQUE INDEX CONCURRENTLY idx_profiles_username_lower 
ON profiles (lower(username)) 
WHERE username IS NOT NULL;