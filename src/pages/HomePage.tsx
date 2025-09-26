import React from 'react';
import Topbar from '@components/Topbar';
import { useQuery } from '@tanstack/react-query';
import { getBoards } from '@api/boards';
import { useNavigate } from 'react-router-dom';

export default function HomePage() {
  const nav = useNavigate();
  const q = useQuery({ 
    queryKey: ['my-boards'], 
    queryFn: () => getBoards('2a8f10d6-4368-43db-ab1d-ab783ec6e935') 
  });

  return (
    <div className="min-h-screen bg-app text-app">
      <Topbar />
      <div className="p-6">
        <h1 className="text-2xl font-semibold mb-4">Your boards</h1>
        {q.isLoading ? (
          <div className="text-muted">Loading…</div>
        ) : q.error ? (
          <div className="text-red-500">Failed to load boards.</div>
        ) : (
          <div className="flex gap-3 flex-wrap">
            {(q.data ?? []).map((b: any) => (
              <button
                key={b.id}
                className="px-4 py-2 rounded bg-surface border border-app hover:bg-surface-2"
                onClick={() => nav(`/b/${b.id}/board`)}
              >
                {b.name}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
