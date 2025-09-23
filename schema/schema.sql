create extension if not exists "uuid-ossp";

create table workspaces (
  id uuid primary key default uuid_generate_v4(),
  name text not null
);

create table workspace_members (
  workspace_id uuid not null references workspaces(id) on delete cascade,
  user_id uuid not null,
  role text not null default 'member',
  primary key (workspace_id, user_id)
);

create or replace function public.is_workspace_member(uid uuid, ws_id uuid)
returns boolean
security definer
set search_path = public
language sql stable as $$
  select exists (
    select 1 from workspace_members m
    where m.workspace_id = ws_id and m.user_id = uid
  );
$$;

create table boards (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  name text not null,
  background_url text
);

create table lists (
  id uuid primary key default uuid_generate_v4(),
  board_id uuid not null references boards(id) on delete cascade,
  name text not null,
  position numeric not null
);

-- WORKSPACE scoped
create table labels (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  name text not null,
  color text not null
);

create table custom_field_defs (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  name text not null,
  type text not null check (type in ('text','email','phone','number','checkbox','select','date')),
  options jsonb
);

create table cards (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  board_id uuid not null references boards(id) on delete cascade,
  list_id uuid not null references lists(id) on delete cascade,
  title text not null,
  description jsonb,
  location_lat double precision,
  location_lng double precision,
  location_address text,
  date_start timestamptz,
  date_end timestamptz,
  position numeric not null,
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table card_labels (
  card_id uuid not null references cards(id) on delete cascade,
  label_id uuid not null references labels(id) on delete cascade,
  primary key (card_id, label_id)
);

create table card_field_values (
  card_id uuid not null references cards(id) on delete cascade,
  field_id uuid not null references custom_field_defs(id) on delete cascade,
  value jsonb,
  primary key (card_id, field_id)
);

create table checklists (
  id uuid primary key default uuid_generate_v4(),
  card_id uuid not null references cards(id) on delete cascade,
  title text not null,
  position numeric not null
);

create table checklist_items (
  id uuid primary key default uuid_generate_v4(),
  checklist_id uuid not null references checklists(id) on delete cascade,
  text text not null,
  done boolean not null default false,
  position numeric not null
);

create table attachments (
  id uuid primary key default uuid_generate_v4(),
  card_id uuid not null references cards(id) on delete cascade,
  name text not null,
  url text not null,
  mime text not null,
  size bigint not null,
  added_by uuid not null,
  created_at timestamptz not null default now()
);

create table comments (
  id uuid primary key default uuid_generate_v4(),
  card_id uuid not null references cards(id) on delete cascade,
  author_id uuid not null,
  body text not null,
  created_at timestamptz not null default now()
);

create table activity (
  id uuid primary key default uuid_generate_v4(),
  card_id uuid not null references cards(id) on delete cascade,
  type text not null,
  meta jsonb,
  actor_id uuid not null,
  created_at timestamptz not null default now()
);

-- Indexes
create index on lists(board_id, position);
create index on cards(board_id, list_id, position);
create index on attachments(card_id);
create index on comments(card_id);
create index on activity(card_id, created_at desc);

-- RLS enable and policies (Supabase)
alter table workspaces enable row level security;
alter table workspace_members enable row level security;
alter table boards enable row level security;
alter table lists enable row level security;
alter table labels enable row level security;
alter table custom_field_defs enable row level security;
alter table cards enable row level security;
alter table card_labels enable row level security;
alter table card_field_values enable row level security;
alter table checklists enable row level security;
alter table checklist_items enable row level security;
alter table attachments enable row level security;
alter table comments enable row level security;
alter table activity enable row level security;

-- Allow members to read/write rows in their workspace
create policy "workspace read" on workspaces for select using (
  is_workspace_member(auth.uid(), id)
);
-- Replace recursive policy with self-based policies to avoid recursion via is_workspace_member
-- (Selecting workspace_members inside is_workspace_member should not recurse into a policy that calls it.)
create policy "workspace_members self select" on workspace_members for select using (
  auth.uid() = user_id
);
create policy "workspace_members self insert" on workspace_members for insert with check (
  auth.uid() = user_id
);
create policy "workspace_members self update" on workspace_members for update using (
  auth.uid() = user_id
);
create policy "workspace_members self delete" on workspace_members for delete using (
  auth.uid() = user_id
);
create policy "boards rw" on boards for all using (
  is_workspace_member(auth.uid(), workspace_id)
);
create policy "lists rw" on lists for all using (
  exists(select 1 from boards b where b.id = board_id and is_workspace_member(auth.uid(), b.workspace_id))
);
create policy "labels rw" on labels for all using (
  is_workspace_member(auth.uid(), workspace_id)
);
create policy 
  "custom_field_defs rw" on custom_field_defs for all using (
  is_workspace_member(auth.uid(), workspace_id)
);
create policy "cards rw" on cards for all using (
  is_workspace_member(auth.uid(), workspace_id)
);
create policy "card_labels rw" on card_labels for all using (
  exists(select 1 from cards c join labels l on l.id = label_id where c.id = card_id and c.workspace_id = l.workspace_id and is_workspace_member(auth.uid(), c.workspace_id))
);
create policy "card_field_values rw" on card_field_values for all using (
  exists(select 1 from cards c join custom_field_defs f on f.id = field_id where c.id = card_id and c.workspace_id = f.workspace_id and is_workspace_member(auth.uid(), c.workspace_id))
);
create policy "checklists rw" on checklists for all using (
  exists(select 1 from cards c where c.id = card_id and is_workspace_member(auth.uid(), c.workspace_id))
);
create policy "checklist_items rw" on checklist_items for all using (
  exists(select 1 from checklists cl join cards c on c.id = cl.card_id where cl.id = checklist_id and is_workspace_member(auth.uid(), c.workspace_id))
);
create policy "attachments rw" on attachments for all using (
  exists(select 1 from cards c where c.id = card_id and is_workspace_member(auth.uid(), c.workspace_id))
);
create policy "comments rw" on comments for all using (
  exists(select 1 from cards c where c.id = card_id and is_workspace_member(auth.uid(), c.workspace_id))
);
create policy "activity read" on activity for select using (
  exists(select 1 from cards c where c.id = card_id and is_workspace_member(auth.uid(), c.workspace_id))
);
create policy "activity insert" on activity for insert with check (
  exists(select 1 from cards c where c.id = card_id and is_workspace_member(auth.uid(), c.workspace_id))
);

-- RPC: move_card(card_id uuid, to_board uuid, to_list uuid, new_position numeric)
create or replace function public.move_card(p_card_id uuid, p_to_board uuid, p_to_list uuid, p_position numeric)
returns void
language plpgsql
as $$
declare
  v_ws uuid;
  v_from_board uuid;
  v_from_list uuid;
begin
  -- Check membership via workspace of the card
  select c.workspace_id, c.board_id, c.list_id into v_ws, v_from_board, v_from_list
  from cards c where c.id = p_card_id;

  if v_ws is null then
    raise exception 'Card not found';
  end if;
  if not is_workspace_member(auth.uid(), v_ws) then
    raise exception 'Not authorized';
  end if;

  -- Ensure target board is same workspace
  if not exists (select 1 from boards b where b.id = p_to_board and b.workspace_id = v_ws) then
    raise exception 'Target board not in same workspace';
  end if;

  -- Update card
  update cards set board_id = p_to_board, list_id = p_to_list, position = p_position, updated_at = now()
  where id = p_card_id;

  -- Activity
  insert into activity(card_id, type, meta, actor_id)
  values (
    p_card_id,
    'move.board',
    jsonb_build_object('fromBoard', v_from_board, 'toBoard', p_to_board, 'fromList', v_from_list, 'toList', p_to_list),
    auth.uid()
  );
end;
$$;

-- Activity logging triggers (server-side). These run as SECURITY DEFINER to bypass RLS for inserts into activity.
create or replace function public.log_activity(p_card_id uuid, p_type text, p_meta jsonb)
returns void
security definer
set search_path = public
language sql as $$
  insert into activity(card_id, type, meta, actor_id)
  values (p_card_id, p_type, p_meta, coalesce(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid));
$$;

-- Cards: title, dates, description changes
create or replace function public.trg_cards_activity()
returns trigger
security definer
set search_path = public
language plpgsql as $$
begin
  if TG_OP = 'UPDATE' then
    if new.title is distinct from old.title then
      perform public.log_activity(new.id, 'update.title', jsonb_build_object('from', old.title, 'to', new.title));
    end if;
    if new.date_start is distinct from old.date_start or new.date_end is distinct from old.date_end then
      perform public.log_activity(new.id, 'update.dates', jsonb_build_object('fromStart', old.date_start, 'toStart', new.date_start, 'fromEnd', old.date_end, 'toEnd', new.date_end));
    end if;
    if new.description is distinct from old.description then
      perform public.log_activity(new.id, 'update.description', jsonb_build_object());
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_cards_activity on cards;
create trigger trg_cards_activity
after update on cards
for each row execute function public.trg_cards_activity();

-- Card labels: add/remove
create or replace function public.trg_card_labels_activity()
returns trigger
security definer
set search_path = public
language plpgsql as $$
declare v_card uuid; v_label uuid;
begin
  if TG_OP = 'INSERT' then
    v_card := new.card_id; v_label := new.label_id;
    perform public.log_activity(v_card, 'label.add', jsonb_build_object('labelId', v_label));
    return new;
  elsif TG_OP = 'DELETE' then
    v_card := old.card_id; v_label := old.label_id;
    perform public.log_activity(v_card, 'label.remove', jsonb_build_object('labelId', v_label));
    return old;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_card_labels_activity_ins on card_labels;
create trigger trg_card_labels_activity_ins
after insert on card_labels
for each row execute function public.trg_card_labels_activity();
drop trigger if exists trg_card_labels_activity_del on card_labels;
create trigger trg_card_labels_activity_del
after delete on card_labels
for each row execute function public.trg_card_labels_activity();

-- Attachments: add/remove
create or replace function public.trg_attachments_activity()
returns trigger
security definer
set search_path = public
language plpgsql as $$
begin
  if TG_OP = 'INSERT' then
    perform public.log_activity(new.card_id, 'attachment.add', jsonb_build_object('id', new.id, 'name', new.name, 'url', new.url, 'mime', new.mime, 'size', new.size));
    return new;
  elsif TG_OP = 'DELETE' then
    perform public.log_activity(old.card_id, 'attachment.remove', jsonb_build_object('id', old.id, 'name', old.name, 'url', old.url));
    return old;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_attachments_activity_ins on attachments;
create trigger trg_attachments_activity_ins
after insert on attachments
for each row execute function public.trg_attachments_activity();
drop trigger if exists trg_attachments_activity_del on attachments;
create trigger trg_attachments_activity_del
after delete on attachments
for each row execute function public.trg_attachments_activity();

-- Checklists: add checklist
create or replace function public.trg_checklists_activity()
returns trigger
security definer
set search_path = public
language plpgsql as $$
declare v_card uuid;
begin
  if TG_OP = 'INSERT' then
    select c.id into v_card from cards c where c.id = new.card_id;
    perform public.log_activity(v_card, 'checklist.add', jsonb_build_object('id', new.id, 'title', new.title));
    return new;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_checklists_activity_ins on checklists;
create trigger trg_checklists_activity_ins
after insert on checklists
for each row execute function public.trg_checklists_activity();

-- Checklist items: add/toggle done
create or replace function public.trg_checklist_items_activity()
returns trigger
security definer
set search_path = public
language plpgsql as $$
declare v_card uuid;
begin
  select cl.card_id into v_card from checklists cl where cl.id = coalesce(new.checklist_id, old.checklist_id);
  if TG_OP = 'INSERT' then
    perform public.log_activity(v_card, 'checklist.item.add', jsonb_build_object('id', new.id, 'text', new.text));
    return new;
  elsif TG_OP = 'UPDATE' then
    if new.done is distinct from old.done then
      perform public.log_activity(v_card, 'checklist.item.toggle', jsonb_build_object('id', new.id, 'done', new.done));
    end if;
    return new;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_checklist_items_activity_ins on checklist_items;
create trigger trg_checklist_items_activity_ins
after insert on checklist_items
for each row execute function public.trg_checklist_items_activity();
drop trigger if exists trg_checklist_items_activity_upd on checklist_items;
create trigger trg_checklist_items_activity_upd
after update on checklist_items
for each row execute function public.trg_checklist_items_activity();
