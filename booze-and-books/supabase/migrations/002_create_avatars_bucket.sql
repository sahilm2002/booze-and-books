-- Create avatars storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Set up RLS policies for avatars bucket
CREATE POLICY "Avatar images are publicly accessible" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar" 
ON storage.objects FOR INSERT 
WITH CHECK (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
  AND lower(storage.extension(name)) IN ('png','jpg','jpeg','gif','webp')
);

CREATE POLICY "Users can update their own avatar" 
ON storage.objects FOR UPDATE 
USING (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
  AND lower(storage.extension(name)) IN ('png','jpg','jpeg','gif','webp')
);

CREATE POLICY "Users can delete their own avatar" 
ON storage.objects FOR DELETE 
USING (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Create helper function to get avatar URL
CREATE OR REPLACE FUNCTION get_avatar_url(avatar_path TEXT)
RETURNS TEXT AS $$
BEGIN
  IF avatar_path IS NULL OR avatar_path = '' THEN
    RETURN NULL;
  END IF;
  
  RETURN CONCAT(
    (SELECT split_part(url, '/storage/', 1) FROM storage.objects LIMIT 1),
    '/storage/v1/object/public/avatars/',
    avatar_path
  );
END;
$$ LANGUAGE plpgsql;