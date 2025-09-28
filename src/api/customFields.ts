import { getSupabase } from '../app/supabaseClient';
import type { ID } from '../types/models';

export type CustomFieldDef = {
  id: ID;
  workspace_id: ID;
  name: string;
  type: 'text' | 'email' | 'phone' | 'number';
  options?: any;
};

export type CustomFieldValue = {
  card_id: ID;
  field_id: ID;
  value: any;
};

export async function createCustomField(
  workspaceId: ID,
  name: string,
  type: CustomFieldDef['type'],
  options?: any
): Promise<CustomFieldDef> {
  const supabase = getSupabase();
  
  const { data, error } = await supabase
    .from('custom_field_defs')
    .insert({
      workspace_id: workspaceId,
      name,
      type,
      options
    })
    .select('id, workspace_id, name, type, options')
    .single();
  
  if (error) throw error;
  return data;
}

export async function updateCustomField(
  fieldId: ID,
  updates: Partial<Pick<CustomFieldDef, 'name' | 'type' | 'options'>>
): Promise<void> {
  const supabase = getSupabase();
  
  const { error } = await supabase
    .from('custom_field_defs')
    .update(updates)
    .eq('id', fieldId);
  
  if (error) throw error;
}

export async function deleteCustomField(fieldId: ID): Promise<void> {
  const supabase = getSupabase();
  
  // First delete all field values for this field
  const { error: valuesError } = await supabase
    .from('card_field_values')
    .delete()
    .eq('field_id', fieldId);
  
  if (valuesError) throw valuesError;
  
  // Then delete the field definition
  const { error } = await supabase
    .from('custom_field_defs')
    .delete()
    .eq('id', fieldId);
  
  if (error) throw error;
}

export async function getCustomFields(workspaceId: ID): Promise<CustomFieldDef[]> {
  const supabase = getSupabase();
  
  const { data, error } = await supabase
    .from('custom_field_defs')
    .select('id, workspace_id, name, type, options')
    .eq('workspace_id', workspaceId)
    .order('name');
  
  if (error) throw error;
  return data || [];
}

export async function setCustomFieldValue(
  cardId: ID,
  fieldId: ID,
  value: any
): Promise<void> {
  const supabase = getSupabase();
  
  const { error } = await supabase
    .from('card_field_values')
    .upsert(
      {
        card_id: cardId,
        field_id: fieldId,
        value: value
      },
      { onConflict: 'card_id,field_id' }
    );
  
  if (error) throw error;
}