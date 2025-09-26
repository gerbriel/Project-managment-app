import { getSupabase } from '../app/supabaseClient';
import type { ID } from '../types/models';
import type { CardRow } from '../types/dto';
import { logCardMove, logBoardMove } from './activityLogger';

// Location columns are part of the schema in this project. We'll attempt to read/write them
// and gracefully skip if the DB doesn't have them yet (e.g., before migration), instead of
// requiring an env flag. This avoids losing user input when the modal closes.
const isMissingLocationColumnsError = (err: any) => {
  // Postgres undefined_column
  if (err?.code === '42703') return true;
  // PostgREST schema cache / missing column errors
  if (err?.code === 'PGRST204' || err?.code === 'PGRST205') return true;
  // Some PostgREST errors use prefixed codes; also check message text defensively.
  const msg = (err?.message || '').toLowerCase();
  return msg.includes('column') && msg.includes('location_');
};

export async function moveCard(params: {
  cardId: ID;
  toBoardId: ID;
  toListId: ID;
  position: number;
}) {
  const supabase = getSupabase();
  
  // Get current card details for activity logging
  const { data: currentCard } = await supabase
    .from('cards')
    .select('board_id, list_id')
    .eq('id', params.cardId)
    .single();
  
  const fromBoardId = currentCard?.board_id;
  const fromListId = currentCard?.list_id;
  
  try {
    // Try the RPC function first
    const { error } = await supabase.rpc('move_card', {
      p_card_id: params.cardId,
      p_to_board: params.toBoardId,
      p_to_list: params.toListId,
      p_position: params.position,
    });
    if (error) throw error;
    
    // Log activity after successful move
    if (fromBoardId !== params.toBoardId) {
      // Board move (also changes list)
      await logBoardMove(params.cardId, fromBoardId, params.toBoardId, fromListId, params.toListId);
    } else if (fromListId !== params.toListId) {
      // List move within same board
      await logCardMove(params.cardId, fromListId, params.toListId);
    }
    
  } catch (rpcError: any) {
    // If RPC fails due to RLS on activity table, try direct update as fallback
    if (rpcError.code === '42501' || rpcError.message?.includes('row-level security')) {
      console.warn('RPC move_card failed due to RLS, falling back to direct update');
      
      // Fallback: direct update
      const { error: updateError } = await supabase
        .from('cards')
        .update({ 
          board_id: params.toBoardId,
          list_id: params.toListId,
          position: params.position,
          updated_at: new Date().toISOString()
        })
        .eq('id', params.cardId);
      
      if (updateError) {
        throw updateError;
      }
      
      // Log activity after successful fallback move
      if (fromBoardId !== params.toBoardId) {
        await logBoardMove(params.cardId, fromBoardId, params.toBoardId, fromListId, params.toListId);
      } else if (fromListId !== params.toListId) {
        await logCardMove(params.cardId, fromListId, params.toListId);
      }
      
      return;
    }
    
    // If it's a different error, re-throw it
    throw rpcError;
  }
}

export async function renameCard(cardId: ID, title: string) {
  const supabase = getSupabase();
  const { error } = await supabase.from('cards').update({ title }).eq('id', cardId);
  if (error) throw error;
}

export default { moveCard };

export async function getCardsByBoard(boardId: string): Promise<CardRow[]> {
  const supabase = getSupabase();
  const baseSelect = `
    id, workspace_id, board_id, list_id, title, description, date_start, date_end, position, created_by, created_at, updated_at,
    card_field_values:card_field_values(field_id, value, custom_field_defs:custom_field_defs(name)),
    card_labels:card_labels(label_id, labels:labels(id, name, color)),
    attachments:attachments(id, mime, url, created_at),
    comments:comments(id, author_id, created_at),
    checklists:checklists(id, checklist_items:checklist_items(id, done))
  `;
  const base = await supabase
    .from('cards')
    .select(baseSelect)
    .eq('board_id', boardId)
    .order('position', { ascending: true });
  if (base.error) throw base.error;
  const rows = (base.data ?? []) as any[];

  // Fetch location fields and merge; if columns don't exist yet, skip silently
  const loc = await supabase
    .from('cards')
    .select('id, location_lat, location_lng, location_address')
    .eq('board_id', boardId);
  if (!loc.error && Array.isArray(loc.data)) {
    const map = new Map<string, any>();
    for (const r of loc.data as any[]) map.set(r.id, r);
    for (const r of rows) {
      const m = map.get(r.id);
      if (m) {
        r.location_lat = m.location_lat;
        r.location_lng = m.location_lng;
        r.location_address = m.location_address;
      }
    }
  } else if (loc.error && !isMissingLocationColumnsError(loc.error)) {
    // Surface non-column-related errors
    throw loc.error;
  }
  return rows as CardRow[];
}

