import React from 'react';

type Comment = { id: string; author_id?: string; body?: string; created_at?: string };
type Activity = { id: string; type: string; meta?: any; actor_id?: string; created_at?: string };

type Props = {
  comments: Comment[];
  activity: Activity[];
  listNames?: Record<string, string>;
};

type FeedItem =
  | { kind: 'comment'; id: string; who: string; when: string; body: string }
  | { kind: 'activity'; id: string; who: string; when: string; type: string; meta: any };

function formatActivity(type: string, meta: any, opts?: { listNames?: Record<string, string> }): string {
  const m = meta ?? {};
  const nameFor = (id?: string) => (id && opts?.listNames && opts.listNames[id]) ? opts.listNames[id] : (id ?? '—');
  switch (type) {
    case 'update.title':
      return `changed title from "${m.from ?? ''}" to "${m.to ?? ''}"`;
    case 'update.dates': {
      const bits: string[] = [];
      if (m.fromStart !== m.toStart) bits.push(`start: ${m.fromStart ?? '—'} → ${m.toStart ?? '—'}`);
      if (m.fromEnd !== m.toEnd) bits.push(`end: ${m.fromEnd ?? '—'} → ${m.toEnd ?? '—'}`);
      return `updated dates${bits.length ? ` (${bits.join(', ')})` : ''}`;
    }
    case 'update.description':
      return 'updated the description';
    case 'update.location': {
      const addrChanged = m.fromAddress !== m.toAddress;
      const latLngChanged = m.fromLat !== m.toLat || m.fromLng !== m.toLng;
      if (addrChanged) {
        return `updated location: ${m.fromAddress ?? '—'} → ${m.toAddress ?? '—'}`;
      }
      if (latLngChanged) {
        return `updated location: (${m.fromLat ?? '—'}, ${m.fromLng ?? '—'}) → (${m.toLat ?? '—'}, ${m.toLng ?? '—'})`;
      }
      return 'updated location';
    }
    case 'move.list':
      return `moved card from list ${nameFor(m.fromListId)} to ${nameFor(m.toListId)}`;
    case 'label.add':
      return `added label ${m.labelId ?? ''}`;
    case 'label.remove':
      return `removed label ${m.labelId ?? ''}`;
    case 'attachment.add':
      return `added attachment "${m.name ?? ''}"`;
    case 'attachment.remove':
      return `removed attachment "${m.name ?? ''}"`;
    case 'attachment.rename':
      return `renamed attachment from "${m.from ?? ''}" to "${m.to ?? ''}"`;
    case 'checklist.add':
      return `added checklist "${m.title ?? ''}"`;
    case 'checklist.item.add':
      return `added checklist item "${m.text ?? ''}"`;
    case 'checklist.item.toggle':
      return `marked checklist item ${m.done ? 'done' : 'not done'}`;
    case 'checklist.item.remove':
      return `removed checklist item "${m.text ?? ''}"`;
    default:
      return `activity: ${type} ${Object.keys(m).length ? `- ${JSON.stringify(m)}` : ''}`;
  }
}

export default function ActivityFeed({ comments, activity, listNames }: Props) {
  const items: FeedItem[] = [
    ...comments.map((c) => ({
      kind: 'comment' as const,
      id: `c-${c.id}`,
      who: c.author_id || 'unknown',
      when: c.created_at || '',
      body: c.body || '',
    })),
    ...activity.map((a) => ({
      kind: 'activity' as const,
      id: `a-${a.id}`,
      who: a.actor_id || 'system',
      when: a.created_at || '',
      type: a.type,
      meta: a.meta ?? {},
    })),
  ].sort((x, y) => (x.when < y.when ? 1 : -1));

  return (
    <div className="space-y-2 text-sm">
      {items.length === 0 ? (
        <div className="text-muted">No comments or activity yet</div>
      ) : (
        items.map((it) => (
          <div key={it.id} className="rounded border border-app p-2">
            <div className="text-xs text-muted mb-1">{it.who} • {it.when ? new Date(it.when).toLocaleString() : ''}</div>
            <div className="whitespace-pre-wrap break-words">
              {it.kind === 'comment' ? it.body : formatActivity(it.type, it.meta, { listNames })}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
