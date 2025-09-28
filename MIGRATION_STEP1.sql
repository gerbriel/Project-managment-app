-- =============================================
-- BASIC Migration - Run Each Block Separately
-- =============================================

-- BLOCK 1: Add due_date column
ALTER TABLE checklist_items ADD COLUMN due_date timestamptz;