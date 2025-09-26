import React, { useState, useRef, useEffect } from 'react';
import { MoreHorizontal } from 'lucide-react';
import ListMoveModal from './ListMoveModal';

interface List {
  id: string;
  name: string;
}

interface BoardHeaderProps {
  boardName: string;
  boardId: string;
  workspaceId: string;
  lists: List[];
  onRefresh?: () => void;
}

export default function BoardHeader({ 
  boardName, 
  boardId, 
  workspaceId, 
  lists, 
  onRefresh 
}: BoardHeaderProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [selectedList, setSelectedList] = useState<List | null>(null);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMoveList = (list: List) => {
    setSelectedList(list);
    setShowMoveModal(true);
    setShowMenu(false);
  };

  return (
    <>
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <h1 className="text-2xl font-bold">{boardName}</h1>
        
        <div className="relative">
          <button
            ref={buttonRef}
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full"
          >
            <MoreHorizontal className="w-5 h-5" />
          </button>

          {showMenu && (
            <div
              ref={menuRef}
              className="absolute right-full top-0 mr-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50"
            >
              <div className="py-2">
                <div className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Move Lists
                </div>
                {lists.length > 0 ? (
                  lists.map((list) => (
                    <button
                      key={list.id}
                      onClick={() => handleMoveList(list)}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      Move "{list.name}"
                    </button>
                  ))
                ) : (
                  <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                    No lists available
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {selectedList && (
        <ListMoveModal
          isOpen={showMoveModal}
          onClose={() => {
            setShowMoveModal(false);
            setSelectedList(null);
          }}
          listId={selectedList.id}
          listName={selectedList.name}
          currentBoardId={boardId}
          workspaceId={workspaceId}
          onSuccess={() => {
            onRefresh?.();
            setSelectedList(null);
          }}
        />
      )}
    </>
  );
}
