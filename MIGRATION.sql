-- =============================================
-- Task Enhancement Migration for checklist_items
-- Run this in your Supabase SQL Editor
-- =============================================

-- Add new columns for task management (PostgreSQL compatible)
DO $$ 
BEGIN
    -- Add due_date column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='checklist_items' AND column_name='due_date') THEN
        ALTER TABLE checklist_items ADD COLUMN due_date timestamptz;
    END IF;
    
    -- Add assigned_to column  
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='checklist_items' AND column_name='assigned_to') THEN
        ALTER TABLE checklist_items ADD COLUMN assigned_to uuid;
    END IF;
    
    -- Add reminder_date column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='checklist_items' AND column_name='reminder_date') THEN
        ALTER TABLE checklist_items ADD COLUMN reminder_date timestamptz;
    END IF;
    
    -- Add reminder_interval column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='checklist_items' AND column_name='reminder_interval') THEN
        ALTER TABLE checklist_items ADD COLUMN reminder_interval text;
    END IF;
    
    -- Add reminder_count column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='checklist_items' AND column_name='reminder_count') THEN
        ALTER TABLE checklist_items ADD COLUMN reminder_count integer DEFAULT 0;
    END IF;
    
    -- Add created_at column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='checklist_items' AND column_name='created_at') THEN
        ALTER TABLE checklist_items ADD COLUMN created_at timestamptz DEFAULT now();
    END IF;
    
    -- Add updated_at column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='checklist_items' AND column_name='updated_at') THEN
        ALTER TABLE checklist_items ADD COLUMN updated_at timestamptz DEFAULT now();
    END IF;
END $$;

-- Create function to list workspace members
CREATE OR REPLACE FUNCTION list_workspace_members()
RETURNS TABLE (
  id uuid,
  name text,
  email text
) AS $$
BEGIN
  -- For now, return current user - you can expand this later
  -- to include actual team members from a members table
  RETURN QUERY
  SELECT 
    auth.uid() as id,
    'Current User'::text as name,
    (auth.jwt() ->> 'email')::text as email
  WHERE auth.uid() IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger function for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for checklist_items
DROP TRIGGER IF EXISTS update_checklist_items_updated_at ON checklist_items;
CREATE TRIGGER update_checklist_items_updated_at 
    BEFORE UPDATE ON checklist_items 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON TABLE checklist_items TO anon, authenticated;
GRANT EXECUTE ON FUNCTION list_workspace_members() TO anon, authenticated;