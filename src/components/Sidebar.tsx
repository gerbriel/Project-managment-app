import React from 'react';
import { Link, useParams, useLocation, useNavigate } from 'react-router-dom';
import Icon from './Icon';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getBoards, createBoard, deleteBoard, updateBoard, archiveBoard, type BoardRow } from '@api/boards';
import {
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { SortableContext, arrayMove, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export default function Sidebar() {
  const { boardId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [collapsed, setCollapsed] = React.useState<boolean>(() => {
    try {
      return localStorage.getItem('sidebarCollapsed') === '1';
    } catch {
      return false;
    }
  });

  React.useEffect(() => {
    try {
      localStorage.setItem('sidebarCollapsed', collapsed ? '1' : '0');
    } catch {}
    const width = collapsed ? 40 : 224; // px
    document.documentElement.style.setProperty('--sidebar-w', width + 'px');
  }, [collapsed]);

  // Mobile sidebar toggle state
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const boardsQuery = useQuery({ 
    queryKey: ['boards'], 
    queryFn: () => getBoards('2a8f10d6-4368-43db-ab1d-ab783ec6e935') // Using workspace ID from error log
  });
  const [ordered, setOrdered] = React.useState<BoardRow[] | null>(null);

  // Restore local ordering override if present, or use default order
  React.useEffect(() => {
    if (!boardsQuery.data) return;
    const key = 'sidebar.boardOrder';
    
    // Define the default board order based on your preferred sequence
    const defaultOrder = [
      'New Leads',
      'Quoted', 
      'Nurture Leads',
      'Dealer Orders',
      'Engineering',
      'Permitting',
      'Order Confirmation',
      'Manufacturing & Delivery',
      'Archive',
      'Lost Leads'
    ];
    
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        // Use saved custom order if exists
        const ids: string[] = JSON.parse(raw);
        const map = new Map(boardsQuery.data.map((b) => [String(b.id), b] as const));
        const arranged = ids.map((id) => map.get(id)).filter(Boolean) as BoardRow[];
        // append any new ones not in stored order
        for (const b of boardsQuery.data) if (!ids.includes(String(b.id))) arranged.push(b);
        setOrdered(arranged);
        return;
      }
    } catch {}
    
    // Use default order if no custom order is saved
    const boardMap = new Map(boardsQuery.data.map((b) => [b.name, b]));
    const orderedByDefault: BoardRow[] = [];
    
    // Add boards in default order
    for (const name of defaultOrder) {
      const board = boardMap.get(name);
      if (board) {
        orderedByDefault.push(board);
        boardMap.delete(name); // Remove from map so we don't add it twice
      }
    }
    
    // Add any remaining boards that weren't in the default order
    for (const board of boardMap.values()) {
      orderedByDefault.push(board);
    }
    
    setOrdered(orderedByDefault);
  }, [boardsQuery.data]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const persistOrder = React.useCallback(async (items: BoardRow[]) => {
    setOrdered(items);
    const ids = items.map((b) => String(b.id));
    try {
      localStorage.setItem('sidebar.boardOrder', JSON.stringify(ids));
    } catch {}
    // Best-effort server persist if all boards share a workspace
    const wsId = items[0]?.workspace_id;
    const sameWs = items.every((b) => String(b.workspace_id) === String(wsId));
    if (wsId && sameWs) {
      try {
        // Board reordering is not implemented since position column doesn't exist
        // Just update the UI state without persisting the order
        console.log('Board reorder requested but not persisted:', ids);
      } catch (e) {
        // ignore server failures here
        console.warn('Board reorder persistence failed:', e);
      }
    }
    queryClient.invalidateQueries({ queryKey: ['myBoards'] });
  }, [queryClient]);

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id || !ordered) return;
    const oldIndex = ordered.findIndex((b) => String(b.id) === String(active.id));
    const newIndex = ordered.findIndex((b) => String(b.id) === String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    const next = arrayMove(ordered, oldIndex, newIndex);
    persistOrder(next);
  }

  const NavItem: React.FC<{ to: string; label: string; icon?: React.ReactNode }> = ({ to, label, icon }) => {
    const active = location.pathname === to;
    return (
      <Link
        to={to}
        className={
          'flex items-center gap-2 px-3 py-2 rounded-md text-sm ' +
          (active ? 'bg-accent/15 text-accent' : 'text-fg-subtle hover:text-fg hover:bg-bg-inset')
        }
        title={label}
      >
        {icon}
        {!collapsed && <span>{label}</span>}
      </Link>
    );
  };

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}
      
      {/* Mobile menu button */}
      <button
        className="fixed top-4 left-4 z-40 lg:hidden w-10 h-10 flex items-center justify-center rounded-md bg-surface border border-app/60 shadow-sm"
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label="Toggle sidebar"
      >
        <Icon name={mobileOpen ? "x" : "menu"} size={20} />
      </button>

      <aside
        className={`fixed top-0 left-0 h-screen z-30 bg-surface border-r border-app/60 shadow-sm flex flex-col transition-transform duration-300 ease-in-out ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0`}
        style={{ width: 'var(--sidebar-w, 224px)' }}
      >
      <div className="h-12 flex items-center justify-between px-2">
        {!collapsed && <div className="px-2 font-semibold">Navigation</div>}
        <button
          className="w-8 h-8 grid place-items-center text-fg-subtle hover:text-fg"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          onClick={() => setCollapsed((c) => !c)}
        >
          <div className={collapsed ? '' : 'rotate-180'}>
            <Icon name="arrow-right" />
          </div>
        </button>
      </div>

      <div className="px-2 py-2 space-y-1 overflow-y-auto flex-1">
        <NavItem to="/" label="Home" />

        <div className="mt-2">
          {!collapsed && (
            <div className="px-2 text-xs uppercase tracking-wide text-fg-muted mb-1">Boards</div>
          )}
          <div className="flex flex-col gap-1">
            {boardsQuery.isLoading && (
              <div className="px-3 py-2 text-fg-muted text-sm">Loading…</div>
            )}
            {!!ordered && ordered.length > 0 && (
              <DndContext sensors={sensors} onDragEnd={onDragEnd}>
                <SortableContext items={ordered.map((b) => String(b.id))} strategy={verticalListSortingStrategy}>
                  {ordered.map((b) => (
                    <SortableBoardItem 
                      key={String(b.id)} 
                      id={String(b.id)} 
                      board={b}
                      collapsed={collapsed} 
                      to={`/b/${b.id}/board`} 
                      label={String(b.name)}
                      allBoards={ordered || []}
                      onArchive={async () => {
                        try {
                          await archiveBoard(b.id as any);
                          const next = (ordered ?? []).filter((board) => String(board.id) !== String(b.id));
                          await persistOrder(next);
                          queryClient.invalidateQueries({ queryKey: ['myBoards'] });
                          if (boardId === String(b.id)) {
                            navigate('/');
                          }
                        } catch (e) {
                          console.error(e);
                          alert('Failed to archive board. Check console for details.');
                        }
                      }}
                    />
                  ))}
                </SortableContext>
              </DndContext>
            )}
            {boardsQuery.data && boardsQuery.data.length === 0 && (
              <div className="px-3 py-2 text-fg-muted text-sm">No boards</div>
            )}
          </div>
        </div>
      </div>
      {/* Footer actions */}
      <div className="p-2 border-t border-app/60">
        <div className="flex gap-2">
          <button
            className="flex-1 h-9 inline-flex items-center justify-center gap-2 rounded-md bg-accent/10 text-accent hover:bg-accent/15"
            onClick={async () => {
              try {
                // Infer workspace from first board if available; otherwise show a friendly alert
                const wsId = ordered?.[0]?.workspace_id;
                if (!wsId) {
                  alert('No workspace detected. Create a workspace first via seed or UI.');
                  return;
                }
                const name = prompt('New board name?')?.trim();
                if (!name) return;
                
                console.log('Creating board with workspace ID:', wsId, 'and name:', name);
                const newBoard = await createBoard(wsId as any, name);
                console.log('Board created successfully:', newBoard);
                
                const next = [...(ordered ?? [])];
                next.push(newBoard);
                await persistOrder(next);
                queryClient.invalidateQueries({ queryKey: ['myBoards'] });
                // Navigate to the new board
                try { navigate(`/b/${newBoard.id}/board`); } catch {}
              } catch (e) {
                console.error('Board creation failed:', e);
                const errorMessage = e instanceof Error ? e.message : String(e);
                if (errorMessage.includes('Host validation failed') || errorMessage.includes('Host is not supported')) {
                  alert('Supabase host validation error. Please add localhost:5174 to your Supabase project\'s allowed origins in the Authentication settings.');
                } else {
                  alert(`Failed to create board: ${errorMessage}`);
                }
              }
            }}
            aria-label="Create board"
            title="Create board"
          >
            <Icon name="plus" />
            {!collapsed && <span>New Board</span>}
          </button>
          <button
            className="w-9 h-9 inline-flex items-center justify-center rounded-md text-danger hover:bg-danger/10"
            onClick={async () => {
              try {
                // Delete currently active board if any
                const currentId = boardId;
                if (!currentId) {
                  alert('Open a board to delete it, or select a board in the list first.');
                  return;
                }
                
                // Check if it's an Archive board
                const currentBoard = ordered?.find(b => String(b.id) === String(currentId));
                if (currentBoard?.name !== 'Archive') {
                  alert('Only Archive boards can be permanently deleted. Use Archive from the context menu to archive this board instead.');
                  return;
                }
                
                const ok = confirm('Delete this Archive board and all its lists/cards permanently? This cannot be undone.');
                if (!ok) return;
                await deleteBoard(currentId as any);
                // Update local state and cache
                const next = (ordered ?? []).filter((b) => String(b.id) !== String(currentId));
                await persistOrder(next);
                queryClient.invalidateQueries({ queryKey: ['myBoards'] });
                // Navigate away from deleted board
                try { navigate('/'); } catch {}
              } catch (e) {
                console.error(e);
                alert('Failed to delete board. It might be protected by RLS or missing permissions.');
              }
            }}
            aria-label="Delete current board"
            title="Delete current board (Archive boards only)"
          >
            <Icon name="trash" />
          </button>
        </div>
      </div>
    </aside>
    </>
  );
}

