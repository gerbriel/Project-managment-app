import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { getSupabase } from '../app/supabaseClient';
import type { ID } from '../types/models';
import { logDateUpdate } from '../api/activityLogger';

type Props = {
  cardId: ID;
  start?: string | null;
  end?: string | null;
};

export default function DateRangePicker({ cardId, start, end }: Props) {
  const qc = useQueryClient();
  const [s, setS] = React.useState<string>(start ?? '');
  const [e, setE] = React.useState<string>(end ?? '');

  React.useEffect(() => setS(start ? start.slice(0, 10) : ''), [start]);
  React.useEffect(() => setE(end ? end.slice(0, 10) : ''), [end]);

  const mu = useMutation({
    mutationFn: async (payload: { date_start: string | null; date_end: string | null }) => {
      const sb = getSupabase();
      
      // Store old values for activity logging
      const oldStart = start ? start.slice(0, 10) : null;
      const oldEnd = end ? end.slice(0, 10) : null;
      
      const { error } = await sb.from('cards').update(payload).eq('id', cardId);
      if (error) throw error;
      
      // Log activity
      await logDateUpdate(cardId, oldStart, payload.date_start, oldEnd, payload.date_end);
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ predicate: (q) => Array.isArray(q.queryKey) && q.queryKey.includes('cards') });
      await qc.invalidateQueries({ predicate: (q) => Array.isArray(q.queryKey) && q.queryKey.includes('card') });
    },
  });

  return (
    <div className="flex items-center gap-2 text-sm">
      <input
        type="date"
        className="rounded border border-app bg-surface-2 px-2 py-1"
        value={s}
        onChange={(ev) => {
          const v = ev.target.value || '';
          setS(v);
          mu.mutate({ date_start: v || null, date_end: e || null });
        }}
      />
      <span>→</span>
      <input
        type="date"
        className="rounded border border-app bg-surface-2 px-2 py-1"
        value={e}
        onChange={(ev) => {
          const v = ev.target.value || '';
          setE(v);
          mu.mutate({ date_start: s || null, date_end: v || null });
        }}
      />
    </div>
  );
}
