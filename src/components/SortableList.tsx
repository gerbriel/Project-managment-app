import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { CardRow, ListRow } from '../types/dto';
import List from './List';

type Props = { list: ListRow; cards: CardRow[]; bump?: boolean; highlighted?: boolean };

export default function SortableList({ list, cards, bump, highlighted }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: list.id,
    data: { type: 'list', listId: list.id },
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    // Hide the original node while dragging so only the overlay is visible (and can jiggle)
    opacity: isDragging ? 0 : undefined,
  };

  const modalOpen = (typeof window !== 'undefined' && (window as any).__CARD_MODAL_OPEN__) === true;
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative ${modalOpen ? '' : ''} ${isDragging && !modalOpen ? '' : ''}`}
      {...(modalOpen ? {} : attributes)}
      {...(modalOpen ? {} : listeners)}
    >
      <List title={list.name} listId={list.id} cards={cards} bump={bump} highlighted={highlighted} />
    </div>
  );
}
