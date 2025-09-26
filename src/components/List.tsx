import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import type { CardRow } from '../types/dto';
import SortableCard from './SortableCard';
import MoveListDialog from './MoveListDialog';
import { renameList, archiveList, deleteList as apiDeleteList } from '@api/lists';
import { getBoards } from '@api/boards';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';

type Props = { title: string; listId: string; cards: CardRow[]; bump?: boolean };

export default function List({ title, listId, cards, bump }: Props) {
  const { setNodeRef } = useDroppable({ id: listId, data: { type: 'list', listId } });
  const { boardId } = useParams();
  const qc = useQueryClient();
  const [editing, setEditing] = React.useState(false);
  const [name, setName] = React.useState(title);
  const rootRef = React.useRef<HTMLDivElement | null>(null);
  const [menuPos, setMenuPos] = React.useState<{ x: number; y: number } | null>(null);
  const [showDetails, setShowDetails] = React.useState(false);
  const [showMoveList, setShowMoveList] = React.useState(false);
  const modalOpen = (typeof window !== 'undefined' && (window as any).__CARD_MODAL_OPEN__) === true;

  // Fetch boards for move functionality
  const boardsQuery = useQuery({
    queryKey: ['boards'],
    queryFn: () => getBoards('2a8f10d6-4368-43db-ab1d-ab783ec6e935'),
    enabled: showMoveList
  });

  React.useEffect(() => setName(title), [title]);
  
  // Check if we're on the Archive board by looking for the current board
  const [isArchiveBoard, setIsArchiveBoard] = React.useState(false);
  
  React.useEffect(() => {
    const checkArchiveBoard = async () => {
      if (!boardId) return;
      try {
        // We'll check the board name from the query cache or make a simple check
        const boardsCache = qc.getQueryData(['myBoards']) as any[];
        if (boardsCache) {
          const currentBoard = boardsCache.find(b => String(b.id) === boardId);
          setIsArchiveBoard(currentBoard?.name === 'Archive');
        }
      } catch (e) {
        console.error(e);
      }
    };
    checkArchiveBoard();
  }, [boardId, qc]);

  const commit = async () => {
    const newName = name.trim();
    setEditing(false);
    if (!newName || newName === title) return;
    // optimistic: update lists cache for this board
    const qKeys = qc.getQueryCache().findAll({ queryKey: ['lists'] });
    await renameList(listId, newName);
    // Invalidate all lists queries (safe, board-scoped key includes boardId)
    await qc.invalidateQueries({ queryKey: ['lists'] });
  };

  // Close context menu on click-away
  React.useEffect(() => {
    if (!menuPos) return;
    const onDocDown = (e: MouseEvent) => {
      const root = rootRef.current;
      if (!root) return setMenuPos(null);
      if (!root.contains(e.target as Node)) setMenuPos(null);
    };
    document.addEventListener('mousedown', onDocDown);
    return () => document.removeEventListener('mousedown', onDocDown);
  }, [menuPos]);

  // Close menu when a card modal opens
  React.useEffect(() => {
    const onToggle = (e: Event) => {
      const open = Boolean((e as CustomEvent).detail);
      if (open) setMenuPos(null);
    };
    window.addEventListener('card-modal-toggle', onToggle as any);
    return () => window.removeEventListener('card-modal-toggle', onToggle as any);
  }, []);

  return (
    <div
      ref={rootRef}
      onContextMenu={(e) => {
        if (modalOpen) return; // block context menu while modal is open
        e.preventDefault();
        const root = rootRef.current;
        if (!root) return;
        const r = root.getBoundingClientRect();
        setMenuPos({ x: e.clientX - r.left, y: e.clientY - r.top });
      }}
      className={`relative w-80 bg-bg-card text-fg rounded-xl border border-border p-3 shadow-card transition-transform duration-200 will-change-transform hover:scale-[1.01] ${
        bump && !modalOpen ? 'animate-jiggle scale-[1.015]' : ''
      }`}
    >
      <div
        className="font-medium mb-2 flex items-center justify-between"
        onClick={(e) => e.stopPropagation()}
        onDoubleClick={(e) => {
          e.stopPropagation();
          if (modalOpen) return; // block menu while modal is open
          const root = rootRef.current;
          const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
          const rr = root?.getBoundingClientRect();
          if (rr) setMenuPos({ x: rect.left - rr.left, y: rect.bottom - rr.top + 4 });
        }}
      >
        {editing ? (
          <input
            autoFocus
            className="bg-transparent border border-app rounded px-1 py-0.5 w-full mr-2"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commit();
              if (e.key === 'Escape') {
                setName(title);
                setEditing(false);
              }
            }}
          />
        ) : (
          <button className="text-left flex-1 focus:outline-none focus:ring-0" onClick={() => setEditing(true)} title="Rename list">
            {title}
          </button>
        )}
        <button
          className="text-fg-subtle hover:text-fg"
          onClick={(e) => {
            e.stopPropagation();
            if (modalOpen) return; // block menu while modal is open
            const root = rootRef.current;
            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
            const rr = root?.getBoundingClientRect();
            if (rr) {
              // Position menu to the left of the button
              const menuWidth = 200; // approximate menu width
              setMenuPos({ 
                x: rect.left - rr.left - menuWidth, 
                y: rect.bottom - rr.top + 4 
              });
            }
          }}
          aria-label="List actions"
          title="List actions"
        >
          ⋮
        </button>
      </div>
      <SortableContext items={cards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
        <div ref={setNodeRef} className="flex flex-col gap-3 py-2 min-h-[60px]">
          {cards.map((c) => (
            <SortableCard key={c.id} card={c} dragging={false} />
          ))}
        </div>
      </SortableContext>
      {/* Context menu */}
      {menuPos && (
        <div
          className="absolute z-50 bg-bg-card text-fg border border-border rounded-md shadow-lg text-sm"
          style={{ left: menuPos.x, top: menuPos.y, minWidth: 200 }}
          onClick={(e) => e.stopPropagation()}
        >
          <button className="w-full text-left px-3 py-2 hover:bg-bg-inset" onClick={() => { setShowDetails(true); setMenuPos(null); }}>
            Details…
          </button>
          <button 
            className="w-full text-left px-3 py-2 hover:bg-bg-inset" 
            onClick={() => { setShowMoveList(true); setMenuPos(null); }}
          >
            Move list to another board…
          </button>
          <button className="w-full text-left px-3 py-2 hover:bg-bg-inset" onClick={async () => {
            try {
              await archiveList(listId);
              await qc.invalidateQueries({ queryKey: ['lists'] });
            } catch (e) { console.error(e); }
            setMenuPos(null);
          }}>
            Archive list
          </button>
          {isArchiveBoard && (
            <button className="w-full text-left px-3 py-2 text-danger hover:bg-danger/10" onClick={async () => {
              if (!confirm('Delete this list and its cards permanently? This cannot be undone.')) return;
              try {
                await apiDeleteList(listId);
                await qc.invalidateQueries({ queryKey: ['lists'] });
                await qc.invalidateQueries({ queryKey: ['cards'] });
              } catch (e) { console.error(e); }
              setMenuPos(null);
            }}>
              Delete list (permanent)
            </button>
          )}
        </div>
      )}

      {/* Simple details dialog placeholder */}
      {showDetails && (
        <div className="fixed inset-0 z-40" onClick={() => setShowDetails(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div className="relative z-10 flex items-center justify-center h-full">
            <div className="w-[420px] max-w-[92vw] bg-bg-card text-fg border border-border rounded-xl shadow-card p-4" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-3">
                <div className="font-medium">List details</div>
                <button className="text-fg-subtle hover:text-fg" onClick={() => setShowDetails(false)}>✕</button>
              </div>
              <div className="text-sm text-fg-muted space-y-1">
                <div><span className="text-fg">Name:</span> {name}</div>
                <div><span className="text-fg">ID:</span> {listId}</div>
                <div><span className="text-fg">Cards:</span> {cards.length}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Move List Dialog */}
      {showMoveList && (
        <MoveListDialog
          listId={listId}
          listName={title}
          currentBoardId={boardId!}
          onClose={() => setShowMoveList(false)}
          onMoved={() => {
            qc.invalidateQueries({ queryKey: ['lists'] });
            qc.invalidateQueries({ queryKey: ['cards'] });
            setShowMoveList(false);
          }}
        />
      )}
    </div>
  );
}
