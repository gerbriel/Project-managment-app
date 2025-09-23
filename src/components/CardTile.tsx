import React from 'react';
import Icon from './Icon';
import { useQueryClient } from '@tanstack/react-query';
import type { CardRow } from '../types/dto';

type Props = {
  title: string;
  overdue?: boolean;
  card?: CardRow;
  onQuickEdit?: () => void;
  // Inline title editing support
  editingTitle?: boolean;
  titleInputValue?: string;
  onTitleInputChange?: (v: string) => void;
  onTitleCommit?: () => void;
  onTitleCancel?: () => void;
};

export default function CardTile({
  title,
  overdue,
  card,
  onQuickEdit,
  editingTitle,
  titleInputValue,
  onTitleInputChange,
  onTitleCommit,
  onTitleCancel,
}: Props) {
  const qc = useQueryClient();
  // Extract phone/email previews from custom fields if present
  let phone: string | undefined;
  let email: string | undefined;
  if (card?.card_field_values && Array.isArray(card.card_field_values)) {
    for (const v of card.card_field_values) {
      const def = Array.isArray(v.custom_field_defs) ? v.custom_field_defs[0] : v.custom_field_defs;
      const name = def?.name?.toLowerCase?.();
      if (!name) continue;
      try {
        const parsed = typeof v.value === 'string' ? JSON.parse(v.value) : v.value;
        const val = parsed?.value;
        if (!val) continue;
        if (!phone && name.includes('phone')) phone = String(val);
        if (!email && name.includes('email')) email = String(val);
      } catch {}
    }
  }

  // Label swatches
    const labels: Array<{ id: string; name: string; color: string }> = [];
    if (card?.card_labels) {
      for (const cl of card.card_labels) {
        const l = Array.isArray(cl.labels) ? cl.labels[0] : cl.labels;
        if (l) labels.push({ id: l.id as string, name: String(l.name ?? ''), color: String(l.color ?? '#666') });
      }
    }

    // Counts
    const commentsCount = card?.comments?.length ?? 0;
    const attachmentsCount = card?.attachments?.length ?? 0;
    let done = 0;
    let total = 0;
    if (card?.checklists) {
      for (const ch of card.checklists) {
        const items = ch.checklist_items ?? [];
        total += items.length;
        done += items.filter((i) => i.done).length;
      }
    }

    // Dates
    const start = card?.date_start ? new Date(card.date_start) : null;
    const end = card?.date_end ? new Date(card.date_end) : null;
    const fmt = (d: Date) => d.toLocaleDateString();

    // Tile header color: first label color, else primary; if overdue, red
    const headerColor = overdue
      ? 'rgba(239,68,68,0.7)'
      : (labels[0]?.color ?? 'var(--color-primary, #727cf5)');

    return (
      <div className="rounded-2xl border border-border bg-bg-card text-fg min-h-[250px] overflow-hidden transition-transform duration-150 will-change-transform hover:scale-[1.02] shadow-card">
        {/* Header bar */}
        <div className="h-1 w-full" style={{ backgroundColor: headerColor }} />

        <div className="p-2">
          {/* Title + quick edit */}
          <div className="flex items-start gap-2">
            <div className="flex-1 font-medium leading-snug">
              {editingTitle ? (
                <input
                  autoFocus
                  className="w-full bg-transparent border-0 rounded px-1 py-0.5 outline-none focus:outline-none focus:ring-0"
                  value={titleInputValue ?? title}
                  onChange={(e) => onTitleInputChange?.(e.target.value)}
                  onBlur={() => onTitleCommit?.()}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') onTitleCommit?.();
                    if (e.key === 'Escape') onTitleCancel?.();
                  }}
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <span>{title}</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="text-fg-subtle hover:text-fg focus:outline-none focus:ring-0"
                title="Quick edit"
                onClick={(e) => {
                  e.stopPropagation();
                  onQuickEdit?.();
                }}
              >
                <Icon name="edit" size={16} />
              </button>
              {card && (
                <>
                  <button
                    type="button"
                    className="text-fg-subtle hover:text-fg focus:outline-none focus:ring-0"
                    title="Archive"
                    onClick={async (e) => {
                      e.stopPropagation();
                      const { archiveCard } = await import('@api/cards');
                        await archiveCard(card.id);
                        await qc.invalidateQueries({ queryKey: ['cards', card.board_id] });
                        await qc.invalidateQueries({ queryKey: ['card', card.id] });
                        await qc.invalidateQueries({ queryKey: ['board-locs', card.board_id] });
                    }}
                  >
                    <Icon name="archive" size={16} />
                  </button>
                  <button
                    type="button"
                    className="text-fg-subtle hover:text-danger focus:outline-none focus:ring-0"
                    title="Delete"
                    onClick={async (e) => {
                      e.stopPropagation();
                      if (!confirm('Delete this card?')) return;
                      const { deleteCard } = await import('@api/cards');
                      await deleteCard(card.id);
                      await qc.invalidateQueries({ queryKey: ['cards', card.board_id] });
                      await qc.invalidateQueries({ queryKey: ['card', card.id] });
                      await qc.invalidateQueries({ queryKey: ['board-locs', card.board_id] });
                    }}
                  >
                    <Icon name="trash" size={16} />
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Labels */}
          {labels.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {labels.map((l) => (
                <span
                  key={l.id}
                  className="inline-block h-3 rounded-sm px-1 text-[10px] font-medium text-white"
                  style={{ backgroundColor: l.color }}
                  title={l.name}
                >
                  {l.name?.length <= 8 ? l.name : ''}
                </span>
              ))}
            </div>
          )}

          {/* Dates */}
          {(start || end) && (
            <div className="mt-2 text-xs text-fg-muted flex items-center gap-2">
              {start && (
                <span className="flex items-center gap-1"><Icon name="calendar" size={14} /> {fmt(start)}</span>
              )}
              {end && (
                <span className="flex items-center gap-1"><Icon name="arrow-right" size={14} /> {fmt(end)}</span>
              )}
              {overdue && (
                <span className="ml-auto px-1.5 py-0.5 rounded bg-danger/15 text-danger">
                  Overdue
                </span>
              )}
            </div>
          )}

          {/* Custom fields preview */}
          {(phone || email) && (
            <div className="mt-3 text-xs text-fg-muted space-y-1">
              {phone && <div className="flex items-center gap-1"><Icon name="phone" size={14} /> {phone}</div>}
              {email && <div className="flex items-center gap-1"><Icon name="mail" size={14} /> {email}</div>}
            </div>
          )}

          {/* Counters */}
          {(total > 0 || commentsCount > 0 || attachmentsCount > 0) && (
            <div className="mt-3 text-xs text-fg-muted flex items-center gap-3">
              {total > 0 && (
                <span title="Checklist progress" className="flex items-center gap-1">☑️ {done}/{total}</span>
              )}
              {commentsCount > 0 && (
                <span title="Comments" className="flex items-center gap-1">
                  <Icon name="comment" size={14} /> {commentsCount}
                </span>
              )}
              {attachmentsCount > 0 && (
                <span title="Attachments" className="flex items-center gap-1">
                  <Icon name="paperclip" size={14} /> {attachmentsCount}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    );
}
