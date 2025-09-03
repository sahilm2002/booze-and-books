-- Remove the unused get_avatar_url helper function
-- This function was fragile and unnecessary since the SDK provides public URL generation
DROP FUNCTION IF EXISTS get_avatar_url(TEXT);