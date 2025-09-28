-- DEFINITIVE STORAGE RLS FIX
-- Copy and paste this entire script into Supabase Dashboard → SQL Editor
-- Then click "Run"

-- Step 1: Enable RLS on storage.objects (if not already enabled)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Step 2: Drop ALL existing policies to start completely fresh
DO $$ 
BEGIN
    -- Drop any existing policies that might conflict
    EXECUTE 'DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects';
    EXECUTE 'DROP POLICY IF EXISTS "Allow public reads" ON storage.objects';
    EXECUTE 'DROP POLICY IF EXISTS "Allow authenticated deletes" ON storage.objects';
    EXECUTE 'DROP POLICY IF EXISTS "Allow authenticated updates" ON storage.objects';
    EXECUTE 'DROP POLICY IF EXISTS "Allow uploads to attachments" ON storage.objects';
    EXECUTE 'DROP POLICY IF EXISTS "Allow public reads from attachments" ON storage.objects';
    EXECUTE 'DROP POLICY IF EXISTS "Allow deletes from attachments" ON storage.objects';
    EXECUTE 'DROP POLICY IF EXISTS "Allow updates to attachments" ON storage.objects';
    EXECUTE 'DROP POLICY IF EXISTS "Public Access" ON storage.objects';
    EXECUTE 'DROP POLICY IF EXISTS "Allow anon uploads" ON storage.objects';
    
    RAISE NOTICE 'All existing policies dropped';
END $$;

-- Step 3: Create new permissive policies
-- Allow ANY user (authenticated, anon, or public) to upload to attachments bucket
CREATE POLICY "attachments_upload_policy" ON storage.objects
    FOR INSERT
    WITH CHECK (bucket_id = 'attachments');

-- Allow public read access to attachments
CREATE POLICY "attachments_read_policy" ON storage.objects
    FOR SELECT
    TO public
    USING (bucket_id = 'attachments');

-- Allow ANY user to delete from attachments bucket
CREATE POLICY "attachments_delete_policy" ON storage.objects
    FOR DELETE
    USING (bucket_id = 'attachments');

-- Allow ANY user to update attachments
CREATE POLICY "attachments_update_policy" ON storage.objects
    FOR UPDATE
    USING (bucket_id = 'attachments')
    WITH CHECK (bucket_id = 'attachments');

-- Step 4: Verify the policies were created
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

-- Step 5: Show bucket info
SELECT id, name, public, file_size_limit 
FROM storage.buckets 
WHERE id = 'attachments';

-- Success message
DO $$ 
BEGIN
    RAISE NOTICE '=================================';
    RAISE NOTICE 'STORAGE POLICIES SETUP COMPLETE!';
    RAISE NOTICE '=================================';
    RAISE NOTICE 'You can now upload files to the attachments bucket.';
    RAISE NOTICE 'Refresh your browser and try uploading a file.';
END $$;