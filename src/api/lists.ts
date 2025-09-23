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