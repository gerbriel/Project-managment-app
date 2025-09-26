-- Fix for move_card RPC function to bypass RLS for activity table inserts
-- Apply this in Supabase SQL editor

create or replace function public.move_card(p_card_id uuid, p_to_board uuid, p_to_list uuid, p_position numeric)
returns void
language plpgsql
security definer  -- This allows bypassing RLS for activity table inserts
set search_path = public
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

  -- Activity logging (now bypasses RLS due to security definer)
  insert into activity(card_id, type, meta, actor_id)
  values (
    p_card_id,
    'move.board',
    jsonb_build_object('fromBoard', v_from_board, 'toBoard', p_to_board, 'fromList', v_from_list, 'toList', p_to_list),
    auth.uid()
  );
end;
$$;

-- Grant execute permissions to authenticated users
grant execute on function public.move_card(uuid, uuid, uuid, numeric) to authenticated;