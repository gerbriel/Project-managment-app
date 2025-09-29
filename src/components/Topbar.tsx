import React, { useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { createCardInBoard } from '@api/cards';
import { createList } from '@api/lists';
import { useAuth } from '@contexts/AuthContext';
import ViewSwitcher from './ViewSwitcher';
import CardFilterPanel from './CardFilterPanel';
import GlobalSearchBar from './GlobalSearchBar';

export default function Topbar() {
  const location = useLocation();
  const params = useParams();
  const queryClient = useQueryClient();
  const { user, signOut } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);

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
      
      {/* Center: Global Search Bar */}
      <div className="flex-1 flex justify-center max-w-md mx-4">
        <GlobalSearchBar />
      </div>
      
      <div className="ml-auto flex items-center gap-2 md:gap-3">
        {isBoardPage && (
          <>
            <CardFilterPanel boardId={boardId} />
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
        
        {/* User Menu */}        
        {user && (
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="w-8 h-8 bg-accent text-white rounded-full flex items-center justify-center text-sm font-medium hover:opacity-90"
              title={user.email}
            >
              {user.email?.[0]?.toUpperCase() || 'U'}
            </button>
            
            {showUserMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
                <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50">
                  <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {user.email}
                    </p>
                  </div>
                  <div className="py-1">
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        signOut();
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      Sign out
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
        {/* View switcher moved to bottom-center popup */}
      </div>
      {isBoardPage && boardId ? <ViewSwitcher boardId={boardId} /> : null}
    </div>
  );
}
