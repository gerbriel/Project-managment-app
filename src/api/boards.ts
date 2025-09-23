import { getSupabase } from '../app/supabaseClient';
import type { ID } from '../types/models';
import type { ListRow } from '../types/dto';

export type BoardRow = { id: ID; workspace_id: ID; name: string };

export async function getBoardsByWorkspace(workspaceId: ID): Promise<BoardRow[]> {
	const supabase = getSupabase();
	const { data, error } = await supabase
		.from('boards')
		.select('id, workspace_id, name')
		.eq('workspace_id', workspaceId)
		.order('name', { ascending: true });
	if (error) throw error;
	return data ?? [];
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

export async function getMyBoards(): Promise<BoardRow[]> {
	const supabase = getSupabase();
	const { data, error } = await supabase
		.from('boards')
		.select('id, workspace_id, name')
		.order('name', { ascending: true });
	if (error) throw error;
	return data ?? [];
}

export default { getBoardsByWorkspace, getListsByBoard, getMyBoards };