// Sortable wrapper around NavItem to enable drag handle on entire row
function SortableBoardItem({ id, to, label, collapsed, board, onArchive, allBoards }: { 
  id: string; 
  to: string; 
  label: string; 
  collapsed: boolean;
  board: BoardRow;
  onArchive: () => Promise<void>;
  allBoards: BoardRow[];
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const [contextMenu, setContextMenu] = React.useState<{ x: number; y: number } | null>(null);
  const [isRenaming, setIsRenaming] = React.useState(false);
  const [renamingValue, setRenamingValue] = React.useState(label);
  const rootRef = React.useRef<HTMLDivElement | null>(null);
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const queryClient = useQueryClient();
  
  // Focus input when renaming starts
  React.useEffect(() => {
    if (isRenaming && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isRenaming]);
  
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
  
  const handleRename = async () => {
    if (!renamingValue.trim() || renamingValue === label) {
      setIsRenaming(false);
      setRenamingValue(label);
      return;
    }
    
    try {
      await updateBoard(board.id, { name: renamingValue.trim() });
      queryClient.invalidateQueries({ queryKey: ['boards'] });
      setIsRenaming(false);
    } catch (e) {
      console.error('Failed to rename board:', e);
      alert('Failed to rename board');
      setRenamingValue(label);
      setIsRenaming(false);
    }
  };
  
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  const location = useLocation();
  const active = location.pathname === to;
  
  return (
    <div 
      ref={(node) => {
        setNodeRef(node);
        rootRef.current = node;
      }} 
      style={style} 
      {...attributes}
      className="relative"
    >
      <div
        className={
          'flex items-center gap-2 px-3 py-2 rounded-md text-sm group ' +
          (active ? 'bg-accent/15 text-accent' : 'text-fg-subtle hover:text-fg hover:bg-bg-inset')
        }
        title={label}
        {...listeners}
      >
        <Icon name="board" size={16} />
        {!collapsed && (
          isRenaming ? (
            <input
              ref={inputRef}
              type="text"
              value={renamingValue}
              onChange={(e) => setRenamingValue(e.target.value)}
              onBlur={handleRename}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleRename();
                }
                if (e.key === 'Escape') {
                  e.preventDefault();
                  setIsRenaming(false);
                  setRenamingValue(label);
                }
                // Allow all other keys including space
              }}
              className="bg-bg-inset border border-border rounded px-2 py-1 text-sm flex-1 min-w-0"
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              autoFocus
            />
          ) : (
            <>
              <Link 
                to={to} 
                className="flex-1 min-w-0"
                onDoubleClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsRenaming(true);
                }}
              >
                <span className="truncate block">{label}</span>
              </Link>
              
              {/* Three dots menu button */}
              <button
                className="opacity-0 group-hover:opacity-100 w-6 h-6 flex items-center justify-center rounded hover:bg-bg-inset/50 transition-opacity"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const rect = e.currentTarget.getBoundingClientRect();
                  setContextMenu({ x: -160, y: 0 }); // Position to the left of the button
                }}
                title="Board options"
              >
                <Icon name="more" size={14} />
              </button>
            </>
          )
        )}
      </div>
      
      {/* Context menu */}
      {contextMenu && (
        <div
          className="absolute z-50 bg-bg-card text-fg border border-border rounded-md shadow-lg text-sm"
          style={{ 
            right: 10, // Position to the left of the three dots
            top: contextMenu.y, 
            minWidth: 160 
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button 
            className="w-full text-left px-3 py-2 hover:bg-bg-inset" 
            onClick={() => {
              setIsRenaming(true);
              setContextMenu(null);
            }}
          >
            Rename board
          </button>
          
          <button 
            className="w-full text-left px-3 py-2 hover:bg-bg-inset" 
            onClick={() => {
              // Navigate to Archive board
              const archiveBoard = allBoards.find((b: BoardRow) => b.name === 'Archive');
              if (archiveBoard) {
                window.location.href = `/b/${archiveBoard.id}/board`;
              } else {
                alert('Archive board not found. Please create an Archive board first.');
              }
              setContextMenu(null);
            }}
          >
            Go to Archive
          </button>
          
          {board.name !== 'Archive' && (
            <button 
              className="w-full text-left px-3 py-2 hover:bg-bg-inset text-red-500" 
              onClick={async () => {
                await onArchive();
                setContextMenu(null);
              }}
            >
              Archive board
            </button>
          )}
        </div>
      )}
    </div>
  );
}
