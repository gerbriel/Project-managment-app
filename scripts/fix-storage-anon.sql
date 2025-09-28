-- Fix Storage RLS Policies for Both Anon and Authenticated Users
-- Run this in Supabase Dashboard → SQL Editor

-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow public reads" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated deletes" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated updates" ON storage.objects;
DROP POLICY IF EXISTS "Allow anon uploads" ON storage.objects;
DROP POLICY IF EXISTS "Public Access" ON storage.objects;

-- Create policies that work for both authenticated and anon users
-- Allow both authenticated and anon users to upload to attachments bucket
CREATE POLICY "Allow uploads to attachments" ON storage.objects
  FOR INSERT 
  WITH CHECK (bucket_id = 'attachments');

-- Allow public read access to attachments
CREATE POLICY "Allow public reads from attachments" ON storage.objects
  FOR SELECT 
  TO public
  USING (bucket_id = 'attachments');

-- Allow both authenticated and anon users to delete from attachments bucket  
CREATE POLICY "Allow deletes from attachments" ON storage.objects
  FOR DELETE 
  USING (bucket_id = 'attachments');

-- Allow both authenticated and anon users to update attachments
CREATE POLICY "Allow updates to attachments" ON storage.objects
  FOR UPDATE 
  USING (bucket_id = 'attachments')
  WITH CHECK (bucket_id = 'attachments');

-- Verify policies were created
SELECT 
  policyname, 
  cmd, 
  roles::text,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'objects' AND schemaname = 'storage';