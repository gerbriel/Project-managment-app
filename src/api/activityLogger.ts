import { getSupabase } from '../app/supabaseClient';
import type { ID } from '../types/models';

export type ActivityType = 
  | 'update.title'
  | 'update.description' 
  | 'update.dates'
  | 'update.location'
  | 'move.list'
  | 'move.board'
  | 'label.add'
  | 'label.remove'
  | 'attachment.add'
  | 'attachment.remove'
  | 'attachment.rename'
  | 'member.add'
  | 'member.remove'
  | 'checklist.add'
  | 'checklist.remove'
  | 'checklist.item.add'
  | 'checklist.item.remove'
  | 'checklist.item.toggle'
  | 'checklist.item.update'
  | 'card.archive'
  | 'card.restore'
  | 'card.delete';

export interface ActivityMeta {
  // Title updates
  title?: string;
  from?: string;
  to?: string;
  
  // Date updates
  fromStart?: string | null;
  toStart?: string | null;
  fromEnd?: string | null;
  toEnd?: string | null;
  
  // Location updates
  fromAddress?: string | null;
  toAddress?: string | null;
  fromLat?: number | null;
  toLat?: number | null;
  fromLng?: number | null;
  toLng?: number | null;
  
  // Move operations
  fromListId?: ID;
  toListId?: ID;
  fromBoardId?: ID;
  toBoardId?: ID;
  fromListName?: string;
  toListName?: string;
  fromBoardName?: string;
  toBoardName?: string;
  
  // Label operations
  labelId?: ID;
  labelName?: string;
  labelColor?: string;
  
  // Attachment operations
  attachmentId?: ID;
  name?: string;
  url?: string;
  size?: number;
  
  // Member operations
  memberId?: ID;
  memberName?: string;
  
  // Checklist operations
  checklistId?: ID;
  checklistTitle?: string;
  itemId?: ID;
  text?: string;
  done?: boolean;
  position?: number;
}

/**
 * Log an activity for a card. This function handles RLS issues gracefully.
 */
export async function logCardActivity(
  cardId: ID,
  type: ActivityType,
  meta?: ActivityMeta
): Promise<void> {
  try {
    const supabase = getSupabase();
    const user = await supabase.auth.getUser();
    
    await supabase.from('activity').insert({
      card_id: cardId,
      type,
      meta: meta || {},
      actor_id: user.data.user?.id
    });
  } catch (error) {
    // Silently ignore RLS and other errors to prevent breaking the main flow
    console.warn('Failed to log activity:', error);
  }
}

/**
 * Helper function to log title updates
 */
export async function logTitleUpdate(cardId: ID, oldTitle: string, newTitle: string): Promise<void> {
  if (oldTitle.trim() !== newTitle.trim()) {
    await logCardActivity(cardId, 'update.title', {
      from: oldTitle,
      to: newTitle
    });
  }
}

/**
 * Helper function to log description updates
 */
export async function logDescriptionUpdate(cardId: ID): Promise<void> {
  await logCardActivity(cardId, 'update.description');
}

/**
 * Helper function to log date updates
 */
export async function logDateUpdate(
  cardId: ID, 
  oldStart: string | null, 
  newStart: string | null,
  oldEnd: string | null,
  newEnd: string | null
): Promise<void> {
  if (oldStart !== newStart || oldEnd !== newEnd) {
    await logCardActivity(cardId, 'update.dates', {
      fromStart: oldStart,
      toStart: newStart,
      fromEnd: oldEnd,
      toEnd: newEnd
    });
  }
}

/**
 * Helper function to log location updates
 */
export async function logLocationUpdate(
  cardId: ID,
  oldAddress: string | null,
  newAddress: string | null,
  oldLat: number | null,
  newLat: number | null,
  oldLng: number | null,
  newLng: number | null
): Promise<void> {
  if (oldAddress !== newAddress || oldLat !== newLat || oldLng !== newLng) {
    await logCardActivity(cardId, 'update.location', {
      fromAddress: oldAddress,
      toAddress: newAddress,
      fromLat: oldLat,
      toLat: newLat,
      fromLng: oldLng,
      toLng: newLng
    });
  }
}

