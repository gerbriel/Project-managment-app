import { getSupabase } from '../app/supabaseClient';
import type { ListRow } from '../types/dto';

export async function getListsByBoard(boardId: string): Promise<ListRow[]> {
	const supabase = getSupabase();
	const { data, error } = await supabase
		.from('lists')
		.select('id, board_id, name, position')
		.eq('board_id', boardId)
		.order('position', { ascending: true });
	if (error) throw error;
	return data ?? [];
}

export default { getListsByBoard };

export async function renameList(listId: string, name: string) {
	const supabase = getSupabase();
	const { error } = await supabase.from('lists').update({ name }).eq('id', listId);
	if (error) throw error;
}

export async function createList(boardId: string, name = 'New List') {
	const supabase = getSupabase();
	// Find last position on this board
	const { data: last, error: selErr } = await supabase
		.from('lists')
		.select('position')
		.eq('board_id', boardId)
		.order('position', { ascending: false })
		.limit(1)
		.maybeSingle();
	if (selErr && selErr.code !== 'PGRST116') throw selErr;
	const nextPos = (last?.position ?? 0) + 1;
	const { data, error: insErr } = await supabase
		.from('lists')
		.insert({ board_id: boardId, name, position: nextPos })
		.select('id')
		.single();
	if (insErr) throw insErr;
	return data;
}

export async function deleteList(listId: string) {
	const supabase = getSupabase();
	const { error } = await supabase.from('lists').delete().eq('id', listId);
	if (error) throw error;
}

export async function archiveList(listId: string) {
	const supabase = getSupabase();
	// Find the board/workspace for this list
	const { data: list, error: lErr } = await supabase
		.from('lists')
		.select('id, board_id, boards:boards(id, workspace_id)')
		.eq('id', listId)
		.maybeSingle();
	if (lErr) throw lErr;
	if (!list) throw new Error('List not found');
	const boardId = (list as any).board_id as string;
	const wsId = (list as any).boards?.workspace_id as string | undefined;

	// Ensure Archive board exists in workspace
	let { data: board, error: bErr } = await supabase
		.from('boards')
		.select('id')
		.eq('workspace_id', wsId)
		.eq('name', 'Archive')
		.maybeSingle();
	if (bErr && bErr.code !== 'PGRST116') throw bErr;
	if (!board) {
		const { data: bIns, error: bInsErr } = await supabase
			.from('boards')
			.insert({ workspace_id: wsId, name: 'Archive' })
			.select('id')
			.single();
		if (bInsErr) throw bInsErr;
		board = bIns;
	}

	// Ensure Archived list exists in that board
	let { data: archivedList, error: aErr } = await supabase
		.from('lists')
		.select('id, position')
		.eq('board_id', board.id)
		.eq('name', 'Archived')
		.maybeSingle();
	if (aErr && aErr.code !== 'PGRST116') throw aErr;
	if (!archivedList) {
		const { data: lIns, error: lInsErr } = await supabase
			.from('lists')
			.insert({ board_id: board.id, name: 'Archived', position: 1 })
			.select('id, position')
			.single();
		if (lInsErr) throw lInsErr;
		archivedList = lIns;
	}

	// Move all cards from the source list into the archived list (append to end)
	const { data: last, error: lastErr } = await supabase
		.from('cards')
		.select('position')
		.eq('list_id', archivedList.id)
		.order('position', { ascending: false })
		.limit(1)
		.maybeSingle();
	if (lastErr && lastErr.code !== 'PGRST116') throw lastErr;
	let pos = (last?.position ?? 0) + 1;

	const { data: cards, error: cErr } = await supabase
		.from('cards')
		.select('id')
		.eq('list_id', listId);
	if (cErr) throw cErr;
	for (const c of cards || []) {
		const { error: upErr } = await supabase
			.from('cards')
			.update({ board_id: board.id, list_id: archivedList.id, position: pos++ })
			.eq('id', (c as any).id);
		if (upErr) throw upErr;
	}

	// Finally, delete the now-empty list
	const { error: delErr } = await supabase.from('lists').delete().eq('id', listId);
	if (delErr) throw delErr;
}

export async function moveList(listId: string, targetBoardId: string) {
	const supabase = getSupabase();
	
	// Get the highest position in the target board
	const { data: lastList, error: posErr } = await supabase
		.from('lists')
		.select('position')
		.eq('board_id', targetBoardId)
		.order('position', { ascending: false })
		.limit(1)
		.maybeSingle();
	if (posErr && posErr.code !== 'PGRST116') throw posErr;
	
	const nextPosition = (lastList?.position ?? 0) + 1;
	
	// Move the list to the target board
	const { error: listErr } = await supabase
		.from('lists')
		.update({ board_id: targetBoardId, position: nextPosition })
		.eq('id', listId);
	if (listErr) throw listErr;
	
	// Move all cards in the list to the target board as well
	const { error: cardsErr } = await supabase
		.from('cards')
		.update({ board_id: targetBoardId })
		.eq('list_id', listId);
	if (cardsErr) throw cardsErr;
}