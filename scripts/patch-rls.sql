-- Apply this in Supabase SQL editor to fix RLS recursion issues
-- 1) Make is_workspace_member SECURITY DEFINER to read workspace_members safely
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

-- ensure all roles can execute this helper safely (called only within policies)
grant execute on function public.is_workspace_member(uuid, uuid) to authenticated, anon;

-- 2) Replace recursive workspace_members policy with self-scoped policies
drop policy if exists "workspace member manage" on workspace_members;

create policy "workspace_members self select" on workspace_members
for select using (auth.uid() = user_id);

create policy "workspace_members self insert" on workspace_members
for insert with check (auth.uid() = user_id);

create policy "workspace_members self update" on workspace_members
for update using (auth.uid() = user_id);

create policy "workspace_members self delete" on workspace_members
for delete using (auth.uid() = user_id);

-- 2b) Add location columns to cards if missing
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'cards' and column_name = 'location_lat'
  ) then
    alter table public.cards add column location_lat double precision;
  end if;
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'cards' and column_name = 'location_lng'
  ) then
    alter table public.cards add column location_lng double precision;
  end if;
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'cards' and column_name = 'location_address'
  ) then
    alter table public.cards add column location_address text;
  end if;
end$$;

-- Allow inserting activity rows when the caller is a member of the card's workspace
drop policy if exists "activity insert" on activity;
create policy "activity insert" on activity
for insert with check (
  exists(
    select 1 from cards c
    where c.id = card_id and is_workspace_member(auth.uid(), c.workspace_id)
  )
);

-- 3) Activity logging helper and triggers (optional but recommended)
-- Helper to write activity rows as the current auth user
create or replace function public.log_activity(p_card_id uuid, p_type text, p_meta jsonb)
returns void
security definer
set search_path = public
language sql as $$
  insert into activity(card_id, type, meta, actor_id)
  values (p_card_id, p_type, p_meta, coalesce(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid));
$$;

-- Cards trigger: title/dates/description updates
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
    -- location changes
    if new.location_lat is distinct from old.location_lat
       or new.location_lng is distinct from old.location_lng
       or new.location_address is distinct from old.location_address then
      perform public.log_activity(
        new.id,
        'update.location',
        jsonb_build_object(
          'fromLat', old.location_lat,
          'fromLng', old.location_lng,
          'fromAddress', old.location_address,
          'toLat', new.location_lat,
          'toLng', new.location_lng,
          'toAddress', new.location_address
        )
      );
    end if;
    -- list moves
    if new.list_id is distinct from old.list_id then
      perform public.log_activity(
        new.id,
        'move.list',
        jsonb_build_object('fromListId', old.list_id, 'toListId', new.list_id)
      );
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_cards_activity on cards;
create trigger trg_cards_activity
after update on cards
for each row execute function public.trg_cards_activity();

-- Card labels trigger: add/remove
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

-- Attachments trigger: add/remove
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
  elsif TG_OP = 'UPDATE' then
    if new.name is distinct from old.name then
      perform public.log_activity(new.card_id, 'attachment.rename', jsonb_build_object('id', new.id, 'from', old.name, 'to', new.name));
    end if;
    return new;
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
drop trigger if exists trg_attachments_activity_upd on attachments;
create trigger trg_attachments_activity_upd
after update on attachments
for each row execute function public.trg_attachments_activity();

-- Checklists trigger: add checklist
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

-- Checklist items trigger: add/toggle done
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
  elsif TG_OP = 'DELETE' then
    perform public.log_activity(v_card, 'checklist.item.remove', jsonb_build_object('id', old.id, 'text', old.text));
    return old;
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
