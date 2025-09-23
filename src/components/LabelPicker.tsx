import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { addCardLabel, getLabelsByWorkspace, removeCardLabel } from '@api/labels';
import type { ID } from '../types/models';

type Props = {
  workspaceId: ID;
  cardId: ID;
  selectedLabelIds: ID[];
};

export default function LabelPicker({ workspaceId, cardId, selectedLabelIds }: Props) {
  const qc = useQueryClient();
  const labelsQuery = useQuery({
    queryKey: ['labels', workspaceId],
    queryFn: () => getLabelsByWorkspace(workspaceId),
    enabled: !!workspaceId,
  });

  const addMu = useMutation({
    mutationFn: (labelId: ID) => addCardLabel(cardId, labelId),
    onSuccess: () => {
      // refresh card details and board cards cache
      qc.invalidateQueries({ predicate: (q) => Array.isArray(q.queryKey) && q.queryKey.includes('card') });
      qc.invalidateQueries({ predicate: (q) => Array.isArray(q.queryKey) && q.queryKey.includes('cards') });
    },
  });
  const removeMu = useMutation({
    mutationFn: (labelId: ID) => removeCardLabel(cardId, labelId),
    onSuccess: () => {
      qc.invalidateQueries({ predicate: (q) => Array.isArray(q.queryKey) && q.queryKey.includes('card') });
      qc.invalidateQueries({ predicate: (q) => Array.isArray(q.queryKey) && q.queryKey.includes('cards') });
    },
  });

  if (labelsQuery.isLoading) return <div className="text-muted text-sm">Loading labels…</div>;
  if (labelsQuery.error) return <div className="text-red-500 text-sm">Failed to load labels</div>;
  const labels = labelsQuery.data ?? [];

  return (
    <div className="flex flex-wrap gap-2">
      {labels.map((l) => {
        const selected = selectedLabelIds.includes(l.id);
        return (
          <button
            key={l.id}
            type="button"
            className={`px-2 py-1 rounded text-xs font-medium border ${selected ? 'border-white/70' : 'border-app'}`}
            title={l.name}
            style={{ backgroundColor: l.color, color: 'white' }}
            onClick={() => (selected ? removeMu.mutate(l.id) : addMu.mutate(l.id))}
          >
            {l.name}
          </button>
        );
      })}
    </div>
  );
}
