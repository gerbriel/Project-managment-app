-- Run this in Supabase SQL editor if your 'cards' table lacks location columns
begin;

-- Ensure columns exist (idempotent)
alter table if exists public.cards add column if not exists location_lat double precision;
alter table if exists public.cards add column if not exists location_lng double precision;
alter table if exists public.cards add column if not exists location_address text;

-- Optional index for board-level map queries
create index if not exists cards_board_loc_idx on public.cards(board_id, location_lat, location_lng);

-- Ensure anon/authenticated can access the table (RLS still applies)
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on table public.cards to anon, authenticated;

commit;

-- Helper RPC to refresh PostgREST schema cache on demand
create or replace function public.reload_pgrst_schema()
returns void
security definer
set search_path = public
language sql as $$
  select pg_notify('pgrst', 'reload schema');
$$;

revoke all on function public.reload_pgrst_schema() from public;
grant execute on function public.reload_pgrst_schema() to anon, authenticated;

-- Trigger schema reload now
select public.reload_pgrst_schema();

-- Verify the columns exist (run result should list the three columns)
select column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and table_name = 'cards'
  and column_name in ('location_lat','location_lng','location_address');
