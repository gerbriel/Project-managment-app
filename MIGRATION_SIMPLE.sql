-- =============================================
-- SIMPLIFIED Task Enhancement Migration
-- Copy and paste this into Supabase SQL Editor
-- =============================================

-- Step 1: Add columns one by one (safer approach)
ALTER TABLE checklist_items ADD COLUMN due_date timestamptz;
ALTER TABLE checklist_items ADD COLUMN assigned_to uuid;
ALTER TABLE checklist_items ADD COLUMN reminder_date timestamptz;
ALTER TABLE checklist_items ADD COLUMN reminder_interval text;
ALTER TABLE checklist_items ADD COLUMN reminder_count integer DEFAULT 0;
ALTER TABLE checklist_items ADD COLUMN created_at timestamptz DEFAULT now();
ALTER TABLE checklist_items ADD COLUMN updated_at timestamptz DEFAULT now();

-- Step 2: Create the workspace members function
CREATE OR REPLACE FUNCTION list_workspace_members()
RETURNS TABLE (
  id uuid,
  name text,
  email text
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    auth.uid() as id,
    'Current User'::text as name,
    COALESCE((auth.jwt() ->> 'email')::text, 'user@example.com') as email
  WHERE auth.uid() IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 3: Create update trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_checklist_items_updated_at ON checklist_items;
CREATE TRIGGER update_checklist_items_updated_at 
    BEFORE UPDATE ON checklist_items 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();