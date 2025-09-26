import React from 'react';
import { supabase } from '../../lib/supabase';

type Id = string;
type ListRow = { id: Id; name: string; board_id: Id };
type BoardRow = { id: Id; name: string };

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function MoveAnyListModal({ isOpen, onClose, onSuccess }: Props) {
  const [lists, setLists] = React.useState<ListRow[]>([]);
  const [boards, setBoards] = React.useState<BoardRow[]>([]);
  const [fromListId, setFromListId] = React.useState<Id>('');
  const [toBoardId, setToBoardId] = React.useState<Id>('');
  const [includeCards, setIncludeCards] = React.useState(true);
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!isOpen) return;
    (async () => {
      setErr(null);
      const [{ data: l, error: le }, { data: b, error: be }] = await Promise.all([
        supabase.from('lists').select('id,name,board_id').order('name', { ascending: true }),
        supabase.from('boards').select('id,name').order('name', { ascending: true }),
      ]);
      if (le) setErr(le.message);
      else setLists(l || []);
      if (be) setErr(be.message);
      else setBoards(b || []);
    })();
  }, [isOpen]);

  const submit = async () => {
    if (!fromListId || !toBoardId) {
      setErr('Select list and target board');
      return;
    }
    setLoading(true);
    setErr(null);
    const { error } = await supabase.rpc('move_list_between_boards', {
      p_list_id: fromListId,
      p_to_board: toBoardId,
      p_include_cards: includeCards,
      p_new_position: null,
    });
    setLoading(false);
    if (error) {
      setErr(error.message || 'Failed to move list');
      return;
    }
    onSuccess?.();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-background text-foreground border border-border rounded-lg shadow-xl w-full max-w-md">
        <div className="p-4 border-b border-border">
          <h2 className="text-base font-semibold">Move List</h2>
        </div>
        <div className="p-4 space-y-4">
          {err && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2">{err}</div>}
          <div>
            <label className="block text-sm mb-1">List</label>
            <select
              value={fromListId}
              onChange={(e) => setFromListId(e.target.value)}
              className="w-full px-2 py-2 rounded border border-input bg-background"
              disabled={loading}
            >
              <option value="">Select a list…</option>
              {lists.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm mb-1">Target board</label>
            <select
              value={toBoardId}
              onChange={(e) => setToBoardId(e.target.value)}
              className="w-full px-2 py-2 rounded border border-input bg-background"
              disabled={loading}
            >
              <option value="">Select a board…</option>
              {boards.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="rounded"
              checked={includeCards}
              onChange={(e) => setIncludeCards(e.target.checked)}
              disabled={loading}
            />
            Move cards with the list
          </label>
        </div>
        <div className="p-4 border-t border-border flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-2 rounded hover:bg-muted" disabled={loading}>
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={loading || !fromListId || !toBoardId}
            className="px-3 py-2 rounded bg-primary text-primary-foreground disabled:opacity-50"
          >
            {loading ? 'Moving…' : 'Move'}
          </button>
        </div>
      </div>
    </div>
  );
}
    </div>
  );
}
