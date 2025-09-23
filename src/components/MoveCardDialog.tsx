import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getBoardsByWorkspace, getListsByBoard } from '@api/boards';
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
  const boardsQ = useQuery({ queryKey: ['boards', workspaceId], queryFn: () => getBoardsByWorkspace(workspaceId) });
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
    const lists = listsQ.data ?? [];
    const targetList = lists.find((l) => l.id === listId);
    if (!targetList) return;
    const allCards = cardsQ.data ?? [];
    const cardsInList = allCards.filter((c) => c.list_id === targetList.id);
    const sorted = [...cardsInList].sort((a, b) => a.position - b.position);
    const position = positionChoice === 'top'
      ? (sorted[0]?.position ?? 0) - 1
      : (sorted[sorted.length - 1]?.position ?? 0) + 1;
    await moveCard({ cardId, toBoardId: boardId, toListId: targetList.id, position });
    onMoved?.({ boardId, listId: targetList.id });
    onClose?.();
  };

  return (
    <div className="p-4 bg-surface rounded border border-app shadow-lg w-[360px]">
      <h3 className="font-semibold mb-3">Move card</h3>
      <div className="space-y-3">
        <div>
          <label className="text-sm text-muted">Board</label>
          <select className="w-full mt-1 bg-surface-2 border border-app rounded p-2" value={boardId} onChange={(e) => setBoardId(e.target.value)}>
            {boardsQ.data?.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-sm text-muted">List</label>
          <select className="w-full mt-1 bg-surface-2 border border-app rounded p-2" value={listId} onChange={(e) => setListId(e.target.value)}>
            {listsQ.data?.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-sm text-muted">Position</label>
          <div className="mt-1 flex gap-3">
            <label className="inline-flex items-center gap-2 text-sm">
              <input type="radio" name="pos" checked={positionChoice === 'top'} onChange={() => setPositionChoice('top')} /> Top
            </label>
            <label className="inline-flex items-center gap-2 text-sm">
              <input type="radio" name="pos" checked={positionChoice === 'bottom'} onChange={() => setPositionChoice('bottom')} /> Bottom
            </label>
          </div>
        </div>
        <div className="pt-2 flex justify-end gap-2">
          <button className="px-3 py-1.5 rounded border border-app text-muted hover:text-app" onClick={onClose}>
            Cancel
          </button>
          <button className="px-3 py-1.5 rounded bg-accent text-white hover:opacity-90" onClick={submit} disabled={!listId}>
            Move
          </button>
        </div>
      </div>
    </div>
  );
}
