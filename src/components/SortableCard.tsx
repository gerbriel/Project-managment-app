import React from 'react';
import { CSS } from '@dnd-kit/utilities';
import { useSortable } from '@dnd-kit/sortable';
import type { CardRow } from '../types/dto';
import CardTile from './CardTile';
import CardModal from './CardModal';
import MoveCardDialog from './MoveCardDialog';
import { useQueryClient } from '@tanstack/react-query';
import { archiveCard } from '@api/cards';

type Props = { card: CardRow; dragging?: boolean };

export default function SortableCard({ card, dragging }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
    data: { type: 'card', cardId: card.id, listId: card.list_id },
  });
  const qc = useQueryClient();
  const [modalOpen, setModalOpen] = React.useState(false);
  const [moveOpen, setMoveOpen] = React.useState(false);
  const [contextMenu, setContextMenu] = React.useState<{ x: number; y: number } | null>(null);
  const rootRef = React.useRef<HTMLDivElement | null>(null);
  const clickTimer = React.useRef<number | null>(null);
  const modalOpenGlobal = (typeof window !== 'undefined' && (window as any).__CARD_MODAL_OPEN__) === true;

  // Check if we're on the Archive board
  const [isArchiveBoard, setIsArchiveBoard] = React.useState(false);
  
  React.useEffect(() => {
    const checkArchiveBoard = async () => {
      try {
        const boardsCache = qc.getQueryData(['boards']) as any[];
        if (boardsCache) {
          const currentBoard = boardsCache.find(b => String(b.id) === card.board_id);
          setIsArchiveBoard(currentBoard?.name === 'Archive');
        }
      } catch (e) {
        console.error(e);
      }
    };
    checkArchiveBoard();
  }, [card.board_id, qc]);

  // Close context menu on click-away
  React.useEffect(() => {
    if (!contextMenu) return;
    const onDocDown = (e: MouseEvent) => {
      const root = rootRef.current;
      if (!root) return setContextMenu(null);
      if (!root.contains(e.target as Node)) setContextMenu(null);
    };
    document.addEventListener('mousedown', onDocDown);
    return () => document.removeEventListener('mousedown', onDocDown);
  }, [contextMenu]);

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    // Hide the original card completely when dragging so only the overlay is visible
    opacity: isDragging ? 0 : undefined,
  };

  const overdue = Boolean(card.date_end && new Date(card.date_end) < new Date());

  return (
    <div
      ref={(node) => {
        setNodeRef(node);
        rootRef.current = node;
      }}
      style={style}
      data-list-id={card.list_id}
      className={`relative ${modalOpenGlobal ? '' : 'cursor-grab active:cursor-grabbing'} ${isDragging && !modalOpenGlobal ? '' : ''}`}
      {...(modalOpenGlobal ? {} : attributes)}
      {...(modalOpenGlobal ? {} : listeners)}
      onContextMenu={(e) => {
        if (modalOpenGlobal) return;
        e.preventDefault();
        const root = rootRef.current;
        if (!root) return;
        const rect = root.getBoundingClientRect();
        setContextMenu({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      }}
    >
      <div
        onClick={(e) => {
          e.stopPropagation();
          if (clickTimer.current) window.clearTimeout(clickTimer.current);
          clickTimer.current = window.setTimeout(() => {
            if (!isDragging) setModalOpen(true);
            clickTimer.current = null;
          }, 160) as unknown as number;
        }}
      >
        <CardTile title={card.title} overdue={overdue} card={card} />
      </div>
      
      {/* Three dots menu button */}
      <button
        type="button"
        className="absolute top-1 right-1 text-fg-subtle hover:text-fg focus:outline-none focus:ring-0"
        onClick={(e) => {
          e.stopPropagation();
          const root = rootRef.current;
          if (!root) return;
          const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
          const rr = root.getBoundingClientRect();
          // Position menu to the left of the button
          const menuWidth = 180;
          setContextMenu({ 
            x: rect.left - rr.left - menuWidth, 
            y: rect.bottom - rr.top + 4 
          });
        }}
        aria-label="Card actions"
        title="Card actions"
      >
        ⋮
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
        <div className="fixed inset-0 z-50" onClick={() => setMoveOpen(false)}>
          <div className="absolute inset-0 bg-black/20" />
          <div 
            className="absolute z-10"
            style={{
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
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
                setMoveOpen(false);
              }}
            />
          </div>
        </div>
      ) : null}
      
      {/* Context menu */}
      {contextMenu && (
        <div
          className="absolute z-50 bg-bg-card text-fg border border-border rounded-md shadow-lg text-sm"
          style={{ left: contextMenu.x, top: contextMenu.y, minWidth: 180 }}
          onClick={(e) => e.stopPropagation()}
        >
          <button 
            className="w-full text-left px-3 py-2 hover:bg-bg-inset" 
            onClick={() => { setModalOpen(true); setContextMenu(null); }}
          >
            Open card
          </button>
          <button 
            className="w-full text-left px-3 py-2 hover:bg-bg-inset" 
            onClick={() => { setMoveOpen(true); setContextMenu(null); }}
          >
            Move card
          </button>
          <button 
            className="w-full text-left px-3 py-2 hover:bg-bg-inset" 
            onClick={async () => {
              try {
                await archiveCard(card.id);
                await qc.invalidateQueries({ queryKey: ['cards', card.board_id] });
              } catch (e) {
                console.error(e);
                alert('Failed to archive card. Check console for details.');
              }
              setContextMenu(null);
            }}
          >
            Archive card
          </button>
          {isArchiveBoard && (
            <button
              className="w-full text-left px-3 py-2 text-danger hover:bg-danger/10"
              onClick={async () => {
                if (!confirm('Delete this card permanently? This cannot be undone.')) return;
                try {
                  const { deleteCard } = await import('@api/cards');
                  await deleteCard(card.id);
                  await qc.invalidateQueries({ queryKey: ['cards', card.board_id] });
                } catch (e) {
                  console.error(e);
                  alert('Failed to delete card. Check console for details.');
                }
                setContextMenu(null);
              }}
            >
              Delete card (permanent)
            </button>
          )}
        </div>
      )}
    </div>
  );
}
