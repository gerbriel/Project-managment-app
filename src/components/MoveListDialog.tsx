import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getBoards } from '@api/boards';
import { moveList } from '@api/lists';
import type { ID } from '../types/models';

type Props = {
  listId: ID;
  listName: string;
  currentBoardId: ID;
  onClose?: () => void;
  onMoved?: () => void;
};

export default function MoveListDialog({ listId, listName, currentBoardId, onClose, onMoved }: Props) {
  const boardsQ = useQuery({ 
    queryKey: ['boards'], 
    queryFn: () => getBoards('2a8f10d6-4368-43db-ab1d-ab783ec6e935') 
  });
  
  const [boardId, setBoardId] = React.useState<ID>(currentBoardId);
  const [isMoving, setIsMoving] = React.useState(false);

  const submit = async () => {
    if (!boardId || isMoving || boardId === currentBoardId) return;
    
    setIsMoving(true);
    try {
      await moveList(listId, boardId);
      onMoved?.();
    } catch (error) {
      console.error('Failed to move list:', error);
      alert('Failed to move list. Please try again.');
    } finally {
      setIsMoving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="p-4 bg-bg-card text-fg border border-border rounded-xl shadow-card w-[400px] max-w-[90vw]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Move "{listName}" list</h3>
          <button className="text-fg-subtle hover:text-fg" onClick={onClose}>✕</button>
        </div>
        
        <div className="space-y-3">
          <div>
            <label className="block text-sm text-fg-muted mb-1">Target Board</label>
            <select 
              className="w-full px-3 py-2 rounded border border-border bg-background"
              value={boardId}
              onChange={(e) => setBoardId(e.target.value)}
            >
              {boardsQ.data?.map((board) => (
                <option key={board.id} value={board.id}>
                  {board.name} {board.id === currentBoardId ? '(current)' : ''}
                </option>
              ))}
            </select>
          </div>
          
          <div className="text-sm text-fg-muted">
            This will move the entire list including all its cards to the selected board.
          </div>
        </div>
        
        <div className="flex justify-end gap-2 mt-4">
          <button 
            className="px-3 py-2 rounded hover:bg-muted"
            onClick={onClose}
            disabled={isMoving}
          >
            Cancel
          </button>
          <button 
            className="px-3 py-2 bg-accent text-white rounded hover:bg-accent/90 disabled:opacity-50"
            onClick={submit}
            disabled={!boardId || isMoving || boardId === currentBoardId}
          >
            {isMoving ? 'Moving...' : 'Move List'}
          </button>
        </div>
      </div>
    </div>
  );
}