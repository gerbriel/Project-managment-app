import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getBoards, getListsByBoard } from '@api/boards';
import { moveCard } from '@api/cards';
import type { CardRow } from '../types/dto';
import type { ID } from '../types/models';

type Props = {
  cards: CardRow[];
  currentBoardId: ID;
  currentListId: ID;
  onClose?: () => void;
  onMoved?: () => void;
};

export default function MoveCardsDialog({ cards, currentBoardId, currentListId, onClose, onMoved }: Props) {
  const boardsQ = useQuery({ 
    queryKey: ['boards'], 
    queryFn: () => getBoards('2a8f10d6-4368-43db-ab1d-ab783ec6e935') 
  });
  
  const [boardId, setBoardId] = React.useState<ID>(currentBoardId);
  const listsQ = useQuery({ 
    queryKey: ['lists-simple', boardId], 
    queryFn: () => getListsByBoard(boardId!), 
    enabled: !!boardId 
  });
  
  const [listId, setListId] = React.useState<ID | ''>('');
  const [isMoving, setIsMoving] = React.useState(false);

  // Set default list when lists load
  React.useEffect(() => {
    if (listsQ.data && listsQ.data.length > 0) {
      // Find a list that's not the current one
      const otherLists = listsQ.data.filter((l) => l.id !== currentListId);
      if (otherLists.length > 0) {
        setListId(otherLists[0].id);
      } else if (listsQ.data.length > 0) {
        setListId(listsQ.data[0].id);
      }
    }
  }, [listsQ.data, currentListId]);

  const submit = async () => {
    if (!listId || isMoving) return;
    
    setIsMoving(true);
    try {
      // Move all cards to the target list
      for (let i = 0; i < cards.length; i++) {
        const card = cards[i];
        await moveCard({ 
          cardId: card.id, 
          toBoardId: boardId, 
          toListId: listId, 
          position: i + 1 
        });
      }
      onMoved?.();
    } catch (error) {
      console.error('Failed to move cards:', error);
      alert('Failed to move cards. Please try again.');
    } finally {
      setIsMoving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="p-4 bg-bg-card text-fg border border-border rounded-xl shadow-card w-[400px] max-w-[90vw]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Move {cards.length} cards</h3>
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
                  {board.name}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm text-fg-muted mb-1">Target List</label>
            <select 
              className="w-full px-3 py-2 rounded border border-border bg-background"
              value={listId}
              onChange={(e) => setListId(e.target.value)}
              disabled={!listsQ.data || listsQ.data.length === 0}
            >
              <option value="">Select a list...</option>
              {listsQ.data?.map((list) => (
                <option key={list.id} value={list.id}>
                  {list.name} {list.id === currentListId ? '(current)' : ''}
                </option>
              ))}
            </select>
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
            disabled={!listId || isMoving || listId === currentListId}
          >
            {isMoving ? 'Moving...' : 'Move Cards'}
          </button>
        </div>
      </div>
    </div>
  );
}