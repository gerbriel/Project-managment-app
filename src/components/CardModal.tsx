import React from 'react';
import { createPortal } from 'react-dom';
import Icon from './Icon';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getSupabase } from '../app/supabaseClient';
import type { ID } from '../types/models';
import type { CardRow } from '../types/dto';
import LabelPicker from './LabelPicker';
import DateRangePicker from './DateRangePicker';
import DescriptionEditor from './DescriptionEditor';
import LocationBlock from './LocationBlock';
import CustomFieldsEditor from './CustomFieldsEditor';
import AttachmentList from './AttachmentList';
import ChecklistGroup from './ChecklistGroup';
import CommentComposer from './CommentComposer';
import ActivityFeed from './ActivityFeed';

type Props = {
  cardId: ID;
  boardId: ID;
  initialTitle: string;
  onClose?: () => void;
};

export default function CardModal({ cardId, boardId, initialTitle, onClose }: Props) {
  const [title, setTitle] = React.useState(initialTitle);
  const qc = useQueryClient();
  const sb = getSupabase();
  const lastSavedTitleRef = React.useRef<string>((initialTitle || '').trim());
  const debounceRef = React.useRef<number | null>(null);

  const detailsQuery = useQuery({
    queryKey: ['card', cardId],
    queryFn: async (): Promise<CardRow | null> => {
      const { data, error } = await sb
        .from('cards')
        .select(`
          id, workspace_id, board_id, list_id, title, description, date_start, date_end, position, created_by, created_at, updated_at,
          board:boards(id, name, lists:lists(id, name)),
          card_field_values:card_field_values(field_id, value, custom_field_defs:custom_field_defs(name)),
          card_labels:card_labels(label_id, labels:labels(id, name, color)),
          attachments:attachments(id, name, url, mime, size, created_at),
          comments:comments(id, author_id, body, created_at),
          checklists:checklists(id, title, position, checklist_items:checklist_items(id, text, done, position)),
          activity:activity(id, type, meta, actor_id, created_at)
        `)
        .eq('id', cardId)
        .maybeSingle();
      if (error) throw error;
      return (data as any) ?? null;
    },
  });

  const card = detailsQuery.data ?? null;
  const listNames: Record<string, string> = React.useMemo(() => {
    const map: Record<string, string> = {};
    const lists = (card as any)?.board?.lists as Array<{ id: string; name: string }> | undefined;
    if (Array.isArray(lists)) {
      for (const l of lists) if (l?.id) map[l.id] = l.name || '';
    }
    return map;
  }, [card]);
  // Extract phone/email previews as in CardTile
  let phone: string | undefined;
  let email: string | undefined;
  if (card?.card_field_values && Array.isArray(card.card_field_values)) {
    for (const v of card.card_field_values) {
      const def = Array.isArray(v.custom_field_defs) ? v.custom_field_defs[0] : v.custom_field_defs;
      const name = (def as any)?.name?.toLowerCase?.();
      if (!name) continue;
      try {
        const parsed = typeof (v as any).value === 'string' ? JSON.parse((v as any).value) : (v as any).value;
        const val = parsed?.value;
        if (!val) continue;
        if (!phone && name.includes('phone')) phone = String(val);
        if (!email && name.includes('email')) email = String(val);
      } catch {}
    }
  }

  // Selected label ids on the card
  const selectedLabelIds: string[] = [];
  if (card?.card_labels) {
    for (const cl of card.card_labels) {
      if (cl.label_id) selectedLabelIds.push(cl.label_id);
    }
  }

  const saveMutation = useMutation({
    mutationFn: async (newTitle: string) => {
      const supabase = getSupabase();
      const { error } = await supabase.from('cards').update({ title: newTitle }).eq('id', cardId);
      if (error) throw error;
      // best-effort activity log (ignore RLS errors)
      void (async () => {
        try {
          await supabase.from('activity').insert({ card_id: cardId, type: 'update.title', meta: { title: newTitle } });
        } catch {
          // ignore
        }
      })();
    },
    onSuccess: async () => {
      // Refresh card queries for this board
      await qc.invalidateQueries({ queryKey: ['cards', boardId] });
    },
  });

  // Keep lastSavedTitle in sync with fetched data changes
  React.useEffect(() => {
    const incoming = ((detailsQuery.data?.title ?? initialTitle) || '').trim();
    lastSavedTitleRef.current = incoming;
  }, [detailsQuery.data?.title, initialTitle]);

  // Debounced autosave while typing
  React.useEffect(() => {
    const next = (title || '').trim();
    // Skip if empty or unchanged
    if (!next || next === lastSavedTitleRef.current) return;
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(async () => {
      try {
        await saveMutation.mutateAsync(next);
        lastSavedTitleRef.current = next;
      } catch (e) {
        console.error(e);
      } finally {
        debounceRef.current = null;
      }
    }, 600) as unknown as number;
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [title, saveMutation]);

  // Attachment handlers
  const addAttachmentUrl = async (name: string, url: string, mime = 'application/octet-stream') => {
    const supabase = getSupabase();
    const size = 0;
    const { error } = await supabase.from('attachments').insert({ card_id: cardId, name, url, mime, size, added_by: (await supabase.auth.getUser()).data.user?.id });
    if (error) throw error;
    await qc.invalidateQueries({ queryKey: ['card', cardId] });
    await qc.invalidateQueries({ predicate: (q) => Array.isArray(q.queryKey) && q.queryKey[0] === 'cards' });
  };
  const removeAttachment = async (attachmentId: ID) => {
    const supabase = getSupabase();
    const { error } = await supabase.from('attachments').delete().eq('id', attachmentId);
    if (error) throw error;
    await qc.invalidateQueries({ queryKey: ['card', cardId] });
    await qc.invalidateQueries({ predicate: (q) => Array.isArray(q.queryKey) && q.queryKey[0] === 'cards' });
  };

  // Checklist handlers
  const toggleChecklistItem = async (itemId: ID, done: boolean) => {
    const supabase = getSupabase();
    const { error } = await supabase.from('checklist_items').update({ done }).eq('id', itemId);
    if (error) throw error;
    await qc.invalidateQueries({ queryKey: ['card', cardId] });
  };
  const addChecklistItem = async (checklistId: ID, text: string) => {
    const supabase = getSupabase();
    // compute position at end
    const current = card?.checklists?.find((c) => c.id === checklistId)?.checklist_items ?? [];
    const pos = (current[current.length - 1]?.position ?? 0) + 1;
    const { error } = await supabase.from('checklist_items').insert({ checklist_id: checklistId, text, done: false, position: pos });
    if (error) throw error;
    await qc.invalidateQueries({ queryKey: ['card', cardId] });
  };

  const addChecklist = async () => {
    const supabase = getSupabase();
    const current = card?.checklists ?? [];
    const pos = (current[current.length - 1]?.position ?? 0) + 1;
    const { error } = await supabase.from('checklists').insert({ card_id: cardId, title: 'Checklist', position: pos });
    if (error) throw error;
    await qc.invalidateQueries({ queryKey: ['card', cardId] });
  };

  // Archive/Delete handlers
  const archive = async () => {
    const { archiveCard } = await import('@api/cards');
    await archiveCard(cardId);
    await qc.invalidateQueries({ predicate: (q) => Array.isArray(q.queryKey) && (q.queryKey.includes('cards') || q.queryKey.includes('card')) });
    onClose?.();
  };
  const del = async () => {
    if (!confirm('Delete this card? This cannot be undone.')) return;
    const { deleteCard } = await import('@api/cards');
    await deleteCard(cardId);
    await qc.invalidateQueries({ predicate: (q) => Array.isArray(q.queryKey) && (q.queryKey.includes('cards') || q.queryKey.includes('card')) });
    onClose?.();
  };

  // Comments
  const addComment = async (body: string) => {
    const supabase = getSupabase();
    const user = (await supabase.auth.getUser()).data.user;
    const { error } = await supabase.from('comments').insert({ card_id: cardId, author_id: user?.id, body });
    if (error) throw error;
    await qc.invalidateQueries({ queryKey: ['card', cardId] });
    await qc.invalidateQueries({ predicate: (q) => Array.isArray(q.queryKey) && q.queryKey[0] === 'cards' });
  };

  // Helper: autosave title if changed, then close
  const handleClose = React.useCallback(async () => {
    const baseline = (detailsQuery.data?.title ?? initialTitle) || '';
    const next = (title || '').trim();
    if (next && next !== baseline) {
      try {
        await saveMutation.mutateAsync(next);
      } catch (e) {
        // ignore error on close; user intent is to exit
        console.error(e);
      }
    }
    onClose?.();
  }, [detailsQuery.data?.title, initialTitle, title, onClose, saveMutation]);

  // Close on Escape
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        handleClose();
      }
    };
    window.addEventListener('keydown', onKey, { once: false });
    return () => window.removeEventListener('keydown', onKey);
  }, [handleClose]);

  // Prevent background scroll while modal is open
  React.useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = body.style.overflow;
    html.style.overflow = 'hidden';
    body.style.overflow = 'hidden';
    // Notify globally that a card modal is open
    const setOpen = (open: boolean) => {
      (window as any).__CARD_MODAL_OPEN__ = open;
      try {
        window.dispatchEvent(new CustomEvent('card-modal-toggle', { detail: open } as any));
      } catch {}
    };
    setOpen(true);
    return () => {
      html.style.overflow = prevHtmlOverflow;
      body.style.overflow = prevBodyOverflow;
      setOpen(false);
    };
  }, []);

  return createPortal(
    <div className="fixed inset-0 z-40">
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />
      <div className="relative z-10 flex h-full w-full items-center justify-center">
        <div className="w-[80vw] h-[80vh] max-w-6xl rounded-2xl border border-border bg-bg-card text-fg shadow-card overflow-hidden flex flex-col">
          <div className="flex items-center gap-3 px-5 py-3 border-b border-border bg-bg-card/95 backdrop-blur">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="flex-1 rounded border border-border bg-bg-inset px-3 py-2 text-lg font-medium"
              placeholder="Card title"
            />
            <button className="ml-2 shrink-0 text-fg-subtle hover:text-fg" onClick={handleClose} aria-label="Close">
              <Icon name="x" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-5">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left: main content (2 cols) */}
          <div className="lg:col-span-2">
            {/* Actions row */}
            <div className="mt-1 flex flex-wrap gap-2 text-sm">
              <button className="px-2 py-1 rounded border border-border text-fg-subtle hover:text-fg">+ Add</button>
              <button className="px-2 py-1 rounded border border-border text-fg-subtle hover:text-fg">Checklist</button>
              <button className="px-2 py-1 rounded border border-border text-fg-subtle hover:text-fg">Members</button>
              <button className="px-2 py-1 rounded border border-border text-fg-subtle hover:text-fg">Attachment</button>
              <span className="flex-1" />
              <button className="px-2 py-1 rounded border border-border text-fg-subtle hover:text-fg" onClick={archive}>Archive</button>
              <button className="px-2 py-1 rounded border border-danger/40 text-danger hover:text-danger/80" onClick={del}>Delete</button>
            </div>

            {/* Label picker and dates */}
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <div className="text-sm text-fg-muted mb-1">Labels</div>
                {card ? (
                  <LabelPicker workspaceId={card.workspace_id} cardId={card.id} selectedLabelIds={selectedLabelIds} />
                ) : (
                  <div className="text-fg-muted text-sm">Loading…</div>
                )}
              </div>
              <div>
                <div className="text-sm text-fg-muted mb-1">Dates</div>
                <DateRangePicker cardId={cardId} start={card?.date_start ?? undefined} end={card?.date_end ?? undefined} />
              </div>
            </div>

            {/* Description */}
            <div className="mt-4">
              <div className="text-sm text-fg-muted mb-1">Description</div>
              <DescriptionEditor cardId={cardId} value={card?.description ?? null} />
            </div>

            {/* Location */}
            <div className="mt-4">
              <div className="text-sm text-fg-muted mb-1">Location</div>
              <LocationBlock
                cardId={cardId}
                boardId={boardId}
                lat={(card as any)?.location_lat ?? null}
                lng={(card as any)?.location_lng ?? null}
                address={(card as any)?.location_address ?? null}
                title={card?.title}
              />
            </div>

            {/* Custom Fields */}
            <div className="mt-4">
              <div className="text-sm text-fg-muted mb-1">Custom Fields</div>
              {(phone || email) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm mb-2">
                  {phone && (
                    <div className="rounded border border-border bg-bg-inset p-2">
                      <div className="text-fg-muted text-xs">Phone</div>
                      <div className="mt-1">{phone}</div>
                    </div>
                  )}
                  {email && (
                    <div className="rounded border border-border bg-bg-inset p-2">
                      <div className="text-fg-muted text-xs">Email</div>
                      <div className="mt-1">{email}</div>
                    </div>
                  )}
                </div>
              )}
              <CustomFieldsEditor />
            </div>

            {/* Attachments */}
            <div className="mt-4">
              <div className="text-sm text-fg-muted mb-1">Attachments</div>
              <AttachmentList
                attachments={card?.attachments ?? []}
                onAddUrl={(n, u) => addAttachmentUrl(n, u)}
                onRemove={(id) => removeAttachment(id)}
                workspaceId={card?.workspace_id}
                cardId={cardId}
                onUploaded={async () => {
                  await qc.invalidateQueries({ queryKey: ['card', cardId] });
                  await qc.invalidateQueries({ predicate: (q) => Array.isArray(q.queryKey) && q.queryKey[0] === 'cards' });
                }}
              />
            </div>

            {/* Checklists */}
            <div className="mt-4">
              <div className="text-sm text-fg-muted mb-1">Checklists</div>
              <ChecklistGroup checklists={card?.checklists ?? []} onToggleItem={toggleChecklistItem} onAddItem={addChecklistItem} onAddChecklist={addChecklist} />
            </div>
          </div>

          {/* Right: comments & activity */}
          <div className="lg:col-span-1">
            <div className="text-sm text-fg-muted mb-1">Comments</div>
            <CommentComposer onSubmit={addComment} />
            <div className="mt-3">
              <ActivityFeed comments={card?.comments ?? []} activity={card?.activity ?? []} listNames={listNames} />
            </div>
          </div>
            </div>
          </div>
          {/* Footer removed: autosave occurs on close via backdrop, X button, or Esc */}
        </div>
      </div>
    </div>
  , document.body);
}
