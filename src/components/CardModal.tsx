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
import MembersPicker from './MembersPicker';
import AttachmentList from './AttachmentList';
import ChecklistGroup from './ChecklistGroup';
import CommentComposer from './CommentComposer';
import ActivityFeed from './ActivityFeed';
import MoveCardDialog from './MoveCardDialog';
import { logCardStateChange } from '../api/activityLogger';

type Props = {
  cardId: ID;
  boardId: ID;
  initialTitle: string;
  onClose?: () => void;
};

export default function CardModal({ cardId, boardId, initialTitle, onClose }: Props) {
  const [title, setTitle] = React.useState(initialTitle);
  const [showMoveDialog, setShowMoveDialog] = React.useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);
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
          id, workspace_id, board_id, list_id, title, description, location_lat, location_lng, location_address, date_start, date_end, position, created_by, created_at, updated_at,
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
  
  // Check if this card is on an Archive board
  const isOnArchiveBoard = (card as any)?.board?.name === 'Archive';

  const saveMutation = useMutation({
    mutationFn: async (newTitle: string) => {
      const supabase = getSupabase();
      const oldTitle = detailsQuery.data?.title || initialTitle || '';
      const { error } = await supabase.from('cards').update({ title: newTitle }).eq('id', cardId);
      if (error) throw error;
      // Log activity with proper old/new values
      const { logTitleUpdate } = await import('../api/activityLogger');
      await logTitleUpdate(cardId, oldTitle, newTitle);
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
    const { data, error } = await supabase.from('attachments').insert({ card_id: cardId, name, url, mime, size, added_by: (await supabase.auth.getUser()).data.user?.id }).select('id').single();
    if (error) throw error;
    
    // Log activity
    const { logAttachmentOperation } = await import('../api/activityLogger');
    await logAttachmentOperation(cardId, 'add', name, data?.id, url, size);
    
    await qc.invalidateQueries({ queryKey: ['card', cardId] });
    await qc.invalidateQueries({ predicate: (q) => Array.isArray(q.queryKey) && q.queryKey[0] === 'cards' });
  };
  const removeAttachment = async (attachmentId: ID) => {
    const supabase = getSupabase();
    
    // Get attachment name before deletion for logging
    const { data: attachment } = await supabase.from('attachments').select('name').eq('id', attachmentId).single();
    
    const { error } = await supabase.from('attachments').delete().eq('id', attachmentId);
    if (error) throw error;
    
    // Log activity
    const { logAttachmentOperation } = await import('../api/activityLogger');
    await logAttachmentOperation(cardId, 'remove', attachment?.name || 'Unknown', attachmentId);
    
    await qc.invalidateQueries({ queryKey: ['card', cardId] });
    await qc.invalidateQueries({ predicate: (q) => Array.isArray(q.queryKey) && q.queryKey[0] === 'cards' });
  };

  // Checklist handlers
  const toggleChecklistItem = async (itemId: ID, done: boolean) => {
    const supabase = getSupabase();
    
    // Get item details before update for logging
    const { data: item } = await supabase.from('checklist_items').select('text, checklist_id').eq('id', itemId).single();
    
    const { error } = await supabase.from('checklist_items').update({ done }).eq('id', itemId);
    if (error) throw error;
    
    // Log activity
    const { logChecklistItemOperation } = await import('../api/activityLogger');
    await logChecklistItemOperation(cardId, 'toggle', itemId, item?.text || 'Unknown item', done, item?.checklist_id);
    
    await qc.invalidateQueries({ queryKey: ['card', cardId] });
  };
  const addChecklistItem = async (checklistId: ID, text: string) => {
    const supabase = getSupabase();
    // compute position at end
    const current = card?.checklists?.find((c) => c.id === checklistId)?.checklist_items ?? [];
    const pos = (current[current.length - 1]?.position ?? 0) + 1;
    const { data, error } = await supabase.from('checklist_items').insert({ checklist_id: checklistId, text, done: false, position: pos }).select('id').single();
    if (error) throw error;
    
    // Log activity
    const { logChecklistItemOperation } = await import('../api/activityLogger');
    await logChecklistItemOperation(cardId, 'add', data?.id || '', text, false, checklistId);
    
    await qc.invalidateQueries({ queryKey: ['card', cardId] });
  };

  const addChecklist = async () => {
    const supabase = getSupabase();
    const current = card?.checklists ?? [];
    const pos = (current[current.length - 1]?.position ?? 0) + 1;
    const title = 'Checklist';
    const { data, error } = await supabase.from('checklists').insert({ card_id: cardId, title, position: pos }).select('id').single();
    if (error) throw error;
    
    // Log activity
    const { logChecklistOperation } = await import('../api/activityLogger');
    await logChecklistOperation(cardId, 'add', data?.id || '', title);
    
    await qc.invalidateQueries({ queryKey: ['card', cardId] });
  };

  // Members placeholder
  const [showMembers, setShowMembers] = React.useState(false);

  // Attachment picker bridge
  const openUploadRef = React.useRef<null | (() => void)>(null);

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

  // Archive card (move to Archive board)
  const archiveCard = async () => {
    try {
      const supabase = getSupabase();
      const { data: workspaces } = await supabase.from('workspaces').select('id').limit(1);
      if (!workspaces?.[0]) return;
      
      // Find or create Archive board
      let { data: archiveBoards } = await supabase
        .from('boards')
        .select('id, lists:lists(id)')
        .eq('workspace_id', workspaces[0].id)
        .eq('name', 'Archive');
      
      let archiveBoardId: ID;
      let archiveListId: ID;
      
      if (!archiveBoards?.[0]) {
        // Create Archive board
        const { data: newBoard } = await supabase
          .from('boards')
          .insert({ workspace_id: workspaces[0].id, name: 'Archive' })
          .select('id')
          .single();
        if (!newBoard) throw new Error('Failed to create Archive board');
        
        // Create a default list in the Archive board
        const { data: newList } = await supabase
          .from('lists')
          .insert({ board_id: newBoard.id, name: 'Archived Cards', position: 0 })
          .select('id')
          .single();
        if (!newList) throw new Error('Failed to create Archive list');
        
        archiveBoardId = newBoard.id;
        archiveListId = newList.id;
      } else {
        archiveBoardId = archiveBoards[0].id;
        const lists = (archiveBoards[0] as any).lists;
        if (!lists?.[0]) {
          // Create a default list if none exists
          const { data: newList } = await supabase
            .from('lists')
            .insert({ board_id: archiveBoardId, name: 'Archived Cards', position: 0 })
            .select('id')
            .single();
          if (!newList) throw new Error('Failed to create Archive list');
          archiveListId = newList.id;
        } else {
          archiveListId = lists[0].id;
        }
      }
      
      // Move card to Archive
      const { error } = await supabase
        .from('cards')
        .update({ board_id: archiveBoardId, list_id: archiveListId })
        .eq('id', cardId);
      
      if (error) throw error;
      
      // Log activity
      await logCardStateChange(cardId, 'archive');
      
      // Refresh queries and close modal
      await qc.invalidateQueries({ queryKey: ['cards', boardId] });
      await qc.invalidateQueries({ queryKey: ['card', cardId] });
      onClose?.();
      
    } catch (error) {
      console.error('Failed to archive card:', error);
      alert('Failed to archive card. Please try again.');
    }
  };

  // Restore card from Archive
  const restoreCard = async () => {
    try {
      const supabase = getSupabase();
      const { data: workspaces } = await supabase.from('workspaces').select('id').limit(1);
      if (!workspaces?.[0]) return;
      
      // Find the first non-Archive board
      const { data: boards } = await supabase
        .from('boards')
        .select('id, name, lists:lists(id)')
        .eq('workspace_id', workspaces[0].id)
        .neq('name', 'Archive')
        .limit(1);
      
      if (!boards?.[0]) {
        alert('No boards available to restore the card to.');
        return;
      }
      
      const targetBoard = boards[0];
      const lists = (targetBoard as any).lists;
      if (!lists?.[0]) {
        alert('The target board has no lists. Please create a list first.');
        return;
      }
      
      // Move card to first list of first non-Archive board
      const { error } = await supabase
        .from('cards')
        .update({ board_id: targetBoard.id, list_id: lists[0].id })
        .eq('id', cardId);
      
      if (error) throw error;
      
      // Log activity
      await logCardStateChange(cardId, 'restore');
      
      // Refresh queries and close modal
      await qc.invalidateQueries({ queryKey: ['cards', boardId] });
      await qc.invalidateQueries({ queryKey: ['card', cardId] });
      onClose?.();
      
    } catch (error) {
      console.error('Failed to restore card:', error);
      alert('Failed to restore card. Please try again.');
    }
  };

  // Delete card permanently
  const deleteCard = async () => {
    try {
      const supabase = getSupabase();
      
      // Log activity before deletion
      await logCardStateChange(cardId, 'delete');
      
      // Delete the card (cascade should handle related data)
      const { error } = await supabase.from('cards').delete().eq('id', cardId);
      if (error) throw error;
      
      // Refresh queries and close modal
      await qc.invalidateQueries({ queryKey: ['cards', boardId] });
      onClose?.();
      
    } catch (error) {
      console.error('Failed to delete card:', error);
      alert('Failed to delete card. Please try again.');
    }
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
    // Add a global class so CSS can disable animations while modal is open
    html.classList.add('modal-open');
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
      html.classList.remove('modal-open');
      setOpen(false);
    };
  }, []);

  return createPortal(
    <div className="fixed inset-0 z-40">
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />
      <div className="relative z-10 flex h-full w-full items-center justify-center">
  <div className="w-[80vw] h-[80vh] max-w-6xl rounded-2xl border border-border bg-bg-card text-fg shadow-card overflow-hidden flex flex-col select-text">
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
                <button className="px-2 py-1 rounded border border-border text-fg-subtle hover:text-fg" onClick={addChecklist}>+ Add</button>
                <button className="px-2 py-1 rounded border border-border text-fg-subtle hover:text-fg" onClick={addChecklist}>Checklist</button>
                <button className="px-2 py-1 rounded border border-border text-fg-subtle hover:text-fg" onClick={() => setShowMembers((v) => !v)}>Members</button>
                <button className="px-2 py-1 rounded border border-border text-fg-subtle hover:text-fg" onClick={() => openUploadRef.current?.()}>Attachment</button>
              <span className="flex-1" />
              <button className="px-2 py-1 rounded border border-border text-fg-subtle hover:text-fg" onClick={archive}>Archive</button>
              {isOnArchiveBoard && (
                <button className="px-2 py-1 rounded border border-danger/40 text-danger hover:text-danger/80" onClick={del}>Delete</button>
              )}
            </div>

            {showMembers && card?.workspace_id && (
              <div className="mt-2 rounded border border-border bg-bg-inset p-3 text-sm">
                <div className="font-medium mb-2">Members</div>
                <MembersPicker workspaceId={card.workspace_id} cardId={cardId} />
              </div>
            )}

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
              <CustomFieldsEditor workspaceId={card?.workspace_id as any} cardId={cardId} values={card?.card_field_values as any} />
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
                registerOpenPicker={(fn) => (openUploadRef.current = fn)}
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

            {/* Card Actions */}
            <div className="mt-4">
              <div className="text-sm text-fg-muted mb-2">Card Actions</div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setShowMoveDialog(true)}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm bg-bg-subtle border border-border rounded hover:bg-bg-muted transition-colors"
                >
                  <Icon name="arrow-right" size={14} />
                  Move Card
                </button>
                {!isOnArchiveBoard ? (
                  <button
                    onClick={archiveCard}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm bg-bg-subtle border border-border rounded hover:bg-bg-muted transition-colors"
                  >
                    <Icon name="archive" size={14} />
                    Archive
                  </button>
                ) : (
                  <button
                    onClick={restoreCard}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm bg-bg-subtle border border-border rounded hover:bg-bg-muted transition-colors"
                  >
                    <Icon name="plus" size={14} />
                    Restore
                  </button>
                )}
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm bg-red-50 border border-red-200 text-red-700 rounded hover:bg-red-100 transition-colors"
                >
                  <Icon name="trash" size={14} />
                  Delete
                </button>
              </div>
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
      
      {/* Move Card Dialog */}
      {showMoveDialog && card && (
        <MoveCardDialog
          cardId={cardId}
          currentBoardId={boardId}
          currentListId={card.list_id}
          workspaceId={card.workspace_id}
          onClose={() => setShowMoveDialog(false)}
          onMoved={async () => {
            setShowMoveDialog(false);
            await qc.invalidateQueries({ queryKey: ['cards', boardId] });
            await qc.invalidateQueries({ queryKey: ['card', cardId] });
            onClose?.();
          }}
        />
      )}
      
      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Card</h3>
            <p className="text-gray-600 mb-4">
              Are you sure you want to delete this card? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  setShowDeleteConfirm(false);
                  await deleteCard();
                }}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  , document.body);
}
