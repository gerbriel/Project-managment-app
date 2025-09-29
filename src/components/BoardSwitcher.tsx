import React from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getBoards } from '@api/boards';

export default function BoardSwitcher() {
  const navigate = useNavigate();
  const location = useLocation();
  const { workspaceId, boardId } = useParams();
  const q = useQuery({
    queryKey: ['boards', workspaceId],
    queryFn: () => getBoards(String(workspaceId)),
    enabled: Boolean(workspaceId),
  });

  if (!workspaceId) return null;

  // Determine the current view from the pathname
  const getCurrentView = () => {
    const pathname = location.pathname;
    if (pathname.includes('/calendar')) return 'calendar';
    if (pathname.includes('/dashboard')) return 'dashboard';
    if (pathname.includes('/table')) return 'table';
    if (pathname.includes('/map')) return 'map';
    return 'board'; // default
  };

  const currentView = getCurrentView();

  return (
    <div className="flex gap-2">
      {(q.data ?? []).map((b: any) => (
        <button
          key={b.id}
          className={`px-3 py-1 rounded border border-app ${
            b.id === boardId 
              ? 'bg-accent text-white border-accent' 
              : 'bg-surface-2 hover:bg-surface'
          }`}
          onClick={() => navigate(`/b/${b.id}/${currentView}`)}
        >
          {b.name}
        </button>
      ))}
    </div>
  );
}