/**
 * Helper function to log card moves between lists
 */
export async function logCardMove(
  cardId: ID,
  fromListId: ID,
  toListId: ID,
  listNames?: Record<string, string>
): Promise<void> {
  await logCardActivity(cardId, 'move.list', {
    fromListId,
    toListId,
    fromListName: listNames?.[fromListId] || fromListId,
    toListName: listNames?.[toListId] || toListId
  });
}

/**
 * Helper function to log card moves between boards
 */
export async function logBoardMove(
  cardId: ID,
  fromBoardId: ID,
  toBoardId: ID,
  fromListId?: ID,
  toListId?: ID,
  boardNames?: Record<string, string>
): Promise<void> {
  await logCardActivity(cardId, 'move.board', {
    fromBoardId,
    toBoardId,
    fromListId,
    toListId,
    fromBoardName: boardNames?.[fromBoardId] || fromBoardId,
    toBoardName: boardNames?.[toBoardId] || toBoardId
  });
}

/**
 * Helper function to log label operations
 */
export async function logLabelOperation(
  cardId: ID,
  operation: 'add' | 'remove',
  labelId: ID,
  labelName?: string,
  labelColor?: string
): Promise<void> {
  await logCardActivity(cardId, operation === 'add' ? 'label.add' : 'label.remove', {
    labelId,
    labelName,
    labelColor
  });
}

/**
 * Helper function to log attachment operations
 */
export async function logAttachmentOperation(
  cardId: ID,
  operation: 'add' | 'remove' | 'rename',
  name: string,
  attachmentId?: ID,
  url?: string,
  size?: number,
  oldName?: string
): Promise<void> {
  const type = operation === 'add' ? 'attachment.add' : 
               operation === 'remove' ? 'attachment.remove' : 'attachment.rename';
  
  await logCardActivity(cardId, type, {
    attachmentId,
    name,
    url,
    size,
    from: oldName,
    to: operation === 'rename' ? name : undefined
  });
}

/**
 * Helper function to log member operations
 */
export async function logMemberOperation(
  cardId: ID,
  operation: 'add' | 'remove',
  memberId: ID,
  memberName?: string
): Promise<void> {
  await logCardActivity(cardId, operation === 'add' ? 'member.add' : 'member.remove', {
    memberId,
    memberName
  });
}

/**
 * Helper function to log checklist operations
 */
export async function logChecklistOperation(
  cardId: ID,
  operation: 'add' | 'remove',
  checklistId: ID,
  title: string
): Promise<void> {
  await logCardActivity(cardId, operation === 'add' ? 'checklist.add' : 'checklist.remove', {
    checklistId,
    checklistTitle: title
  });
}

/**
 * Helper function to log checklist item operations
 */
export async function logChecklistItemOperation(
  cardId: ID,
  operation: 'add' | 'remove' | 'toggle' | 'update',
  itemId: ID,
  text: string,
  done?: boolean,
  checklistId?: ID
): Promise<void> {
  const type = operation === 'add' ? 'checklist.item.add' :
               operation === 'remove' ? 'checklist.item.remove' :
               operation === 'toggle' ? 'checklist.item.toggle' : 'checklist.item.update';
  
  await logCardActivity(cardId, type, {
    itemId,
    text,
    done,
    checklistId
  });
}

/**
 * Helper function to log card archival/restoration/deletion
 */
export async function logCardStateChange(
  cardId: ID,
  operation: 'archive' | 'restore' | 'delete'
): Promise<void> {
  const type = operation === 'archive' ? 'card.archive' :
               operation === 'restore' ? 'card.restore' : 'card.delete';
  
  await logCardActivity(cardId, type);
}