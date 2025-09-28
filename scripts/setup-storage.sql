-- Create storage bucket for attachments
-- This should be run in Supabase Dashboard SQL Editor

-- Create the attachments bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
SELECT 'attachments', 'attachments', true, 52428800, ARRAY[
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
  'application/pdf', 
  'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain', 'text/csv',
  'application/zip', 'application/x-rar-compressed', 'application/x-7z-compressed'
]
WHERE NOT EXISTS (
  SELECT 1 FROM storage.buckets WHERE id = 'attachments'
);

-- Enable RLS on storage.objects if not already enabled
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated reads" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated deletes" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated updates" ON storage.objects;
DROP POLICY IF EXISTS "Allow public access" ON storage.objects;
DROP POLICY IF EXISTS "Public Access" ON storage.objects;

-- Create comprehensive RLS policies for the attachments bucket
-- Allow authenticated users to upload files to attachments bucket
CREATE POLICY "Allow authenticated uploads" ON storage.objects
  FOR INSERT 
  TO authenticated 
  WITH CHECK (bucket_id = 'attachments');

-- Allow authenticated users to read files from attachments bucket
CREATE POLICY "Allow authenticated reads" ON storage.objects
  FOR SELECT 
  TO authenticated 
  USING (bucket_id = 'attachments');

-- Allow public access to read files (since bucket is public)
CREATE POLICY "Allow public reads" ON storage.objects
  FOR SELECT 
  TO public 
  USING (bucket_id = 'attachments');

-- Allow authenticated users to delete files from attachments bucket
CREATE POLICY "Allow authenticated deletes" ON storage.objects
  FOR DELETE 
  TO authenticated 
  USING (bucket_id = 'attachments');

-- Allow authenticated users to update files in attachments bucket
CREATE POLICY "Allow authenticated updates" ON storage.objects
  FOR UPDATE 
  TO authenticated 
  USING (bucket_id = 'attachments')
  WITH CHECK (bucket_id = 'attachments');

-- Verify the policies were created
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  permissive, 
  roles, 
  cmd, 
  qual, 
  with_check 
FROM pg_policies 
WHERE tablename = 'objects' AND schemaname = 'storage';

-- Verify the bucket was created
SELECT * FROM storage.buckets WHERE id = 'attachments';