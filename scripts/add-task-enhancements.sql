-- Add task enhancement columns to checklist_items table
ALTER TABLE checklist_items 
ADD COLUMN due_date timestamptz,
ADD COLUMN assigned_to uuid,
ADD COLUMN reminder_date timestamptz,
ADD COLUMN created_at timestamptz DEFAULT now(),
ADD COLUMN updated_at timestamptz DEFAULT now();

-- Add trigger to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_checklist_items_updated_at BEFORE UPDATE
ON checklist_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();