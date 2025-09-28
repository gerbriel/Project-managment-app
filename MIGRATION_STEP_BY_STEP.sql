-- =============================================
-- STEP BY STEP Migration Instructions
-- =============================================

-- Try running these ONE AT A TIME in Supabase SQL Editor

-- Step 1: Check current table structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'checklist_items';

-- Step 2: Add due_date column (run this first)
ALTER TABLE checklist_items ADD COLUMN due_date timestamptz;

-- Step 3: Add assigned_to column
ALTER TABLE checklist_items ADD COLUMN assigned_to uuid;

-- Step 4: Add reminder columns
ALTER TABLE checklist_items ADD COLUMN reminder_date timestamptz;
ALTER TABLE checklist_items ADD COLUMN reminder_interval text;
ALTER TABLE checklist_items ADD COLUMN reminder_count integer DEFAULT 0;

-- Step 5: Add timestamp columns  
ALTER TABLE checklist_items ADD COLUMN created_at timestamptz DEFAULT now();
ALTER TABLE checklist_items ADD COLUMN updated_at timestamptz DEFAULT now();

-- Step 6: Create the workspace members function
CREATE OR REPLACE FUNCTION list_workspace_members()
RETURNS TABLE (
  id uuid,
  name text,
  email text
) 
LANGUAGE plpgsql 
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    auth.uid() as id,
    'Current User'::text as name,
    'user@example.com'::text as email
  WHERE auth.uid() IS NOT NULL;
END;
$$;

-- Step 7: Verify everything worked
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'checklist_items'
ORDER BY column_name;