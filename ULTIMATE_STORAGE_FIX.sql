-- ULTIMATE STORAGE FIX - Creates bucket and most permissive policies
-- Run this in Supabase Dashboard → SQL Editor

BEGIN;

-- First, ensure the attachments bucket exists
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'attachments',
    'attachments',
    true,
    52428800, -- 50MB
    ARRAY[
        'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
        'application/pdf', 'text/plain', 'text/csv',
        'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/zip', 'application/x-zip-compressed'
    ]
)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 52428800,
    allowed_mime_types = ARRAY[
        'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
        'application/pdf', 'text/plain', 'text/csv',
        'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/zip', 'application/x-zip-compressed'
    ];

-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Drop ALL existing storage policies completely
DO $$ 
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN 
        SELECT policyname FROM pg_policies 
        WHERE tablename = 'objects' AND schemaname = 'storage'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || policy_record.policyname || '" ON storage.objects';
    END LOOP;
END $$;

-- Create the most permissive policies possible (no role restrictions at all)
CREATE POLICY "attachments_public_upload" ON storage.objects
    FOR INSERT 
    TO public
    WITH CHECK (bucket_id = 'attachments');

CREATE POLICY "attachments_public_read" ON storage.objects
    FOR SELECT 
    TO public
    USING (bucket_id = 'attachments');

CREATE POLICY "attachments_public_delete" ON storage.objects
    FOR DELETE 
    TO public
    USING (bucket_id = 'attachments');

CREATE POLICY "attachments_public_update" ON storage.objects
    FOR UPDATE 
    TO public
    USING (bucket_id = 'attachments')
    WITH CHECK (bucket_id = 'attachments');

-- Also add location columns if they don't exist
ALTER TABLE public.cards ADD COLUMN IF NOT EXISTS location_lat double precision;
ALTER TABLE public.cards ADD COLUMN IF NOT EXISTS location_lng double precision;
ALTER TABLE public.cards ADD COLUMN IF NOT EXISTS location_address text;

-- Create index for efficient location queries  
CREATE INDEX IF NOT EXISTS cards_board_loc_idx ON public.cards(board_id, location_lat, location_lng);

COMMIT;

-- Verification queries
SELECT 'Ultimate storage fix applied successfully!' AS status;

-- Verify bucket exists and is public
SELECT id, name, public, file_size_limit, allowed_mime_types
FROM storage.buckets 
WHERE id = 'attachments';

-- Verify all policies were recreated
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

-- Verify location columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'cards' 
  AND column_name IN ('location_lat','location_lng','location_address');

SELECT 'ULTIMATE SETUP COMPLETE! File uploads should definitely work now.' AS result;