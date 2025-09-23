import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { CardRow, ListRow } from '../types/dto';
import List from './List';

type Props = { list: ListRow; cards: CardRow[]; bump?: boolean };

export default function SortableList({ list, cards, bump }: Props) {
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

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      {/* Attach listeners to the whole list block so you can drag from header/empty space */}
      <div className="focus:outline-none focus:ring-0 cursor-grab active:cursor-grabbing" {...listeners}>
        <List title={list.name} listId={list.id} cards={cards} bump={bump} />
      </div>
    </div>
  );
}
