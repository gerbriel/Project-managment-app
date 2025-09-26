import React from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { getSupabase } from '../app/supabaseClient';
import type { ID } from '../types/models';
import { logDescriptionUpdate } from '../api/activityLogger';

type Props = {
  cardId: ID;
  value?: any | null; // stored as JSON in cards.description
};

export default function DescriptionEditor({ cardId, value }: Props) {
  const qc = useQueryClient();
  const hasChangedRef = React.useRef(false);
  
  const mu = useMutation({
    mutationFn: async (doc: any) => {
      const sb = getSupabase();
      const { error } = await sb.from('cards').update({ description: doc }).eq('id', cardId);
      if (error) throw error;
      
      // Log activity only if content actually changed
      if (hasChangedRef.current) {
        await logDescriptionUpdate(cardId);
        hasChangedRef.current = false;
      }
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ predicate: (q) => Array.isArray(q.queryKey) && q.queryKey.includes('card') });
    },
  });

  const editor = useEditor({
    extensions: [StarterKit],
    content: value ?? { type: 'doc', content: [{ type: 'paragraph' }] },
    onUpdate: ({ editor }) => {
      hasChangedRef.current = true;
      const json = editor.getJSON();
      // Debounce save
      debouncedSave(json);
    },
    editorProps: {
      attributes: {
        class: 'prose prose-invert max-w-none min-h-[120px] p-2 rounded border border-app bg-surface-2',
      },
    },
  });

  // Simple debounce
  const saveRef = React.useRef<number | null>(null);
  const debouncedSave = (doc: any) => {
    if (saveRef.current) window.clearTimeout(saveRef.current);
    saveRef.current = window.setTimeout(() => mu.mutate(doc), 500);
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-2 text-sm">
        <button
          className="px-2 py-1 rounded border border-app"
          onClick={() => editor?.chain().focus().toggleBold().run()}
        >
          Bold
        </button>
        <button
          className="px-2 py-1 rounded border border-app"
          onClick={() => editor?.chain().focus().toggleItalic().run()}
        >
          Italic
        </button>
        <button
          className="px-2 py-1 rounded border border-app"
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
        >
          • List
        </button>
      </div>
      <EditorContent editor={editor} />
      {mu.isPending && <div className="text-xs text-muted mt-1">Saving…</div>}
    </div>
  );
}
