import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getSupabase } from '../app/supabaseClient';
import type { ID } from '../types/models';

type FieldDef = { id: string; name: string; type?: 'text' | 'number' };
type FieldVal = { field_id: string; value: any };

type Props = {
  workspaceId?: ID;
  cardId: ID;
  values?: FieldVal[] | null;
};

export default function CustomFieldsEditor({ workspaceId, cardId, values }: Props) {
  const qc = useQueryClient();
  const defsQuery = useQuery({
    queryKey: ['custom-field-defs', workspaceId],
    enabled: !!workspaceId,
    queryFn: async (): Promise<FieldDef[]> => {
      const sb = getSupabase();
      const { data, error } = await sb.from('custom_field_defs').select('id, name, type').eq('workspace_id', workspaceId);
      if (error) throw error;
      return (data as any[])?.map((d) => ({ id: d.id, name: d.name, type: (d.type as any) || 'text' })) ?? [];
    },
  });

  const mu = useMutation({
    mutationFn: async ({ fieldId, newValue }: { fieldId: ID; newValue: any }) => {
      const sb = getSupabase();
      // Upsert card_field_values
      const { error } = await sb.from('card_field_values').upsert({ card_id: cardId, field_id: fieldId, value: newValue }, { onConflict: 'card_id,field_id' });
      if (error) throw error;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ predicate: (q) => Array.isArray(q.queryKey) && (q.queryKey.includes('card') || q.queryKey[0] === 'custom-field-defs') });
    },
  });

  if (!workspaceId) return <div className="text-sm text-muted">No workspace</div>;
  if (defsQuery.isLoading) return <div className="text-sm text-muted">Loading fields…</div>;
  if (defsQuery.error) return <div className="text-sm text-red-500">Failed to load custom fields</div>;

  const defs = defsQuery.data ?? [];
  const valMap = new Map<string, any>();
  (values || []).forEach((v: any) => {
    try {
      const parsed = typeof v.value === 'string' ? JSON.parse(v.value) : v.value;
      valMap.set(v.field_id, parsed?.value ?? parsed ?? '');
    } catch {
      valMap.set(v.field_id, v.value ?? '');
    }
  });

  return (
    <div className="space-y-2">
      {defs.length === 0 ? (
        <div className="text-sm text-muted">No custom fields</div>
      ) : (
        defs.map((d) => {
          const current = valMap.get(d.id) ?? '';
          return (
            <div key={d.id} className="flex items-center gap-2 text-sm">
              <div className="w-40 text-fg-muted">{d.name}</div>
              <input
                className="flex-1 rounded border border-app bg-surface-2 px-2 py-1"
                type={d.type === 'number' ? 'number' : 'text'}
                value={current}
                onChange={(e) => {
                  const raw = e.target.value;
                  const val = d.type === 'number' ? (raw === '' ? '' : Number(raw)) : raw;
                  // Store as JSON to preserve structure similar to other fields
                  mu.mutate({ fieldId: d.id, newValue: { value: val } });
                }}
              />
            </div>
          );
        })
      )}
    </div>
  );
}
