import React, { useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Task, Workflow } from '../types/models';

interface ChecklistGroupProps {
  checklist: { id: string; title?: string; card_id?: string };
  items: { id: string; text?: string; done: boolean; workflow_id?: string; position?: number }[];
  onToggleItem: (itemId: string, checked: boolean) => void;
  onAddItem?: (checklistId: string, text: string) => void;
  onRenameItem?: (itemId: string, newText: string) => void;
  onRenameChecklist?: (checklistId: string, newTitle: string) => void;
  onReorderItems?: (checklistId: string, itemIds: string[]) => void;
  onDeleteItem?: (itemId: string) => void;
  onDeleteChecklist?: (checklistId: string) => void;
}

interface SortableChecklistItemProps {
  item: { id: string; text?: string; done: boolean };
  onToggle: (checked: boolean) => void;
  onDelete?: (itemId: string) => void;
}

function SortableChecklistItem({ item, onToggle, onDelete }: SortableChecklistItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 p-1 rounded ${isDragging ? 'bg-surface-2' : 'hover:bg-surface-2'}`}
      {...attributes}
    >
      <div
        {...listeners}
        className="flex items-center justify-center w-4 h-4 cursor-grab active:cursor-grabbing text-muted hover:text-fg transition-colors"
        title="Drag to reorder"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="9" cy="6" r="1" fill="currentColor"/>
          <circle cx="15" cy="6" r="1" fill="currentColor"/>
          <circle cx="9" cy="12" r="1" fill="currentColor"/>
          <circle cx="15" cy="12" r="1" fill="currentColor"/>
          <circle cx="9" cy="18" r="1" fill="currentColor"/>
          <circle cx="15" cy="18" r="1" fill="currentColor"/>
        </svg>
      </div>
      <input
        type="checkbox"
        checked={item.done || false}
        onChange={(e) => onToggle(e.target.checked)}
        className="flex-shrink-0"
      />
      <span className={`flex-1 select-none ${item.done ? 'line-through text-muted' : ''}`}>
        {item.text || 'Item'}
      </span>
      {onDelete && (
        <button
          onClick={() => onDelete(item.id)}
          className="flex items-center justify-center w-4 h-4 text-muted hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
          title="Delete task"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </button>
      )}
    </div>
  );
}

function ChecklistHeader({ title, percentage, onRename, onDelete }: { 
  title: string; 
  percentage: number; 
  onRename?: (newTitle: string) => void;
  onDelete?: () => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(title);

  const handleSave = () => {
    if (editValue.trim() && editValue !== title && onRename) {
      onRename(editValue.trim());
    }
    setIsEditing(false);
    setEditValue(title);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setEditValue(title);
    }
  };

  return (
    <div className="flex items-center gap-2 p-2 border-b border-app/20">
      {isEditing ? (
        <input
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          className="flex-1 bg-transparent text-sm font-medium outline-none"
          autoFocus
        />
      ) : (
        <h4
          className={`flex-1 text-sm font-medium ${onRename ? 'cursor-pointer hover:text-accent' : ''}`}
          onClick={() => onRename && setIsEditing(true)}
          title={onRename ? 'Click to rename workflow' : undefined}
        >
          {title}
        </h4>
      )}
      <span className="text-xs text-muted">{Math.round(percentage)}%</span>
      {onDelete && (
        <button
          onClick={onDelete}
          className="flex items-center justify-center w-5 h-5 text-muted hover:text-red-500 transition-colors"
          title="Delete workflow"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </button>
      )}
    </div>
  );
}

function AddItemRow({ onAdd }: { onAdd: (text: string) => void }) {
  const [isAdding, setIsAdding] = useState(false);
  const [itemText, setItemText] = useState('');

  const handleSave = () => {
    if (itemText.trim()) {
      onAdd(itemText.trim());
      setItemText('');
    }
    setIsAdding(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      setIsAdding(false);
      setItemText('');
    }
  };

  if (isAdding) {
    return (
      <div className="flex items-center gap-2 p-1">
        <div className="w-4 h-4"></div>
        <input type="checkbox" disabled className="flex-shrink-0 opacity-50" />
        <input
          type="text"
          value={itemText}
          onChange={(e) => setItemText(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          placeholder="Add item..."
          className="flex-1 bg-transparent text-sm outline-none"
          autoFocus
        />
      </div>
    );
  }

  return (
    <button
      onClick={() => setIsAdding(true)}
      className="flex items-center gap-2 p-1 text-sm text-muted hover:text-fg hover:bg-surface-2 rounded transition-colors w-full"
    >
      <div className="w-4 h-4"></div>
      <span className="text-muted">+</span>
      <span>Add item...</span>
    </button>
  );
}

export default function ChecklistGroup({
  checklist,
  items,
  onToggleItem,
  onAddItem,
  onRenameItem,
  onRenameChecklist,
  onReorderItems,
}: ChecklistGroupProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const cl = checklist || { id: '', title: 'Checklist' };
  const safeItems = items || [];
  const completedCount = safeItems.filter(item => item.done).length;
  const totalCount = safeItems.length;
  const pct = totalCount === 0 ? 0 : (completedCount / totalCount) * 100;

  const handleDragEnd = (event: DragEndEvent, checklistId: string) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      const oldIndex = safeItems.findIndex(item => item.id === active.id);
      const newIndex = safeItems.findIndex(item => item.id === over?.id);
      
      const reorderedItems = arrayMove(safeItems, oldIndex, newIndex);
      const itemIds = reorderedItems.map(item => item.id);
      
      if (onReorderItems) {
        onReorderItems(checklistId, itemIds);
      }
    }
  };

  return (
    <div className="border border-app/20 rounded-lg bg-surface overflow-hidden">
      <ChecklistHeader 
        title={cl.title || 'Checklist'} 
        percentage={pct}
        onRename={onRenameChecklist ? (newTitle) => onRenameChecklist(cl.id, newTitle) : undefined}
      />
      <div className="h-1 bg-app/30" style={{ width: '100%' }}>
        <div className="h-1 bg-accent" style={{ width: `${pct}%` }} />
      </div>
      
      <DndContext 
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={(event) => handleDragEnd(event, cl.id)}
      >
        <div className="p-2 space-y-1 text-sm">
          <SortableContext items={safeItems.filter(item => item.id && item.id.trim() !== '').map(item => item.id)} strategy={verticalListSortingStrategy}>
            {safeItems.filter(item => item.id && item.id.trim() !== '').map(item => (
              <SortableChecklistItem
                key={item.id}
                item={item}
                onToggle={(checked) => onToggleItem(item.id, checked)}
              />
            ))}
          </SortableContext>
          
          {onAddItem && (
            <AddItemRow onAdd={(text) => onAddItem(cl.id, text)} />
          )}
        </div>
      </DndContext>
    </div>
  );
}
