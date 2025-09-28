-- COMPLETE PROJECT MANAGEMENT APP SQL SCHEMA
-- Run this entire script in Supabase Dashboard → SQL Editor

-- Start transaction to ensure atomicity
BEGIN;

-- Create UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Core schema tables
CREATE TABLE IF NOT EXISTS workspaces (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL
);

CREATE TABLE IF NOT EXISTS workspace_members (
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'member',
  PRIMARY KEY (workspace_id, user_id)
);

CREATE OR REPLACE FUNCTION public.is_workspace_member(uid uuid, ws_id uuid)
RETURNS boolean
SECURITY DEFINER
SET search_path = public
LANGUAGE sql STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM workspace_members m
    WHERE m.workspace_id = ws_id AND m.user_id = uid
  );
$$;

CREATE TABLE IF NOT EXISTS boards (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  background_url text
);

CREATE TABLE IF NOT EXISTS lists (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  board_id uuid NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  name text NOT NULL,
  position numeric NOT NULL
);

CREATE TABLE IF NOT EXISTS labels (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text NOT NULL
);

CREATE TABLE IF NOT EXISTS custom_field_defs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('text','email','phone','number','checkbox','select','date')),
  options jsonb
);

CREATE TABLE IF NOT EXISTS cards (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  board_id uuid NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  list_id uuid NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
  title text NOT NULL,
  description jsonb,
  location_lat double precision,
  location_lng double precision,
  location_address text,
  date_start timestamptz,
  date_end timestamptz,
  position numeric NOT NULL,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS card_labels (
  card_id uuid NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  label_id uuid NOT NULL REFERENCES labels(id) ON DELETE CASCADE,
  PRIMARY KEY (card_id, label_id)
);

CREATE TABLE IF NOT EXISTS card_field_values (
  card_id uuid NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  field_id uuid NOT NULL REFERENCES custom_field_defs(id) ON DELETE CASCADE,
  value jsonb,
  PRIMARY KEY (card_id, field_id)
);

CREATE TABLE IF NOT EXISTS checklists (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  card_id uuid NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  title text NOT NULL,
  position numeric NOT NULL
);

CREATE TABLE IF NOT EXISTS checklist_items (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  checklist_id uuid NOT NULL REFERENCES checklists(id) ON DELETE CASCADE,
  text text NOT NULL,
  done boolean NOT NULL DEFAULT false,
  position numeric NOT NULL
);

CREATE TABLE IF NOT EXISTS attachments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  card_id uuid NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  name text NOT NULL,
  url text NOT NULL,
  mime text NOT NULL,
  size bigint NOT NULL,
  added_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS comments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  card_id uuid NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  author_id uuid NOT NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS activity (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  card_id uuid NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  type text NOT NULL,
  meta jsonb,
  actor_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS card_assignees (
  card_id uuid NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  PRIMARY KEY (card_id, user_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS lists_board_position_idx ON lists(board_id, position);
CREATE INDEX IF NOT EXISTS cards_board_list_position_idx ON cards(board_id, list_id, position);
CREATE INDEX IF NOT EXISTS cards_board_loc_idx ON cards(board_id, location_lat, location_lng);
CREATE INDEX IF NOT EXISTS attachments_card_idx ON attachments(card_id);
CREATE INDEX IF NOT EXISTS comments_card_idx ON comments(card_id);
CREATE INDEX IF NOT EXISTS activity_card_created_idx ON activity(card_id, created_at DESC);

-- Enable RLS on all tables
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_field_defs ENABLE ROW LEVEL SECURITY;
ALTER TABLE cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE card_labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE card_field_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE card_assignees ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "workspace read" ON workspaces;
DROP POLICY IF EXISTS "workspace_members self select" ON workspace_members;
DROP POLICY IF EXISTS "workspace_members self insert" ON workspace_members;
DROP POLICY IF EXISTS "workspace_members self update" ON workspace_members;
DROP POLICY IF EXISTS "workspace_members self delete" ON workspace_members;
DROP POLICY IF EXISTS "boards rw" ON boards;
DROP POLICY IF EXISTS "lists rw" ON lists;
DROP POLICY IF EXISTS "labels rw" ON labels;
DROP POLICY IF EXISTS "custom_field_defs rw" ON custom_field_defs;
DROP POLICY IF EXISTS "cards rw" ON cards;
DROP POLICY IF EXISTS "card_labels rw" ON card_labels;
DROP POLICY IF EXISTS "card_field_values rw" ON card_field_values;
DROP POLICY IF EXISTS "checklists rw" ON checklists;
DROP POLICY IF EXISTS "checklist_items rw" ON checklist_items;
DROP POLICY IF EXISTS "attachments rw" ON attachments;
DROP POLICY IF EXISTS "comments rw" ON comments;
DROP POLICY IF EXISTS "activity read" ON activity;
DROP POLICY IF EXISTS "activity insert" ON activity;
DROP POLICY IF EXISTS "card_assignees rw" ON card_assignees;

-- Create RLS policies
CREATE POLICY "workspace read" ON workspaces FOR SELECT USING (
  is_workspace_member(auth.uid(), id)
);

CREATE POLICY "workspace_members self select" ON workspace_members FOR SELECT USING (
  auth.uid() = user_id
);
CREATE POLICY "workspace_members self insert" ON workspace_members FOR INSERT WITH CHECK (
  auth.uid() = user_id
);
CREATE POLICY "workspace_members self update" ON workspace_members FOR UPDATE USING (
  auth.uid() = user_id
);
CREATE POLICY "workspace_members self delete" ON workspace_members FOR DELETE USING (
  auth.uid() = user_id
);

CREATE POLICY "boards rw" ON boards FOR ALL USING (
  is_workspace_member(auth.uid(), workspace_id)
);

CREATE POLICY "lists rw" ON lists FOR ALL USING (
  EXISTS(SELECT 1 FROM boards b WHERE b.id = board_id AND is_workspace_member(auth.uid(), b.workspace_id))
);

CREATE POLICY "labels rw" ON labels FOR ALL USING (
  is_workspace_member(auth.uid(), workspace_id)
);

CREATE POLICY "custom_field_defs rw" ON custom_field_defs FOR ALL USING (
  is_workspace_member(auth.uid(), workspace_id)
);

CREATE POLICY "cards rw" ON cards FOR ALL USING (
  is_workspace_member(auth.uid(), workspace_id)
);

CREATE POLICY "card_labels rw" ON card_labels FOR ALL USING (
  EXISTS(SELECT 1 FROM cards c JOIN labels l ON l.id = label_id WHERE c.id = card_id AND c.workspace_id = l.workspace_id AND is_workspace_member(auth.uid(), c.workspace_id))
);

CREATE POLICY "card_field_values rw" ON card_field_values FOR ALL USING (
  EXISTS(SELECT 1 FROM cards c JOIN custom_field_defs f ON f.id = field_id WHERE c.id = card_id AND c.workspace_id = f.workspace_id AND is_workspace_member(auth.uid(), c.workspace_id))
);

CREATE POLICY "checklists rw" ON checklists FOR ALL USING (
  EXISTS(SELECT 1 FROM cards c WHERE c.id = card_id AND is_workspace_member(auth.uid(), c.workspace_id))
);

CREATE POLICY "checklist_items rw" ON checklist_items FOR ALL USING (
  EXISTS(SELECT 1 FROM checklists cl JOIN cards c ON c.id = cl.card_id WHERE cl.id = checklist_id AND is_workspace_member(auth.uid(), c.workspace_id))
);

CREATE POLICY "attachments rw" ON attachments FOR ALL USING (
  EXISTS(SELECT 1 FROM cards c WHERE c.id = card_id AND is_workspace_member(auth.uid(), c.workspace_id))
);

CREATE POLICY "comments rw" ON comments FOR ALL USING (
  EXISTS(SELECT 1 FROM cards c WHERE c.id = card_id AND is_workspace_member(auth.uid(), c.workspace_id))
);

CREATE POLICY "activity read" ON activity FOR SELECT USING (
  EXISTS(SELECT 1 FROM cards c WHERE c.id = card_id AND is_workspace_member(auth.uid(), c.workspace_id))
);

CREATE POLICY "activity insert" ON activity FOR INSERT WITH CHECK (
  EXISTS(SELECT 1 FROM cards c WHERE c.id = card_id AND is_workspace_member(auth.uid(), c.workspace_id))
);

CREATE POLICY "card_assignees rw" ON card_assignees FOR ALL USING (
  EXISTS(SELECT 1 FROM cards c WHERE c.id = card_id AND is_workspace_member(auth.uid(), c.workspace_id))
);

-- STORAGE RLS POLICIES FOR FILE UPLOADS
-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Drop ALL existing storage policies
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

-- Helper functions and triggers
CREATE OR REPLACE FUNCTION public.log_activity(p_card_id uuid, p_type text, p_meta jsonb)
RETURNS void
SECURITY DEFINER
SET search_path = public
LANGUAGE sql AS $$
  INSERT INTO activity(card_id, type, meta, actor_id)
  VALUES (p_card_id, p_type, p_meta, COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid));
$$;

-- Move card function
CREATE OR REPLACE FUNCTION public.move_card(p_card_id uuid, p_to_board uuid, p_to_list uuid, p_position numeric)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_ws uuid;
  v_from_board uuid;
  v_from_list uuid;
BEGIN
  SELECT c.workspace_id, c.board_id, c.list_id INTO v_ws, v_from_board, v_from_list
  FROM cards c WHERE c.id = p_card_id;

  IF v_ws IS NULL THEN
    RAISE EXCEPTION 'Card not found';
  END IF;
  IF NOT is_workspace_member(auth.uid(), v_ws) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM boards b WHERE b.id = p_to_board AND b.workspace_id = v_ws) THEN
    RAISE EXCEPTION 'Target board not in same workspace';
  END IF;

  UPDATE cards SET board_id = p_to_board, list_id = p_to_list, position = p_position, updated_at = now()
  WHERE id = p_card_id;

  INSERT INTO activity(card_id, type, meta, actor_id)
  VALUES (
    p_card_id,
    'move.board',
    jsonb_build_object('fromBoard', v_from_board, 'toBoard', p_to_board, 'fromList', v_from_list, 'toList', p_to_list),
    auth.uid()
  );
END;
$$;

-- List workspace members function
CREATE OR REPLACE FUNCTION public.list_workspace_members(p_ws_id uuid)
RETURNS TABLE(user_id uuid, role text)
SECURITY DEFINER
SET search_path = public
LANGUAGE sql STABLE AS $$
  SELECT m.user_id, m.role
  FROM workspace_members m
  WHERE m.workspace_id = p_ws_id;
$$;

-- Activity logging triggers
CREATE OR REPLACE FUNCTION public.trg_cards_activity()
RETURNS trigger
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.title IS DISTINCT FROM OLD.title THEN
      PERFORM public.log_activity(NEW.id, 'update.title', jsonb_build_object('from', OLD.title, 'to', NEW.title));
    END IF;
    IF NEW.date_start IS DISTINCT FROM OLD.date_start OR NEW.date_end IS DISTINCT FROM OLD.date_end THEN
      PERFORM public.log_activity(NEW.id, 'update.dates', jsonb_build_object('fromStart', OLD.date_start, 'toStart', NEW.date_start, 'fromEnd', OLD.date_end, 'toEnd', NEW.date_end));
    END IF;
    IF NEW.description IS DISTINCT FROM OLD.description THEN
      PERFORM public.log_activity(NEW.id, 'update.description', jsonb_build_object());
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cards_activity ON cards;
CREATE TRIGGER trg_cards_activity
AFTER UPDATE ON cards
FOR EACH ROW EXECUTE FUNCTION public.trg_cards_activity();

-- Additional activity triggers (attachments, labels, etc.)
CREATE OR REPLACE FUNCTION public.trg_attachments_activity()
RETURNS trigger
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.log_activity(NEW.card_id, 'attachment.add', jsonb_build_object('id', NEW.id, 'name', NEW.name, 'url', NEW.url, 'mime', NEW.mime, 'size', NEW.size));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM public.log_activity(OLD.card_id, 'attachment.remove', jsonb_build_object('id', OLD.id, 'name', OLD.name, 'url', OLD.url));
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_attachments_activity_ins ON attachments;
CREATE TRIGGER trg_attachments_activity_ins
AFTER INSERT ON attachments
FOR EACH ROW EXECUTE FUNCTION public.trg_attachments_activity();

DROP TRIGGER IF EXISTS trg_attachments_activity_del ON attachments;
CREATE TRIGGER trg_attachments_activity_del
AFTER DELETE ON attachments
FOR EACH ROW EXECUTE FUNCTION public.trg_attachments_activity();

-- Commit the transaction
COMMIT;

-- Verification queries
SELECT 'Tables created successfully' AS status;

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

SELECT id, name, public, file_size_limit 
FROM storage.buckets 
WHERE id = 'attachments';

-- Final success message
SELECT 'SETUP COMPLETE! File uploads should now work.' AS result;