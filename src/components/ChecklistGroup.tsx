import React from 'react';

type Item = { id: string; text?: string; done: boolean };
type Checklist = { id: string; title?: string; checklist_items?: Item[] };

type Props = {
  checklists: Checklist[];
  onToggleItem: (itemId: string, done: boolean) => Promise<void> | void;
  onAddItem: (checklistId: string, text: string) => Promise<void> | void;
  onAddChecklist?: () => Promise<void> | void;
};

export default function ChecklistGroup({ checklists, onToggleItem, onAddItem, onAddChecklist }: Props) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted">Checklists</div>
        {onAddChecklist && (
          <button className="text-xs px-2 py-1 rounded border border-app hover:text-app" onClick={() => onAddChecklist()}>
            + Add checklist
          </button>
        )}
      </div>
      {checklists.length === 0 ? (
        <div className="text-sm text-muted">No checklists</div>
      ) : (
        checklists.map((cl) => {
          const items = cl.checklist_items ?? [];
          const total = items.length;
          const done = items.filter((i) => i.done).length;
          const pct = total ? Math.round((done / total) * 100) : 0;
          return (
            <div key={cl.id} className="rounded border border-app">
              <div className="p-2 flex items-center justify-between">
                <div className="font-medium text-sm">{cl.title || 'Checklist'}</div>
                <div className="text-xs text-muted">{pct}%</div>
              </div>
              <div className="h-1 bg-app/30" style={{ width: '100%' }}>
                <div className="h-1 bg-accent" style={{ width: `${pct}%` }} />
              </div>
              <ul className="p-2 space-y-1 text-sm">
                {items.map((it) => (
                  <li key={it.id} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={it.done}
                      onChange={(e) => onToggleItem(it.id, e.target.checked)}
                    />
                    <span className={it.done ? 'line-through text-muted' : ''}>{it.text || 'Item'}</span>
                  </li>
                ))}
                <AddItemRow onAdd={(text) => onAddItem(cl.id, text)} />
              </ul>
            </div>
          );
        })
      )}
    </div>
  );
}

function AddItemRow({ onAdd }: { onAdd: (text: string) => void }) {
  const [val, setVal] = React.useState('');
  return (
    <div className="flex items-center gap-2">
      <input
        className="flex-1 rounded border border-app bg-surface-2 px-2 py-1"
        placeholder="Add item"
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && val.trim()) {
            onAdd(val.trim());
            setVal('');
          }
        }}
      />
      <button
        className="px-2 py-1 rounded border border-app text-xs"
        onClick={() => {
          if (!val.trim()) return;
          onAdd(val.trim());
          setVal('');
        }}
      >
        Add
      </button>
    </div>
  );
}
