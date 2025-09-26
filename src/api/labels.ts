import { getSupabase } from '../app/supabaseClient';
import type { ID } from '../types/models';
import { logLabelOperation } from './activityLogger';

export type WorkspaceLabel = { id: ID; name: string; color: string };

export async function getLabelsByWorkspace(workspaceId: ID): Promise<WorkspaceLabel[]> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from('labels')
    .select('id, name, color')
    .eq('workspace_id', workspaceId)
    .order('name', { ascending: true });
  if (error) throw error;
  return (data ?? []) as WorkspaceLabel[];
}

export async function addCardLabel(cardId: ID, labelId: ID): Promise<void> {
  const sb = getSupabase();
  const { error } = await sb.from('card_labels').insert({ card_id: cardId, label_id: labelId });
  if (error && error.code !== '23505') throw error; // ignore unique violation
  
  // Log activity (get label details for better logging)
  if (!error || error.code === '23505') {
    try {
      const { data: label } = await sb.from('labels').select('name, color').eq('id', labelId).single();
      await logLabelOperation(cardId, 'add', labelId, label?.name, label?.color);
    } catch {
      // Fallback without label details
      await logLabelOperation(cardId, 'add', labelId);
    }
  }
}

export async function removeCardLabel(cardId: ID, labelId: ID): Promise<void> {
  const sb = getSupabase();
  
  // Get label details before removal for logging
  const { data: label } = await sb.from('labels').select('name, color').eq('id', labelId).single();
  
  const { error } = await sb.from('card_labels').delete().eq('card_id', cardId).eq('label_id', labelId);
  if (error) throw error;
  
  // Log activity
  await logLabelOperation(cardId, 'remove', labelId, label?.name, label?.color);
}
