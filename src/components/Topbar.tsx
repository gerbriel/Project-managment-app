import React from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { createCardInBoard } from '@api/cards';
import { createList } from '@api/lists';
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

  const onNewList = async () => {
    if (!boardId) return;
    try {
      await createList(boardId, 'New List');
      await queryClient.invalidateQueries({ queryKey: ['lists', boardId] });
    } catch (e) {
      console.error('Failed to create list', e);
      alert('Failed to create list. Check console for details.');
    }
  };

  return (
    <div className="h-12 bg-surface border-b border-app flex items-center px-4 gap-3">
      <div className="lg:hidden w-10"></div> {/* Spacer for mobile menu button */}
      <Link to="/" className="font-semibold accent">SouthElm</Link>
      <div className="ml-auto flex items-center gap-2 md:gap-3">
        {isBoardPage && (
          <>
            <button
              onClick={onNewCard}
              className="px-2 md:px-3 py-1.5 rounded-md bg-accent text-white text-xs md:text-sm hover:opacity-90"
              title="Create a new card in this board"
            >
              <span className="hidden md:inline">New Card</span>
              <span className="md:hidden">Card</span>
            </button>
            <button
              onClick={onNewList}
              className="px-2 md:px-3 py-1.5 rounded-md bg-accent/90 text-white text-xs md:text-sm hover:opacity-90"
              title="Create a new list in this board"
            >
              <span className="hidden md:inline">New List</span>
              <span className="md:hidden">List</span>
            </button>
          </>
        )}
        {/* View switcher moved to bottom-center popup */}
      </div>
      {isBoardPage && boardId ? <ViewSwitcher boardId={boardId} /> : null}
    </div>
  );
}
