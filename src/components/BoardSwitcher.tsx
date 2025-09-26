import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getBoards } from '@api/boards';

export default function BoardSwitcher() {
  const navigate = useNavigate();
  const { workspaceId } = useParams();
  const q = useQuery({
    queryKey: ['boards', workspaceId],
    queryFn: () => getBoards(String(workspaceId)),
    enabled: Boolean(workspaceId),
  });

  if (!workspaceId) return null;

  return (
    <div className="flex gap-2">
      {(q.data ?? []).map((b: any) => (
        <button
          key={b.id}
          className="px-3 py-1 rounded bg-surface-2 hover:bg-surface border border-app"
          onClick={() => navigate(`/b/${b.id}/board`)}
        >
          {b.name}
        </button>
      ))}
    </div>
  );
}