export async function getCardsWithDates(workspaceId: string): Promise<CardRow[]> {
  const supabase = getSupabase();
  const baseSelect = `
    id, workspace_id, board_id, list_id, title, description, date_start, date_end, position, created_by, created_at, updated_at,
    card_field_values:card_field_values(field_id, value, custom_field_defs:custom_field_defs(name)),
    card_labels:card_labels(label_id, labels:labels(id, name, color)),
    attachments:attachments(id, mime, url, created_at),
    comments:comments(id, author_id, created_at),
    checklists:checklists(id, checklist_items:checklist_items(id, done)),
    boards:boards(name)
  `;
  
  const { data, error } = await supabase
    .from('cards')
    .select(baseSelect)
    .eq('workspace_id', workspaceId)
    .not('date_start', 'is', null)
    .not('date_end', 'is', null)
    .order('date_start', { ascending: true });
    
  if (error) throw error;
  return (data ?? []) as CardRow[];
}

export async function updateCardDates(cardId: ID, dateStart?: string, dateEnd?: string): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase
    .from('cards')
    .update({ 
      date_start: dateStart || null, 
      date_end: dateEnd || null 
    })
    .eq('id', cardId);
    
  if (error) throw error;
}

export async function updateCardPosition(params: {
  cardId: ID;
  listId: ID;
  position: number;
}) {
  const supabase = getSupabase();
  const { error } = await supabase
    .from('cards')
    .update({ list_id: params.listId, position: params.position })
    .eq('id', params.cardId);
  if (error) throw error;
}

export function computeMidPosition(prev?: number, next?: number): number {
  const p = typeof prev === 'number' ? prev : 0;
  const n = typeof next === 'number' ? next : p + 2;
  return (p + n) / 2;
}

