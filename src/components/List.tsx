import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import type { CardRow } from '../types/dto';
import SortableCard from './SortableCard';
import { renameList } from '@api/lists';
import { useQueryClient } from '@tanstack/react-query';

type Props = { title: string; listId: string; cards: CardRow[]; bump?: boolean };

export default function List({ title, listId, cards, bump }: Props) {
  const { setNodeRef } = useDroppable({ id: listId, data: { type: 'list', listId } });
  const qc = useQueryClient();
  const [editing, setEditing] = React.useState(false);
  const [name, setName] = React.useState(title);

  React.useEffect(() => setName(title), [title]);

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

  return (
    <div
      ref={setNodeRef}
      className={`w-80 bg-bg-card text-fg rounded-xl border border-border p-3 shadow-card transition-transform duration-200 will-change-transform hover:scale-[1.01] ${
        bump ? 'animate-jiggle scale-[1.015]' : ''
      }`}
    >
      <div className="font-medium mb-2 flex items-center justify-between">
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
        <button className="text-fg-subtle hover:text-fg">⋮</button>
      </div>
      <SortableContext items={cards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-2 min-h-[20px]">
          {cards.map((c) => (
            <SortableCard key={c.id} card={c} dragging={false} />
          ))}
        </div>
      </SortableContext>
      <button className="mt-3 w-full text-left text-fg-muted hover:text-fg">+ Add card</button>
    </div>
  );
}
