import { getSupabase } from '../app/supabaseClient';
import type { ID } from '../types/models';

export type WorkspaceMember = { user_id: string; role: string };

export async function listWorkspaceMembers(workspaceId: ID): Promise<WorkspaceMember[]> {
  const sb = getSupabase();
  const { data, error } = await sb.rpc('list_workspace_members', { p_ws_id: workspaceId });
  if (error) {
    const anyErr: any = error as any;
    if (anyErr?.status === 404) {
      const e = new Error('missing-rpc:list_workspace_members');
      (e as any).status = 404;
      throw e;
    }
    throw error;
  }
  return data ?? [];
}

export async function getCardAssignees(cardId: ID): Promise<string[]> {
  const sb = getSupabase();
  const { data, error } = await sb.from('card_assignees').select('user_id').eq('card_id', cardId);
  if (error) {
    const anyErr: any = error as any;
    if (anyErr?.status === 404) {
      const e = new Error('missing-table:card_assignees');
      (e as any).status = 404;
      throw e;
    }
    throw error;
  }
  return (data ?? []).map((r: any) => r.user_id);
}

export async function addAssignee(cardId: ID, userId: ID): Promise<void> {
  const sb = getSupabase();
  const { error } = await sb.from('card_assignees').insert({ card_id: cardId, user_id: userId });
  if (error) throw error;
}

export async function removeAssignee(cardId: ID, userId: ID): Promise<void> {
  const sb = getSupabase();
  const { error } = await sb.from('card_assignees').delete().eq('card_id', cardId).eq('user_id', userId);
  if (error) throw error;
}
