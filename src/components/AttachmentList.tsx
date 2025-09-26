import React from 'react';
import { uploadAttachment, removeAttachmentObject, renameAttachment } from '@api/attachments';

type Attachment = { id: string; name?: string; url?: string; mime?: string; size?: number; created_at?: string };

type Props = {
  attachments: Attachment[];
  onAddUrl: (name: string, url: string) => Promise<void> | void;
  onRemove: (id: string) => Promise<void> | void;
  workspaceId?: string;
  cardId?: string;
  onUploaded?: () => Promise<void> | void;
  registerOpenPicker?: (fn: () => void) => void;
};

export default function AttachmentList({ attachments, onAddUrl, onRemove, workspaceId, cardId, onUploaded, registerOpenPicker }: Props) {
  const [name, setName] = React.useState('');
  const [url, setUrl] = React.useState('');
  const [pending, setPending] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);

  const add = async () => {
    if (!name.trim() || !url.trim()) return;
    setPending(true);
    try {
      await onAddUrl(name.trim(), url.trim());
      setName('');
      setUrl('');
    } finally {
      setPending(false);
    }
  };

  React.useEffect(() => {
    if (!registerOpenPicker) return;
    registerOpenPicker(() => fileRef.current?.click());
  }, [registerOpenPicker]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <input ref={fileRef} type="file" className="hidden" onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file || !workspaceId || !cardId) return;
          setPending(true);
          try {
            await uploadAttachment(workspaceId, cardId, file);
            await onUploaded?.();
          } finally {
            setPending(false);
            e.currentTarget.value = '';
          }
        }} />
        <button
          className="px-3 py-1 rounded border border-app text-sm disabled:opacity-50"
          disabled={pending || !workspaceId || !cardId}
          onClick={() => fileRef.current?.click()}
        >
          Upload file
        </button>
      </div>
      <div className="flex gap-2">
        <input
          className="flex-1 rounded border border-app bg-surface-2 px-2 py-1"
          placeholder="File name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          className="flex-1 rounded border border-app bg-surface-2 px-2 py-1"
          placeholder="https://…"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        <button className="px-3 py-1 rounded bg-accent text-white disabled:opacity-50" onClick={add} disabled={pending}>
          Add URL
        </button>
      </div>
      <ul className="divide-y divide-app rounded border border-app overflow-hidden">
        {attachments.length === 0 ? (
          <li className="p-2 text-sm text-muted">No attachments</li>
        ) : (
          attachments.map((a) => (
            <li key={a.id} className="p-2 flex items-center gap-3">
              <span>{a.mime?.includes('pdf') ? '📄' : a.mime?.startsWith('image/') ? '🖼️' : '📎'}</span>
              <a href={a.url} target="_blank" rel="noreferrer" className="flex-1 hover:underline">
                {a.name || a.url}
              </a>
              <button
                className="text-muted hover:text-app"
                title="Rename"
                onClick={async () => {
                  const newName = window.prompt('New name', a.name || '')?.trim();
                  if (!newName || newName === a.name) return;
                  setPending(true);
                  try {
                    await renameAttachment(a.id, newName);
                    await onUploaded?.();
                  } finally {
                    setPending(false);
                  }
                }}
              >
                ✏️
              </button>
              <button
                className="text-muted hover:text-app"
                title="Copy link"
                onClick={async () => {
                  if (!a.url) return;
                  try {
                    await navigator.clipboard.writeText(a.url);
                  } catch {}
                }}
              >
                🔗
              </button>
              <button className="text-muted hover:text-red-500" onClick={async () => {
                if (a.url) await removeAttachmentObject(a.url);
                await onRemove(a.id);
              }} title="Delete">
                🗑️
              </button>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
