# 🔧 File Upload RLS Policy Fix

## The Issue
File uploads are failing with "new row violates row-level security policy" because the Supabase storage bucket needs proper RLS policies configured.

## 🚀 Quick Fix (Manual Setup)

### Option 1: Supabase Dashboard (Recommended)

1. **Go to your Supabase Dashboard**
   - Open: https://app.supabase.com/project/lvplhlzzwtrqjdxhjrkd

2. **Navigate to Authentication > Policies**

3. **Find the `storage.objects` table**

4. **Create the following policies:**

   **Policy 1: Allow Uploads**
   - Click "New Policy"
   - Name: `Allow authenticated uploads`
   - Table: `storage.objects`
   - Policy type: `Permissive`
   - Command: `INSERT`
   - Target roles: `authenticated`
   - USING expression: (leave empty)
   - WITH CHECK expression: `bucket_id = 'attachments'`

   **Policy 2: Allow Public Reads**
   - Click "New Policy" 
   - Name: `Allow public reads`
   - Table: `storage.objects`
   - Policy type: `Permissive`
   - Command: `SELECT`
   - Target roles: `public`
   - USING expression: `bucket_id = 'attachments'`

   **Policy 3: Allow Deletes**
   - Click "New Policy"
   - Name: `Allow authenticated deletes`
   - Table: `storage.objects`
   - Policy type: `Permissive` 
   - Command: `DELETE`
   - Target roles: `authenticated`
   - USING expression: `bucket_id = 'attachments'`

### Option 2: SQL Editor (Alternative)

Go to SQL Editor in Supabase Dashboard and run:

```sql
-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Create upload policy
CREATE POLICY "Allow authenticated uploads" ON storage.objects
  FOR INSERT 
  TO authenticated 
  WITH CHECK (bucket_id = 'attachments');

-- Create read policy  
CREATE POLICY "Allow public reads" ON storage.objects
  FOR SELECT 
  TO public 
  USING (bucket_id = 'attachments');

-- Create delete policy
CREATE POLICY "Allow authenticated deletes" ON storage.objects
  FOR DELETE 
  TO authenticated 
  USING (bucket_id = 'attachments');
```

## ✅ Verification

After setting up the policies:

1. **Refresh your browser** at http://localhost:5173
2. **Open any card** 
3. **Try dragging and dropping a file**
4. **The upload should work without errors!**

## 🎯 Expected Result

You should see:
- ✅ File upload progress bars
- ✅ Files appear in the attachments list  
- ✅ No more RLS policy errors
- ✅ Ability to view, rename, and delete attachments

## 🔍 Troubleshooting

If uploads still fail:

1. **Check browser console** for new error messages
2. **Verify bucket exists**: Go to Storage in Supabase Dashboard
3. **Check policies**: Make sure all 3 policies are listed and enabled
4. **Try different file**: Test with a small text file first

The drag-and-drop file upload system is ready - it just needs these RLS policies configured once!