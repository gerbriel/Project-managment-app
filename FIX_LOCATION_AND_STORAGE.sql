-- FIX LOCATION COLUMNS AND STORAGE POLICIES
-- Run this in Supabase Dashboard → SQL Editor

BEGIN;

-- Add location columns to cards table (safe to run multiple times)
ALTER TABLE public.cards ADD COLUMN IF NOT EXISTS location_lat double precision;
ALTER TABLE public.cards ADD COLUMN IF NOT EXISTS location_lng double precision;
ALTER TABLE public.cards ADD COLUMN IF NOT EXISTS location_address text;

-- Create index for efficient location queries  
CREATE INDEX IF NOT EXISTS cards_board_loc_idx ON public.cards(board_id, location_lat, location_lng);

-- STORAGE RLS POLICIES FOR FILE UPLOADS
-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Drop ALL existing storage policies to avoid conflicts
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow public reads" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated deletes" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated updates" ON storage.objects;
DROP POLICY IF EXISTS "Allow uploads to attachments" ON storage.objects;
DROP POLICY IF EXISTS "Allow public reads from attachments" ON storage.objects;
DROP POLICY IF EXISTS "Allow deletes from attachments" ON storage.objects;
DROP POLICY IF EXISTS "Allow updates to attachments" ON storage.objects;
DROP POLICY IF EXISTS "attachments_upload_policy" ON storage.objects;
DROP POLICY IF EXISTS "attachments_read_policy" ON storage.objects;
DROP POLICY IF EXISTS "attachments_delete_policy" ON storage.objects;
DROP POLICY IF EXISTS "attachments_update_policy" ON storage.objects;
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Allow anon uploads" ON storage.objects;

-- Create permissive storage policies (works for both authenticated and anon users)
CREATE POLICY "attachments_upload_policy" ON storage.objects
    FOR INSERT
    WITH CHECK (bucket_id = 'attachments');

CREATE POLICY "attachments_read_policy" ON storage.objects
    FOR SELECT
    TO public
    USING (bucket_id = 'attachments');

CREATE POLICY "attachments_delete_policy" ON storage.objects
    FOR DELETE
    USING (bucket_id = 'attachments');

CREATE POLICY "attachments_update_policy" ON storage.objects
    FOR UPDATE
    USING (bucket_id = 'attachments')
    WITH CHECK (bucket_id = 'attachments');

COMMIT;

-- Verification queries
SELECT 'Location columns and storage policies updated successfully!' AS status;

-- Verify location columns were added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'cards' 
  AND column_name IN ('location_lat','location_lng','location_address');

-- Verify storage policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies 
WHERE tablename = 'objects' AND schemaname = 'storage'
ORDER BY policyname;

-- Check if attachments bucket exists
SELECT id, name, public, file_size_limit 
FROM storage.buckets 
WHERE id = 'attachments';

SELECT 'SETUP COMPLETE! Location columns added and file uploads should now work.' AS result;