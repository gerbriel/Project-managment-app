import React from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getListsByBoard } from '@api/lists';
import { getCardsByBoard, updateCardPosition } from '@api/cards';
import SortableList from './SortableList';
import CardTile from './CardTile';
import FilterSummary from './FilterSummary';
import { useFilteredCards } from '../hooks/useFilteredCards';
import { DndContext, DragEndEvent, DragStartEvent, DragOverEvent, PointerSensor, useSensor, useSensors, DragOverlay, closestCenter, pointerWithin } from '@dnd-kit/core';
import { SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import { getSupabase } from '../app/supabaseClient';
import type { CardRow, ListRow } from '../types/dto';

type CardDragData = { type: 'card'; cardId: string; listId: string };
type ListDragData = { type: 'list'; listId: string };

export default function Board() {
  const { boardId } = useParams();

  const listsQuery = useQuery({
    queryKey: ['lists', boardId],
    queryFn: () => getListsByBoard(boardId!),
    enabled: !!boardId,
  });

  const cardsQuery = useQuery({
    queryKey: ['cards', boardId],
    queryFn: () => getCardsByBoard(boardId!),
    enabled: !!boardId,
  });

  const queryClient = useQueryClient();
  const sensors = useSensors(
    // Distance-based activation so clicks don't start drags; bump to 10px for safety
    useSensor(PointerSensor, { activationConstraint: { distance: 10 } })
  );
  
  // ALL HOOKS MUST BE CALLED BEFORE ANY EARLY RETURNS
  // Modal-open state must be declared before any early returns to preserve hook order
  const [modalOpen, setModalOpen] = React.useState<boolean>((window as any).__CARD_MODAL_OPEN__ ?? false);
  const [activeDrag, setActiveDrag] = React.useState<null | { type: 'card' | 'list'; id: string }>(null);
  const [listDropIndex, setListDropIndex] = React.useState<number | null>(null);
  const [lastOverId, setLastOverId] = React.useState<string | null>(null);
  const [dropHighlightListId, setDropHighlightListId] = React.useState<string | null>(null);
  
  // Apply filters using the custom hook - MUST be called before early returns
  const rawCards = (cardsQuery.data ?? []) as CardRow[];
  const cards = useFilteredCards(rawCards, boardId);
  
  React.useEffect(() => {
    const onToggle = (e: Event) => setModalOpen(Boolean((e as CustomEvent).detail));
    window.addEventListener('card-modal-toggle', onToggle as any);
    return () => window.removeEventListener('card-modal-toggle', onToggle as any);
  }, []);

  // When modal opens, clear any active drag state and drop indicators so nothing wiggles
  React.useEffect(() => {
    if (!modalOpen) return;
    setActiveDrag(null);
    setListDropIndex(null);
    setLastOverId(null);
    setDropHighlightListId(null);
  }, [modalOpen]);

  React.useEffect(() => {
    if (!boardId) return;
    const supabase = getSupabase();
    const channel = supabase
      .channel(`board-${boardId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'lists', filter: `board_id=eq.${boardId}` },
        () => queryClient.invalidateQueries({ queryKey: ['lists', boardId] })
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'cards', filter: `board_id=eq.${boardId}` },
        () => queryClient.invalidateQueries({ queryKey: ['cards', boardId] })
      )
      .subscribe();
    return () => {
      channel.unsubscribe();
    };
  }, [boardId, queryClient]);

  if (listsQuery.isLoading || cardsQuery.isLoading) {
    return <div className="p-4 text-muted">Loading board…</div>;
  }
  if (listsQuery.error || cardsQuery.error) {
    return <div className="p-4 text-red-500">Failed to load board.</div>;
  }

  const lists = (listsQuery.data ?? []) as ListRow[];

  const onDragStart = (evt: DragStartEvent) => {
    const t = (evt.active.data.current as any)?.type as 'card' | 'list' | undefined;
    if (t) setActiveDrag({ type: t, id: String(evt.active.id) });
  };

  const onDragOver = (evt: DragOverEvent) => {
    const t = (evt.active.data.current as any)?.type as 'card' | 'list' | undefined;
    if (t !== 'list') return;
    const overId = evt.over?.id ? String(evt.over.id) : null;
    if (overId) setLastOverId(overId);
    const listsPrev = (queryClient.getQueryData(['lists', boardId]) as ListRow[]) ?? [];
    const moving = listsPrev.find((l) => l.id === String(evt.active.id));
    if (!moving) return;
    const without = listsPrev.filter((l) => l.id !== moving.id);
    if (!overId) {
      // If not over any list, assume append to end
      setListDropIndex(without.length);
      return;
    }
    const targetIdx = without.findIndex((l) => l.id === overId);
    if (targetIdx === -1) {
      setListDropIndex(without.length);
      return;
    }
    // Determine before/after using a 35% overlap threshold for smoother, intention-aligned movement
    const overRect: any = (evt.over as any)?.rect;
    const actRect: any = (evt.active as any)?.rect?.current;
    const actTrans = actRect?.translated ?? actRect?.initial ?? null;

    const overLeft = overRect?.left ?? null;
    const overWidth = overRect?.width ?? null;
    const overCenter = overLeft != null && overWidth != null ? overLeft + overWidth / 2 : null;

    const actLeft = actTrans?.left ?? null;
    const actWidth = actTrans?.width ?? null;
    const actCenter = actLeft != null && actWidth != null ? actLeft + actWidth / 2 : null;

    // Compute horizontal overlap ratio between the dragged list and the hovered list
    const aLeft = actLeft ?? 0;
    const aRight = (actLeft ?? 0) + (actWidth ?? 0);
    const bLeft = overLeft ?? 0;
    const bRight = (overLeft ?? 0) + (overWidth ?? 0);
    const overlap = Math.max(0, Math.min(aRight, bRight) - Math.max(aLeft, bLeft));
    const ratio = overWidth ? overlap / overWidth : 0;

    const THRESHOLD = 0.35; // 35% overlap required to switch to the other side
    // Determine which side of the hovered list we're currently on (relative to its center)
    const onRightSide = overCenter != null && actCenter != null ? actCenter > overCenter : false;
    // If we've crossed the threshold, switch sides; otherwise stay on the current side
    const insertAfter = (ratio >= THRESHOLD) ? !onRightSide : onRightSide;

    const idx = Math.max(0, Math.min(without.length, targetIdx + (insertAfter ? 1 : 0)));
    setListDropIndex(idx);
  };

  const onDragEnd = async (evt: DragEndEvent) => {
    const { active, over } = evt;
    if (!over) return;
    if (active.id === over.id) return;

    const activeData = active.data.current as CardDragData | undefined;
    const overData = over.data.current as CardDragData | ListDragData | undefined;

    // Handle LIST reordering only when dragging a list
  const activeType = (activeData as any)?.type as 'card' | 'list' | undefined;
    if (activeType === 'list') {
      const listsPrev = (queryClient.getQueryData(['lists', boardId]) as ListRow[]) ?? [];
      const moving = listsPrev.find((l) => l.id === String(active.id));
      if (!moving) return;
      // Remove moving first, then compute insert index relative to 'over'
      const without = listsPrev.filter((l) => l.id !== moving.id);
      let idx: number;
      if (listDropIndex != null) {
        idx = Math.max(0, Math.min(without.length, listDropIndex));
      } else {
        const insertIndex = without.findIndex((l) => l.id === String(over.id));
        idx = insertIndex === -1 ? without.length : insertIndex;
      }
      const prevPos = without[idx - 1]?.position ?? 0;
      const nextPos = without[idx]?.position ?? prevPos + 2;
      const newPos = (prevPos + nextPos) / 2;
      // optimistic reorder array
      const optimistic: ListRow[] = [
        ...without.slice(0, idx),
        { ...moving, position: newPos },
        ...without.slice(idx),
      ];
      queryClient.setQueryData(['lists', boardId], optimistic);
      try {
        const sb = getSupabase();
        const { error } = await sb.from('lists').update({ position: newPos }).eq('id', moving.id);
        if (error) throw error;
        await queryClient.invalidateQueries({ queryKey: ['lists', boardId] });
      } catch (e) {
        console.error(e);
        queryClient.setQueryData(['lists', boardId], listsPrev);
      }
      setActiveDrag(null);
      setListDropIndex(null);
      setLastOverId(null);
      return;
    }

    const sourceListId: string | undefined = activeData?.listId;
    let targetListId: string | undefined = overData?.listId;
    if (!targetListId && (overData as CardDragData | undefined)?.cardId)
      targetListId = (overData as CardDragData).listId;

    if (!targetListId || !sourceListId) return;

    // Use latest cache snapshot
    const allCards = (queryClient.getQueryData(['cards', boardId]) as CardRow[]) ?? [];
    const targetCards = allCards.filter((c) => c.list_id === targetListId);
    // Determine insert index: if over is a card, place before it; if list, append to end
    const overIndex = targetCards.findIndex((c) => c.id === over.id);
    const insertIndex = overData?.type === 'card' && overIndex !== -1 ? overIndex : targetCards.length;

  const prev = targetCards[insertIndex - 1]?.position ?? 0;
    const next = targetCards[insertIndex]?.position ?? prev + 2;
    const newPos = (prev + next) / 2;

    // Optimistic update: move card in local cache
    const prevCards = allCards;
    const moving = prevCards.find((c) => c.id === active.id);
    if (!moving) return;
    const updatedCard: CardRow = { ...moving, list_id: targetListId, position: newPos } as CardRow;

    const withoutActive = prevCards.filter((c) => c.id !== active.id);
    const targetWithoutActive = withoutActive.filter((c) => c.list_id === targetListId);
    const otherLists = withoutActive.filter((c) => c.list_id !== targetListId);
    const before = targetWithoutActive.slice(0, insertIndex);
    const after = targetWithoutActive.slice(insertIndex);
    const optimisticCards = [...otherLists, ...before, updatedCard, ...after];

    queryClient.setQueryData(['cards', boardId], optimisticCards);

    try {
      await updateCardPosition({ cardId: String(active.id), listId: targetListId, position: newPos });
      // Keep optimistic cache; still invalidate to sync positions if server adjusted
      await queryClient.invalidateQueries({ queryKey: ['cards', boardId] });
    } catch (e) {
      console.error(e);
      // Rollback on error
      queryClient.setQueryData(['cards', boardId], prevCards);
    }
    // Trigger a brief highlight/jiggle on the target list to confirm the drop
    setDropHighlightListId(targetListId);
    window.setTimeout(() => setDropHighlightListId((prev) => (prev === targetListId ? null : prev)), 220);
    setActiveDrag(null);
    setListDropIndex(null);
    setLastOverId(null);
  };
  const onDragCancel = () => setActiveDrag(null);

  

  return (
    <div className="p-4 overflow-x-auto">
      <FilterSummary />
      <DndContext sensors={sensors} collisionDetection={pointerWithin} onDragStart={onDragStart} onDragOver={onDragOver} onDragEnd={onDragEnd} onDragCancel={onDragCancel}>
        <SortableContext items={lists.map((l) => l.id)} strategy={horizontalListSortingStrategy}>
          <div className={`flex gap-4 min-w-max items-stretch relative ${modalOpen ? 'pointer-events-none select-none' : ''}`}>
            {/* Left-edge indicator when dropping at index 0 */}
            {activeDrag?.type === 'list' && listDropIndex === 0 ? (
              <div className="w-1 self-stretch bg-accent rounded-sm opacity-70" />
            ) : null}

            {lists.map((l, i) => (
              <React.Fragment key={l.id}>
                <SortableList list={l} cards={cards.filter((c: CardRow) => c.list_id === l.id)} bump={dropHighlightListId === l.id} />
                {/* Indicator between items */}
                {activeDrag?.type === 'list' && listDropIndex === i + 1 ? (
                  <div className="w-1 self-stretch bg-accent rounded-sm opacity-70" />
                ) : null}
              </React.Fragment>
            ))}
          </div>
        </SortableContext>
        {!modalOpen && (
          <DragOverlay>
            {activeDrag?.type === 'list'
            ? (() => {
                const l = lists.find((x) => x.id === activeDrag.id);
                if (!l) return null;
                const lc = cards.filter((c: CardRow) => c.list_id === l.id);
                return (
                  <div className={`opacity-90 pointer-events-none ${modalOpen ? '' : 'animate-jiggle'}`}>
                    <div className="w-80 bg-surface rounded-md border border-app p-3">
                      <div className="font-medium mb-2 flex items-center justify-between">
                        <div className="text-left flex-1">{l.name}</div>
                        <span className="text-muted">⋮</span>
                      </div>
                      <div className="flex flex-col gap-2 min-h-[20px]">
                        {lc.length > 0 ? (
                          lc.map((c: CardRow) => {
                            const overdue = Boolean(c.date_end && new Date(c.date_end) < new Date());
                            return <CardTile key={c.id} title={c.title} overdue={overdue} card={c as any} />;
                          })
                        ) : (
                          <div className="text-xs text-muted">No cards</div>
                        )}
                      </div>
                      <div className="mt-3 w-full text-left text-muted">+ Add card</div>
                    </div>
                  </div>
                );
              })()
            : activeDrag?.type === 'card'
            ? (() => {
                const c = cards.find((x: CardRow) => x.id === activeDrag.id);
                if (!c) return null;
                const overdue = Boolean(c.date_end && new Date(c.date_end) < new Date());
                return (
                  <div className={`opacity-90 pointer-events-none ${modalOpen ? '' : 'animate-jiggle'}`}>
                    <div className="w-72">
                      <CardTile title={c.title} overdue={overdue} card={c as any} />
                    </div>
                  </div>
                );
              })()
            : null}
          </DragOverlay>
        )}
      </DndContext>
    </div>
  );
}
