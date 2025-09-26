import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getBoards, getListsByBoard } from '@api/boards';
import { moveCard, getCardsByBoard } from '@api/cards';
import type { ID } from '../types/models';

type Props = {
  cardId: ID;
  currentBoardId: ID;
  currentListId: ID;
  workspaceId: ID;
  onClose?: () => void;
  onMoved?: (dest: { boardId: ID; listId: ID }) => void;
};

export default function MoveCardDialog({ cardId, currentBoardId, currentListId, workspaceId, onClose, onMoved }: Props) {
  const boardsQ = useQuery({ queryKey: ['boards', workspaceId], queryFn: () => getBoards(workspaceId) });
  const [boardId, setBoardId] = React.useState<ID>(currentBoardId);
  const listsQ = useQuery({ queryKey: ['lists-simple', boardId], queryFn: () => getListsByBoard(boardId!), enabled: !!boardId });
  const [listId, setListId] = React.useState<ID | ''>(currentListId);
  const [positionChoice, setPositionChoice] = React.useState<'top' | 'bottom'>('bottom');
  const cardsQ = useQuery({ queryKey: ['cards', boardId], queryFn: () => getCardsByBoard(String(boardId)), enabled: !!boardId });

  React.useEffect(() => {
    if (listsQ.data && listsQ.data.length > 0 && !listsQ.data.find((l) => l.id === listId)) {
      setListId(listsQ.data[0].id);
    }
  }, [listsQ.data]);

  const submit = async () => {
    if (!listId) return;
    
    try {
      const lists = listsQ.data ?? [];
      const targetList = lists.find((l) => l.id === listId);
      if (!targetList) return;
      
      const allCards = cardsQ.data ?? [];
      const cardsInList = allCards.filter((c) => c.list_id === targetList.id);
      const sorted = [...cardsInList].sort((a, b) => a.position - b.position);
      const position = positionChoice === 'top'
        ? (sorted[0]?.position ?? 0) - 1
        : (sorted[sorted.length - 1]?.position ?? 0) + 1;
        
      await moveCard({ cardId, toBoardId: boardId, toListId: listId, position });
      onMoved?.({ boardId, listId });
      onClose?.();
    } catch (error) {
      console.error('Failed to move card:', error);
      
      // Provide more detailed error messages
      let errorMessage = 'Failed to move card. Please try again.';
      
      if (error && typeof error === 'object') {
        const err = error as any;
        if (err.code === '42501') {
          errorMessage = 'Permission denied. You may not have access to move cards between these boards.';
        } else if (err.message?.includes('Not authorized')) {
          errorMessage = 'You are not authorized to move this card.';
        } else if (err.message?.includes('Card not found')) {
          errorMessage = 'Card not found. It may have been deleted or moved already.';
        } else if (err.message?.includes('Target board not in same workspace')) {
          errorMessage = 'Cannot move card to a board in a different workspace.';
        } else if (err.message?.includes('row-level security')) {
          errorMessage = 'Database permission error. The move_card function may need to be updated with proper security settings.';
        } else if (err.message) {
          errorMessage = `Failed to move card: ${err.message}`;
        }
      }
      
      alert(errorMessage);
    }
  };

  return (
    <div 
      className="p-4 bg-bg-card text-fg border border-border rounded-xl shadow-card w-[320px] max-w-[90vw] max-h-[90vh] overflow-y-auto"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">Move card</h3>
        <button className="text-fg-subtle hover:text-fg" onClick={onClose}>✕</button>
      </div>
      <div className="space-y-3">
        <div>
          <label className="block text-sm text-fg-muted mb-1">Board</label>
          <select 
            className="w-full px-3 py-2 rounded border border-border bg-background"
            value={boardId} 
            onChange={(e) => setBoardId(e.target.value)}
          >
            {boardsQ.data?.map((b: any) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm text-fg-muted mb-1">List</label>
          <select 
            className="w-full px-3 py-2 rounded border border-border bg-background"
            value={listId} 
            onChange={(e) => setListId(e.target.value)}
          >
            {listsQ.data?.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm text-fg-muted mb-1">Position</label>
          <div className="flex gap-4">
            <label className="inline-flex items-center gap-2 text-sm">
              <input 
                type="radio" 
                name="pos" 
                checked={positionChoice === 'top'} 
                onChange={() => setPositionChoice('top')}
                className="text-accent"
              /> 
              Top
            </label>
            <label className="inline-flex items-center gap-2 text-sm">
              <input 
                type="radio" 
                name="pos" 
                checked={positionChoice === 'bottom'} 
                onChange={() => setPositionChoice('bottom')}
                className="text-accent"
              /> 
              Bottom
            </label>
          </div>
        </div>
      </div>
      <div className="flex justify-end gap-2 mt-4">
        <button 
          className="px-3 py-2 rounded hover:bg-muted"
          onClick={onClose}
        >
          Cancel
        </button>
        <button 
          className="px-3 py-2 bg-accent text-white rounded hover:bg-accent/90 disabled:opacity-50"
          onClick={submit} 
          disabled={!listId}
        >
          Move
        </button>
      </div>
    </div>
  );
}
