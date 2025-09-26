import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ID } from '../types/models';
import { listWorkspaceMembers, getCardAssignees, addAssignee, removeAssignee } from '@api/assignees';

type Props = {
  workspaceId: ID;
  cardId: ID;
};

export default function MembersPicker({ workspaceId, cardId }: Props) {
  const qc = useQueryClient();
  const membersQ = useQuery({ queryKey: ['ws-members', workspaceId], queryFn: () => listWorkspaceMembers(workspaceId), enabled: !!workspaceId });
  const assignedQ = useQuery({ queryKey: ['card-assignees', cardId], queryFn: () => getCardAssignees(cardId), enabled: !!cardId });

  const addMu = useMutation({
    mutationFn: (uid: ID) => addAssignee(cardId, uid),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['card-assignees', cardId] });
      qc.invalidateQueries({ predicate: (q) => Array.isArray(q.queryKey) && q.queryKey.includes('activity') });
    },
  });
  const rmMu = useMutation({
    mutationFn: (uid: ID) => removeAssignee(cardId, uid),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['card-assignees', cardId] });
      qc.invalidateQueries({ predicate: (q) => Array.isArray(q.queryKey) && q.queryKey.includes('activity') });
    },
  });

  if (membersQ.isLoading || assignedQ.isLoading) return <div className="text-sm text-muted">Loading members…</div>;
  if (membersQ.error) {
    const is404 = (membersQ.error as any)?.status === 404 || String((membersQ.error as any)?.message || '').includes('missing-rpc:list_workspace_members');
    return (
      <div className="text-sm text-red-500">
        {is404 ? (
          <div>
            Workspace members RPC is missing. Please apply schema/schema.sql in Supabase (includes list_workspace_members and card_assignees) and re-run the seed.
          </div>
        ) : (
          'Failed to load workspace members'
        )}
      </div>
    );
  }
  const members = membersQ.data ?? [];
  const assigned: string[] = assignedQ.data ?? [];

  return (
    <div className="space-y-2">
      {members.length === 0 ? (
        <div className="text-sm text-muted">No workspace members</div>
      ) : (
        members.map((m) => {
          const isAssigned = assigned.includes(m.user_id);
          return (
            <div key={m.user_id} className="flex items-center justify-between rounded border border-app px-2 py-1 text-sm">
              <div className="truncate">
                <span className="text-fg">{m.user_id}</span>
                <span className="ml-2 text-muted">({m.role})</span>
              </div>
              {isAssigned ? (
                <button className="px-2 py-0.5 rounded border border-app text-red-500" onClick={() => rmMu.mutate(m.user_id)}>
                  Remove
                </button>
              ) : (
                <button className="px-2 py-0.5 rounded border border-app" onClick={() => addMu.mutate(m.user_id)}>
                  Assign
                </button>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
