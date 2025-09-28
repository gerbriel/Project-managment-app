import React from 'react';
import { createPortal } from 'react-dom';
import { useQuery } from '@tanstack/react-query';
import { getSupabase } from '../app/supabaseClient';
import Icon from './Icon';
import type { ID } from '../types/models';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onRestore: (boardId: ID, listId: ID) => void;
  workspaceId?: ID;
  cardTitle: string;
};

type Board = {
  id: ID;
  name: string;
  lists: Array<{ id: ID; name: string }>;
};

export default function RestoreCardDialog({ 
  isOpen, 
  onClose, 
  onRestore, 
  workspaceId,
  cardTitle 
}: Props) {
  const [selectedBoardId, setSelectedBoardId] = React.useState<ID | null>(null);
  const [selectedListId, setSelectedListId] = React.useState<ID | null>(null);

  const boardsQuery = useQuery({
    queryKey: ['restore-boards', workspaceId],
    enabled: isOpen && !!workspaceId,
    queryFn: async (): Promise<Board[]> => {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('boards')
        .select('id, name, lists:lists(id, name)')
        .eq('workspace_id', workspaceId)
        .neq('name', 'Archive')
        .order('name');
      
      if (error) throw error;
      return (data as any[]) || [];
    },
  });

  const boards = boardsQuery.data || [];
  const selectedBoard = boards.find(b => b.id === selectedBoardId);

  React.useEffect(() => {
    if (boards.length > 0 && !selectedBoardId) {
      setSelectedBoardId(boards[0].id);
    }
  }, [boards, selectedBoardId]);

  React.useEffect(() => {
    if (selectedBoard && selectedBoard.lists && selectedBoard.lists.length > 0 && !selectedListId) {
      setSelectedListId(selectedBoard.lists[0].id);
    }
  }, [selectedBoard, selectedListId]);

  const handleRestore = () => {
    if (selectedBoardId && selectedListId) {
      onRestore(selectedBoardId, selectedListId);
      onClose();
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-surface rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-fg">Restore Card</h2>
            <button
              onClick={onClose}
              className="p-1 hover:bg-surface-2 rounded transition-colors"
            >
              <Icon name="x" size={20} />
            </button>
          </div>

          <div className="mb-4">
            <p className="text-sm text-fg-muted mb-2">
              Choose where to restore "{cardTitle}":
            </p>
          </div>

          {boardsQuery.isLoading ? (
            <div className="text-center py-4 text-fg-muted">Loading boards...</div>
          ) : boardsQuery.error ? (
            <div className="text-center py-4 text-red-500">Failed to load boards</div>
          ) : boards.length === 0 ? (
            <div className="text-center py-4 text-fg-muted">
              No boards available. Please create a board first.
            </div>
          ) : (
            <>
              <div className="mb-4">
                <label className="block text-sm font-medium text-fg mb-2">
                  Board
                </label>
                <select
                  className="w-full rounded border border-app bg-surface-2 px-3 py-2 text-fg"
                  value={selectedBoardId || ''}
                  onChange={(e) => {
                    setSelectedBoardId(e.target.value);
                    setSelectedListId(null); // Reset list selection
                  }}
                >
                  {boards.map((board) => (
                    <option key={board.id} value={board.id}>
                      {board.name}
                    </option>
                  ))}
                </select>
              </div>

              {selectedBoard && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-fg mb-2">
                    List
                  </label>
                  {selectedBoard.lists.length === 0 ? (
                    <div className="text-sm text-fg-muted py-2">
                      This board has no lists. Please create a list first.
                    </div>
                  ) : (
                    <select
                      className="w-full rounded border border-app bg-surface-2 px-3 py-2 text-fg"
                      value={selectedListId || ''}
                      onChange={(e) => setSelectedListId(e.target.value)}
                    >
                      {selectedBoard.lists.map((list) => (
                        <option key={list.id} value={list.id}>
                          {list.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              <div className="flex gap-3 justify-end">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-fg-muted hover:text-fg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRestore}
                  disabled={!selectedBoardId || !selectedListId}
                  className="px-4 py-2 bg-primary text-primary-fg rounded hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Restore Card
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}