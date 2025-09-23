import React from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { createCardInBoard } from '@api/cards';
import ViewSwitcher from './ViewSwitcher';

export default function Topbar() {
  const location = useLocation();
  const params = useParams();
  const queryClient = useQueryClient();

  const isBoardPage = /^\/b\/.+\/(board|table|calendar|dashboard|map)$/.test(location.pathname);
  const boardId = params.boardId as string | undefined;

  const onNewCard = async () => {
    if (!boardId) return;
    try {
      await createCardInBoard(boardId, 'New card');
      await queryClient.invalidateQueries({ queryKey: ['cards', boardId] });
    } catch (e) {
      console.error('Failed to create card', e);
      alert('Failed to create card. Check console for details.');
    }
  };

  return (
    <div className="h-12 bg-surface border-b border-app flex items-center px-4 gap-3">
      <Link to="/" className="font-semibold accent">QMC Kanban</Link>
      <div className="ml-auto flex items-center gap-3">
        {isBoardPage && (
          <button
            onClick={onNewCard}
            className="px-3 py-1.5 rounded-md bg-accent text-white text-sm hover:opacity-90"
            title="Create a new card in this board"
          >
            New Card
          </button>
        )}
        {/* View switcher moved to bottom-center popup */}
        <div className="text-muted text-sm">Dark theme • Orange accent</div>
      </div>
      {isBoardPage && boardId ? <ViewSwitcher boardId={boardId} /> : null}
    </div>
  );
}
