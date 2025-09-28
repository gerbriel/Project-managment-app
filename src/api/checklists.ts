import { getSupabase } from '../app/supabaseClient';

export async function deleteWorkflow(workflowId: string) {
  const supabase = getSupabase();
  const { error } = await supabase
    .from('checklists')
    .delete()
    .eq('id', workflowId);
  
  if (error) throw error;
}

export async function deleteTask(taskId: string) {
  const supabase = getSupabase();
  const { error } = await supabase
    .from('checklist_items')
    .delete()
    .eq('id', taskId);
  
  if (error) throw error;
}

// Legacy function names for backward compatibility
export const deleteChecklist = deleteWorkflow;
export const deleteChecklistItem = deleteTask;