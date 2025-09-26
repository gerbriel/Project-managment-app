import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

interface Board {
  id: string;
  name: string;
}

interface ListMoveModalProps {
  isOpen: boolean;
  onClose: () => void;
  listId: string;
  listName: string;
  currentBoardId: string;
  workspaceId: string;
  onSuccess: () => void;
}

export default function ListMoveModal({
  isOpen,
  onClose,
  listId,
  listName,
  currentBoardId,
  workspaceId,
  onSuccess
}: ListMoveModalProps) {
  const [boards, setBoards] = useState<Board[]>([]);
  const [selectedBoardId, setSelectedBoardId] = useState('');
  const [includeCards, setIncludeCards] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && workspaceId) {
      loadBoards();
    }
  }, [isOpen, workspaceId]);

  const loadBoards = async () => {
    try {
      const { data, error } = await supabase
        .from('boards')
        .select('id, name')
        .eq('workspace_id', workspaceId)
        .neq('id', currentBoardId)
        .order('name');

      if (error) throw error;
      setBoards(data || []);
    } catch (err) {
      console.error('Error loading boards:', err);
      setError('Failed to load boards');
    }
  };

  const handleMove = async () => {
    if (!selectedBoardId) {
      setError('Please select a target board');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { error } = await supabase.rpc('move_list_between_boards', {
        p_list_id: listId,
        p_to_board: selectedBoardId,
        p_include_cards: includeCards
      });

      if (error) throw error;

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error moving list:', err);
      setError(err.message || 'Failed to move list');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
        <h2 className="text-lg font-semibold mb-4">Move List</h2>
        
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Move "{listName}" to another board
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Target Board</label>
            <select
              value={selectedBoardId}
              onChange={(e) => setSelectedBoardId(e.target.value)}
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
              disabled={isLoading}
            >
              <option value="">Select a board...</option>
              {boards.map((board) => (
                <option key={board.id} value={board.id}>
                  {board.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="includeCards"
              checked={includeCards}
              onChange={(e) => setIncludeCards(e.target.checked)}
              disabled={isLoading}
              className="rounded"
            />
            <label htmlFor="includeCards" className="text-sm">
              Move cards with the list
            </label>
          </div>

          {!includeCards && (
            <p className="text-xs text-gray-500">
              Cards will remain on the current board in a new "kept" list
            </p>
          )}
        </div>

        <div className="flex justify-end space-x-2 mt-6">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
          >
            Cancel
          </button>
          <button
            onClick={handleMove}
            disabled={isLoading || !selectedBoardId}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {isLoading ? 'Moving...' : 'Move List'}
          </button>
        </div>
      </div>
    </div>
  );
}
