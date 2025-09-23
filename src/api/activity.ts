import { getSupabase } from '../app/supabaseClient';
import type { ID } from '../types/models';

export type ActivityRow = { id: ID; card_id: ID; type: string; meta?: any; actor_id: ID; created_at: string };

export async function getActivityByCard(cardId: ID): Promise<ActivityRow[]> {
	const sb = getSupabase();
	const { data, error } = await sb
		.from('activity')
		.select('id, card_id, type, meta, actor_id, created_at')
		.eq('card_id', cardId)
		.order('created_at', { ascending: false });
	if (error) throw error;
	return (data as ActivityRow[]) ?? [];
}

export default { getActivityByCard };