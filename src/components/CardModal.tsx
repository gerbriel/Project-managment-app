import React from 'react';
import { createPortal } from 'react-dom';
import Icon from './Icon';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getSupabase } from '../app/supabaseClient';
import type { ID, Task } from '../types/models';
import type { CardRow } from '../types/dto';
import LabelPicker from './LabelPicker';
import DateRangePicker from './DateRangePicker';
import DescriptionEditor from './DescriptionEditor';
import LocationBlock from './LocationBlock';
import CustomFieldsManager from './CustomFieldsManager';
import MembersPicker from './MembersPicker';
import AttachmentList from './AttachmentList';
import WorkflowGroup from './WorkflowGroup';
import { deleteWorkflow, deleteTask } from '../api/checklists';
import CommentComposer from './CommentComposer';
import ActivityFeed from './ActivityFeed';
import MoveCardDialog from './MoveCardDialog';
import RestoreCardDialog from './RestoreCardDialog';
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
  const [showRestoreDialog, setShowRestoreDialog] = React.useState(false);
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
  const toggleWorkflowTask = async (taskId: ID, done: boolean) => {
    // Validate UUID format
    if (!taskId || typeof taskId !== 'string' || taskId.trim() === '') {
      console.warn('toggleWorkflowTask called with invalid taskId:', taskId);
      return;
    }

    const supabase = getSupabase();
    
    const { data: task } = await supabase.from('checklist_items').select('text, checklist_id').eq('id', taskId).single();
    
    const { error } = await supabase.from('checklist_items').update({ done }).eq('id', taskId);
    if (error) throw error;
    
    // Log activity
    const { logChecklistItemOperation } = await import('../api/activityLogger');
    await logChecklistItemOperation(cardId, 'toggle', taskId, task?.text || 'Unknown task', done, task?.checklist_id);
    
    await qc.invalidateQueries({ queryKey: ['card', cardId] });
  };

  const updateWorkflowTask = async (taskId: ID, updates: Partial<Task>) => {
    const supabase = getSupabase();
    
    // Get the current task data to check for assignment changes
    const { data: currentTask } = await supabase
      .from('checklist_items')
      .select('assigned_to, text, checklist_id, checklists(title)')
      .eq('id', taskId)
      .single();
    
    // Prepare the update object with only the fields that exist in the database
    const dbUpdate: any = {};
    if ('text' in updates) dbUpdate.text = updates.text;
    if ('done' in updates) dbUpdate.done = updates.done;
    if ('due_date' in updates) dbUpdate.due_date = updates.due_date;
    if ('assigned_to' in updates) dbUpdate.assigned_to = updates.assigned_to;
    if ('reminder_date' in updates) dbUpdate.reminder_date = updates.reminder_date;
    
    const { error } = await supabase.from('checklist_items').update(dbUpdate).eq('id', taskId);
    if (error) {
      // Check if it's a column doesn't exist error
      if (error.code === '42703' || error.message?.includes('column') || error.message?.includes('does not exist')) {
        // Enhanced task features will be available when database schema is updated
        
        // Try updating only the basic fields that we know exist
        const basicUpdate: any = {};
        if ('text' in updates) basicUpdate.text = updates.text;
        if ('done' in updates) basicUpdate.done = updates.done;
        
        if (Object.keys(basicUpdate).length > 0) {
          const { error: basicError } = await supabase.from('checklist_items').update(basicUpdate).eq('id', taskId);
          if (basicError) throw basicError;
          console.log('✅ Basic task update successful');
        }
      } else {
        // Some other error occurred
        throw error;
      }
    } else {
      console.log('✅ Full task update successful');
      
      // Send notification if task was assigned to someone new
      if ('assigned_to' in updates && updates.assigned_to && updates.assigned_to !== currentTask?.assigned_to) {
        const { notifyTaskAssignment } = await import('../api/notifications');
        await notifyTaskAssignment(
          taskId,
          updates.assigned_to,
          currentTask?.text || 'Task',
          card?.title || 'Card'
        );
      }
    }
    
    await qc.invalidateQueries({ queryKey: ['card', cardId] });
  };

  const addWorkflowTask = async (workflowId: ID, text: string) => {
    const supabase = getSupabase();
    // compute position at end
    const current = card?.checklists?.find((c) => c.id === workflowId)?.checklist_items ?? [];
    const pos = (current[current.length - 1]?.position ?? 0) + 1;
    const { data, error } = await supabase.from('checklist_items').insert({ checklist_id: workflowId, text, done: false, position: pos }).select('id').single();
    if (error) throw error;
    
    // Log activity
    const { logChecklistItemOperation } = await import('../api/activityLogger');
    await logChecklistItemOperation(cardId, 'add', data?.id || '', text, false, workflowId);
    
    await qc.invalidateQueries({ queryKey: ['card', cardId] });
  };

  const addWorkflow = async (title: string = 'Workflow') => {
    const supabase = getSupabase();
    const current = card?.checklists ?? [];
    const pos = (current[current.length - 1]?.position ?? 0) + 1;
    const { data, error } = await supabase.from('checklists').insert({ card_id: cardId, title, position: pos }).select('id').single();
    if (error) throw error;
    
    // Log activity
    const { logChecklistOperation } = await import('../api/activityLogger');
    await logChecklistOperation(cardId, 'add', data?.id || '', title);
    
    await qc.invalidateQueries({ queryKey: ['card', cardId] });
  };

  const renameWorkflow = async (workflowId: string, newTitle: string) => {
    const supabase = getSupabase();
    const { error } = await supabase.from('checklists').update({ title: newTitle }).eq('id', workflowId);
    if (error) throw error;
    
    await qc.invalidateQueries({ queryKey: ['card', cardId] });
  };

  const reorderWorkflowTasks = async (workflowId: string, taskIds: string[]) => {
    const supabase = getSupabase();
    
    // Update positions for all tasks
    const updates = taskIds.map((taskId, index) => ({
      id: taskId,
      position: index + 1
    }));
    
    // Batch update all positions
    for (const update of updates) {
      const { error } = await supabase
        .from('checklist_items')
        .update({ position: update.position })
        .eq('id', update.id);
      
      if (error) {
        console.error('Error updating task position:', error);
        throw error;
      }
    }
    
    await qc.invalidateQueries({ queryKey: ['card', cardId] });
  };

  const deleteWorkflowHandler = async (workflowId: string) => {
    try {
      await deleteWorkflow(workflowId);
      
      // Log activity
      const { logChecklistOperation } = await import('../api/activityLogger');
      await logChecklistOperation(cardId, 'remove', workflowId, 'Workflow deleted');
      
      await qc.invalidateQueries({ queryKey: ['card', cardId] });
    } catch (error) {
      console.error('Error deleting workflow:', error);
    }
  };

  const deleteTaskHandler = async (taskId: string) => {
    try {
      await deleteTask(taskId);
      
      // Log activity
      const { logChecklistItemOperation } = await import('../api/activityLogger');
      await logChecklistItemOperation(cardId, 'remove', taskId, 'Task deleted', false);
      
      await qc.invalidateQueries({ queryKey: ['card', cardId] });
    } catch (error) {
      console.error('Error deleting task:', error);
    }
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

  // Restore card from Archive - show dialog to choose destination
  const handleRestoreCard = async (targetBoardId: ID, targetListId: ID) => {
    try {
      const supabase = getSupabase();
      
      // Move card to chosen board and list
      const { error } = await supabase
        .from('cards')
        .update({ board_id: targetBoardId, list_id: targetListId })
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
            
            {/* Card Actions */}
            <div className="mb-4">
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
                    onClick={() => setShowRestoreDialog(true)}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm bg-bg-subtle border border-border rounded hover:bg-bg-muted transition-colors"
                  >
                    <Icon name="plus" size={14} />
                    Restore
                  </button>
                )}
                {isOnArchiveBoard && (
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm bg-red-50 border border-red-200 text-red-700 rounded hover:bg-red-100 transition-colors"
                  >
                    <Icon name="trash" size={14} />
                    Delete
                  </button>
                )}
                <button 
                  onClick={() => addWorkflow()}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm bg-bg-subtle border border-border rounded hover:bg-bg-muted transition-colors"
                >
                  <Icon name="plus" size={14} />
                  Add Workflow
                </button>
                <button 
                  onClick={() => setShowMembers((v) => !v)}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm bg-bg-subtle border border-border rounded hover:bg-bg-muted transition-colors"
                >
                  <Icon name="plus" size={14} />
                  Members
                </button>
                <button 
                  onClick={() => openUploadRef.current?.()}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm bg-bg-subtle border border-border rounded hover:bg-bg-muted transition-colors"
                >
                  <Icon name="paperclip" size={14} />
                  Attachment
                </button>
              </div>
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

            {/* Location - temporarily disabled until location migration is run */}
            {/*
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
            */}

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
              <CustomFieldsManager workspaceId={card?.workspace_id as any} cardId={cardId} values={card?.card_field_values as any} />
            </div>

            {/* Attachments */}
            <div className="mt-4">
              <div className="text-sm text-fg-muted mb-1">Attachments</div>
              <AttachmentList
                attachments={card?.attachments ?? []}
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

            {/* Workflows */}
            <div className="mt-4">
              <div className="text-sm text-fg-muted mb-1">Workflows</div>
              <div className="space-y-3">
                {(card?.checklists ?? []).map(workflow => (
                  <WorkflowGroup 
                    key={workflow.id}
                    workflow={workflow}
                    workspaceId={card?.workspace_id}
                    tasks={(workflow.checklist_items ?? []).map(item => ({
                      ...item,
                      workflow_id: workflow.id
                    } as Task)).sort((a, b) => (a.position || 0) - (b.position || 0))}
                    onToggleTask={toggleWorkflowTask} 
                    onAddTask={addWorkflowTask} 
                    onRenameWorkflow={renameWorkflow}
                    onReorderTasks={reorderWorkflowTasks}
                    onDeleteTask={deleteTaskHandler}
                    onDeleteWorkflow={deleteWorkflowHandler}
                    onUpdateTask={updateWorkflowTask}
                  />
                ))}
                
                {/* Add Workflow Button */}
                <button
                  onClick={() => addWorkflow('Workflow')}
                  className="w-full p-2 text-sm text-muted hover:text-fg hover:bg-surface-2 rounded border-2 border-dashed border-app/20 hover:border-app/40 transition-colors"
                >
                  + Add Workflow
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

      {/* Restore Card Dialog */}
      <RestoreCardDialog
        isOpen={showRestoreDialog}
        onClose={() => setShowRestoreDialog(false)}
        onRestore={handleRestoreCard}
        workspaceId={card?.workspace_id}
        cardTitle={card?.title || ''}
      />
    </div>,
    document.body
  );
}
