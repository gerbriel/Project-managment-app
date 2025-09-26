import { getSupabase } from '../app/supabaseClient';
import type { ID } from '../types/models';
import type { ListRow } from '../types/dto';

export type BoardRow = { id: ID; workspace_id: ID; name: string };

export async function getBoards(workspaceId: ID): Promise<BoardRow[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('boards')
    .select('id, workspace_id, name')
    .eq('workspace_id', workspaceId)
    .order('name', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function getListsByBoard(boardId: ID): Promise<ListRow[]> {
	const supabase = getSupabase();
	const { data, error } = await supabase
		.from('lists')
		.select('id, board_id, name, position')
		.eq('board_id', boardId)
		.order('position', { ascending: true });
	if (error) throw error;
	return data ?? [];
}

export async function createBoard(workspaceId: ID, name: string): Promise<BoardRow> {
  const supabase = getSupabase();
  
  console.log('Creating board - workspace ID:', workspaceId, 'name:', name);
  
  // Simple payload without position since the column doesn't exist
  const payload = { workspace_id: workspaceId, name };
  
  console.log('Creating board with payload:', payload);
  
  const { data, error } = await supabase
    .from('boards')
    .insert(payload)
    .select('id, workspace_id, name')
    .single();
    
  if (error) {
    console.error('Board creation error:', error);
    throw error;
  }
  
  console.log('Board created successfully:', data);
  return data!;
}

export async function updateBoard(boardId: ID, updates: { name?: string }): Promise<BoardRow> {
  const supabase = getSupabase();
  
  const { data, error } = await supabase
    .from('boards')
    .update(updates)
    .eq('id', boardId)
    .select('id, workspace_id, name')
    .single();
    
  if (error) throw error;
  return data!;
}

export async function deleteBoard(boardId: ID): Promise<void> {
	const supabase = getSupabase();
	const { error } = await supabase.from('boards').delete().eq('id', boardId);
	if (error) throw error;
}

export async function archiveBoard(boardId: ID): Promise<void> {
  const supabase = getSupabase();
  
  // Get the board's workspace
  const { data: board, error: boardErr } = await supabase
    .from('boards')
    .select('workspace_id')
    .eq('id', boardId)
    .single();
  if (boardErr) throw boardErr;
  
  const wsId = board.workspace_id;
  
  // Ensure Archive board exists in workspace
  let { data: archiveBoard, error: archErr } = await supabase
    .from('boards')
    .select('id')
    .eq('workspace_id', wsId)
    .eq('name', 'Archive')
    .maybeSingle();
  if (archErr && archErr.code !== 'PGRST116') throw archErr;
  
  if (!archiveBoard) {
    const { data: newArchive, error: createErr } = await supabase
      .from('boards')
      .insert({ workspace_id: wsId, name: 'Archive' })
      .select('id')
      .single();
    if (createErr) throw createErr;
    archiveBoard = newArchive;
  }
  
  // Ensure Archived list exists in Archive board
  let { data: archivedList, error: listErr } = await supabase
    .from('lists')
    .select('id')
    .eq('board_id', archiveBoard.id)
    .eq('name', 'Archived')
    .maybeSingle();
  if (listErr && listErr.code !== 'PGRST116') throw listErr;
  
  if (!archivedList) {
    const { data: newList, error: createListErr } = await supabase
      .from('lists')
      .insert({ board_id: archiveBoard.id, name: 'Archived', position: 1 })
      .select('id')
      .single();
    if (createListErr) throw createListErr;
    archivedList = newList;
  }
  
  // Move all cards from all lists in the board to the archived list
  const { data: cards, error: cardsErr } = await supabase
    .from('cards')
    .select('id')
    .eq('board_id', boardId);
  if (cardsErr) throw cardsErr;
  
  // Get the last position in the archived list
  const { data: lastCard, error: lastErr } = await supabase
    .from('cards')
    .select('position')
    .eq('list_id', archivedList.id)
    .order('position', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (lastErr && lastErr.code !== 'PGRST116') throw lastErr;
  
  let nextPos = (lastCard?.position ?? 0) + 1;
  
  // Move all cards
  for (const card of cards || []) {
    const { error: updateErr } = await supabase
      .from('cards')
      .update({ 
        board_id: archiveBoard.id, 
        list_id: archivedList.id, 
        position: nextPos++ 
      })
      .eq('id', (card as any).id);
    if (updateErr) throw updateErr;
  }
  
  // Delete all lists in the board
  const { error: deleteListsErr } = await supabase
    .from('lists')
    .delete()
    .eq('board_id', boardId);
  if (deleteListsErr) throw deleteListsErr;
  
  // Finally delete the board
  const { error: deleteBoardErr } = await supabase
    .from('boards')
    .delete()
    .eq('id', boardId);
  if (deleteBoardErr) throw deleteBoardErr;
}

export default { getBoards, createBoard, updateBoard, deleteBoard, archiveBoard };