// Create a new card in a board. It will:
// - ensure there is at least one list (creates "Backlog" if none)
// - compute a position at the end of that list
// - insert a simple placeholder card title
export async function createCardInBoard(boardId: ID, title = 'New card'): Promise<{ id: ID }> {
  const sb = getSupabase();

  // Get user id for created_by
  const { data: sess } = await sb.auth.getSession();
  const userId = sess.session?.user.id;
  if (!userId) throw new Error('Not signed in');

  // Fetch board for workspace_id
  const { data: board, error: bErr } = await sb
    .from('boards')
    .select('id, workspace_id')
    .eq('id', boardId)
    .maybeSingle();
  if (bErr) throw bErr;
  if (!board) throw new Error('Board not found');

  // Ensure there is at least one list
  let { data: list, error: lErr } = await sb
    .from('lists')
    .select('id, position')
    .eq('board_id', boardId)
    .order('position', { ascending: true })
    .limit(1)
    .maybeSingle();
  if (lErr && lErr.code !== 'PGRST116') throw lErr;

  if (!list) {
    const { data: newList, error: insListErr } = await sb
      .from('lists')
      .insert({ board_id: boardId, name: 'Backlog', position: 1 })
      .select('id, position')
      .single();
    if (insListErr) throw insListErr;
    list = newList;
  }

  // Compute position at end of list
  const { data: lastCard, error: cSelErr } = await sb
    .from('cards')
    .select('position')
    .eq('list_id', list.id)
    .order('position', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (cSelErr && cSelErr.code !== 'PGRST116') throw cSelErr;
  const nextPos = (lastCard?.position ?? 0) + 1;

  // Insert card
  const { data: cardRow, error: cInsErr } = await sb
    .from('cards')
    .insert({
      workspace_id: board.workspace_id,
      board_id: boardId,
      list_id: list.id,
      title,
      description: null,
      date_start: null,
      date_end: null,
      position: nextPos,
      created_by: userId,
    })
    .select('id')
    .single();
  if (cInsErr) throw cInsErr;

  return { id: cardRow.id as ID };
}

export async function deleteCard(cardId: ID): Promise<void> {
  const sb = getSupabase();
  const { error } = await sb.from('cards').delete().eq('id', cardId);
  if (error) throw error;
}

export async function archiveCard(cardId: ID): Promise<void> {
  const sb = getSupabase();
  // Find current card for workspace
  const { data: card, error: cErr } = await sb
    .from('cards')
    .select('workspace_id')
    .eq('id', cardId)
    .maybeSingle();
  if (cErr) throw cErr;
  if (!card) throw new Error('Card not found');
  const wsId = (card as any).workspace_id as ID;

  // Ensure Archive board exists
  let { data: board, error: bErr } = await sb
    .from('boards')
    .select('id')
    .eq('workspace_id', wsId)
    .eq('name', 'Archive')
    .maybeSingle();
  if (bErr && bErr.code !== 'PGRST116') throw bErr;
  if (!board) {
    const { data: bIns, error: bInsErr } = await sb
      .from('boards')
      .insert({ workspace_id: wsId, name: 'Archive' })
      .select('id')
      .single();
    if (bInsErr) throw bInsErr;
    board = bIns;
  }

  // Ensure Archived list exists
  let { data: list, error: lErr } = await sb
    .from('lists')
    .select('id')
    .eq('board_id', board.id)
    .eq('name', 'Archived')
    .maybeSingle();
  if (lErr && lErr.code !== 'PGRST116') throw lErr;
  if (!list) {
    const { data: lIns, error: lInsErr } = await sb
      .from('lists')
      .insert({ board_id: board.id, name: 'Archived', position: 1 })
      .select('id')
      .single();
    if (lInsErr) throw lInsErr;
    list = lIns;
  }

  // Compute position at end
  const { data: last, error: lastErr } = await sb
    .from('cards')
    .select('position')
    .eq('list_id', list.id)
    .order('position', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (lastErr && lastErr.code !== 'PGRST116') throw lastErr;
  const nextPos = (last?.position ?? 0) + 1;

  const { error } = await sb
    .from('cards')
    .update({ board_id: board.id, list_id: list.id, position: nextPos })
    .eq('id', cardId);
  if (error) throw error;
}

export async function updateCardLocation(
  cardId: ID,
  args: { lat?: number | null; lng?: number | null; address?: string | null }
): Promise<{ skippedDueToMissingColumns?: boolean } | void> {
  console.log('updateCardLocation called with:', { cardId, args });
  
  const sb = getSupabase();
  
  // Get current location details for activity logging - but handle missing columns gracefully
  let currentCard: any = null;
  try {
    const { data } = await sb
      .from('cards')
      .select('location_lat, location_lng, location_address')
      .eq('id', cardId)
      .maybeSingle();
    currentCard = data;
  } catch (error: any) {
    if (isMissingLocationColumnsError(error)) {
      console.warn('Location columns not available for activity logging - migration needed');
      return { skippedDueToMissingColumns: true };
    }
    // Continue without location data for logging
  }
  
  const payload: any = {};
  if (typeof args.lat !== 'undefined') payload.location_lat = args.lat;
  if (typeof args.lng !== 'undefined') payload.location_lng = args.lng;
  if (typeof args.address !== 'undefined') payload.location_address = args.address;
  if (Object.keys(payload).length > 0) payload.updated_at = new Date().toISOString();
  
  console.log('updateCardLocation payload:', payload);
  
  // If payload is empty, skip
  if (Object.keys(payload).length === 0) {
    console.log('updateCardLocation: Empty payload, skipping');
    return;
  }
  
  try {
    const { data, error } = await sb
      .from('cards')
      .update(payload)
      .eq('id', cardId)
      .select('id, location_lat, location_lng, location_address')
      .maybeSingle();
      
    if (error) {
      console.error('updateCardLocation error:', error);
      if (isMissingLocationColumnsError(error)) {
        // Columns not present yet; skip without throwing to avoid wiping UI state.
        console.warn('Location columns not found in DB. Apply schema and refresh.');
        return { skippedDueToMissingColumns: true };
      }
      throw error;
    }
    
    // Log activity for location changes - only if we have current data
    if (currentCard) {
      try {
        const { logLocationUpdate } = await import('./activityLogger');
        await logLocationUpdate(
          cardId,
          currentCard?.location_address,
          args.address ?? null,
          currentCard?.location_lat,
          args.lat ?? null,
          currentCard?.location_lng,
          args.lng ?? null
        );
      } catch (activityError) {
        console.warn('Failed to log location activity:', activityError);
        // Don't throw - location update succeeded even if logging failed
      }
    }
    
    console.log('updateCardLocation: Success', data);
    
  } catch (error: any) {
    if (isMissingLocationColumnsError(error)) {
      console.warn('Location columns missing, skipping location update');
      return { skippedDueToMissingColumns: true };
    }
    throw error;
  }
}

export async function getBoardLocations(boardId: ID): Promise<Array<{ id: ID; title: string; lat: number; lng: number }>> {
  const sb = getSupabase();
  
  try {
    const { data, error } = await sb
      .from('cards')
      .select('id, title, location_lat, location_lng')
      .eq('board_id', boardId)
      .not('location_lat', 'is', null)
      .not('location_lng', 'is', null);
      
    if (error) {
      if (isMissingLocationColumnsError(error)) {
        console.warn('Location columns not found in database. Please run location migration.');
        return [];
      }
      throw error;
    }
    
    return (data || [])
      .filter((r) => typeof (r as any).location_lat === 'number' && typeof (r as any).location_lng === 'number')
      .map((r) => ({ id: (r as any).id, title: (r as any).title, lat: (r as any).location_lat as number, lng: (r as any).location_lng as number }));
      
  } catch (error: any) {
    if (isMissingLocationColumnsError(error)) {
      console.warn('Location columns not available:', error.message);
      return [];
    }
    console.error('getBoardLocations error:', error);
    return []; // Return empty array instead of throwing to prevent breaking the UI
  }
}
