import React from 'react';
import { CSS } from '@dnd-kit/utilities';
import { useSortable } from '@dnd-kit/sortable';
import type { CardRow } from '../types/dto';
import CardTile from './CardTile';
import CardModal from './CardModal';
import Icon from './Icon';
import MoveCardDialog from './MoveCardDialog';
import { useQueryClient } from '@tanstack/react-query';
import { renameCard } from '@api/cards';

type Props = { card: CardRow; dragging?: boolean };

export default function SortableCard({ card, dragging }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
    data: { type: 'card', cardId: card.id, listId: card.list_id },
  });
  const qc = useQueryClient();
  const [modalOpen, setModalOpen] = React.useState(false);
  const [moveOpen, setMoveOpen] = React.useState(false);
  const [editing, setEditing] = React.useState(false);
  const [title, setTitle] = React.useState(card.title);
  React.useEffect(() => setTitle(card.title), [card.title]);
  const clickTimer = React.useRef<number | null>(null);

  const commit = async () => {
    const newTitle = title.trim();
    setEditing(false);
    if (!newTitle || newTitle === card.title) return;
    // optimistic update in cache
    const qKey = ['cards', card.board_id];
    const prev = (qc.getQueryData(qKey) as any[]) || [];
    qc.setQueryData(qKey, prev.map((c) => (c.id === card.id ? { ...c, title: newTitle } : c)));
    try {
      await renameCard(card.id, newTitle);
      await qc.invalidateQueries({ queryKey: qKey });
    } catch (e) {
      console.error(e);
      qc.setQueryData(qKey, prev); // rollback
    }
  };

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : undefined,
  };

  const overdue = Boolean(card.date_end && new Date(card.date_end) < new Date());

  return (
    <div ref={setNodeRef} style={style} {...attributes} data-list-id={card.list_id} className="relative">
      <div
        className={`cursor-grab active:cursor-grabbing focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 ${
          isDragging && dragging ? 'animate-jiggle' : ''
        }`}
        {...listeners}
      >
        {editing ? (
          // When editing, we still render full CardTile but with the title swapped to an input
          <div onClick={(e) => e.stopPropagation()}>
            <CardTile
              title={card.title}
              overdue={overdue}
              card={card}
              editingTitle
              titleInputValue={title}
              onTitleInputChange={(v) => setTitle(v)}
              onTitleCommit={commit}
              onTitleCancel={() => {
                setTitle(card.title);
                setEditing(false);
              }}
            />
          </div>
        ) : (
          <div
            onClick={(e) => {
              e.stopPropagation();
              if (clickTimer.current) window.clearTimeout(clickTimer.current);
              // Single click: open the modal after a short delay, unless a double-click happens
              clickTimer.current = window.setTimeout(() => {
                setModalOpen(true);
                clickTimer.current = null;
              }, 180) as unknown as number;
            }}
            onDoubleClick={(e) => {
              e.stopPropagation();
              // Double click: cancel single-click action and start inline rename
              if (clickTimer.current) {
                window.clearTimeout(clickTimer.current);
                clickTimer.current = null;
              }
              setEditing(true);
            }}
          >
            <CardTile title={card.title} overdue={overdue} card={card} onQuickEdit={() => setEditing(true)} />
          </div>
        )}
      </div>
      <button
        type="button"
        className="absolute top-1 right-1 text-fg-subtle hover:text-fg focus:outline-none focus:ring-0"
        onClick={(e) => {
          e.stopPropagation();
          setMoveOpen(true);
        }}
        aria-label="Open card actions"
      >
        <Icon name="edit" size={16} />
      </button>
      {modalOpen ? (
        <CardModal
          cardId={card.id}
          boardId={card.board_id}
          initialTitle={card.title}
          onClose={() => setModalOpen(false)}
        />
      ) : null}
      {moveOpen ? (
        <>
          <div className="absolute z-20 top-6 right-1">
            <MoveCardDialog
              cardId={card.id}
              currentBoardId={card.board_id}
              currentListId={card.list_id}
              workspaceId={card.workspace_id}
              onClose={() => setMoveOpen(false)}
              onMoved={(dest) => {
                // Invalidate caches for both source and destination board
                qc.invalidateQueries({ queryKey: ['cards', card.board_id] });
                if (dest.boardId !== card.board_id) {
                  qc.invalidateQueries({ queryKey: ['cards', dest.boardId] });
                }
              }}
            />
          </div>
        </>
      ) : null}
    </div>
  );
}
