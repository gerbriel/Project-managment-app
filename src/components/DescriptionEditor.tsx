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
    extensions: [
      StarterKit.configure({
        // Enhanced list configuration
        bulletList: {
          HTMLAttributes: {
            class: 'my-2',
          },
        },
        orderedList: {
          HTMLAttributes: {
            class: 'my-2',
          },
        },
        listItem: {
          HTMLAttributes: {
            class: 'ml-4 my-1',
          },
        },
        blockquote: {
          HTMLAttributes: {
            class: 'border-l-4 border-accent pl-4 py-2 my-2 italic bg-surface/50',
          },
        },
        code: {
          HTMLAttributes: {
            class: 'bg-surface px-1.5 py-0.5 rounded text-accent font-mono text-sm',
          },
        },
        codeBlock: {
          HTMLAttributes: {
            class: 'bg-surface p-3 rounded font-mono text-sm border border-app my-2',
          },
        },
      }),
    ],
    content: value ?? { type: 'doc', content: [{ type: 'paragraph' }] },
    onUpdate: ({ editor }) => {
      hasChangedRef.current = true;
      const json = editor.getJSON();
      // Debounce save
      debouncedSave(json);
    },
    editorProps: {
      attributes: {
        class: 'max-w-none min-h-[120px] p-3 rounded-b border-l border-r border-b border-app bg-surface-2 focus:outline-none focus:ring-2 focus:ring-accent/50',
      },
      handleKeyDown: (view, event) => {
        // Custom keyboard shortcuts
        if (event.metaKey || event.ctrlKey) {
          switch (event.key) {
            case 'k':
              event.preventDefault();
              addLink();
              return true;
            case '\\':
              event.preventDefault();
              clearFormatting();
              return true;
            case 's':
              if (event.shiftKey) {
                event.preventDefault();
                editor?.chain().focus().toggleStrike().run();
                return true;
              }
              break;
          }
        }
        return false;
      },
    },
  });

  // Simple debounce
  const saveRef = React.useRef<number | null>(null);
  const debouncedSave = (doc: any) => {
    if (saveRef.current) window.clearTimeout(saveRef.current);
    saveRef.current = window.setTimeout(() => mu.mutate(doc), 500);
  };

  // Helper functions for toolbar actions
  const addLink = () => {
    const url = window.prompt('Enter URL');
    if (url && editor) {
      // Insert link as HTML since Link extension isn't available
      const text = window.prompt('Enter link text') || url;
      editor.chain().focus().insertContent(`<a href="${url}" class="text-accent underline">${text}</a>`).run();
    }
  };

  const addImage = () => {
    const url = window.prompt('Enter image URL');
    if (url && editor) {
      // Since we can't install Image extension, we'll insert it as HTML
      editor.chain().focus().insertContent(`<img src="${url}" alt="Image" class="max-w-full h-auto rounded" />`).run();
    }
  };

  const addMention = () => {
    const username = window.prompt('Enter username to mention (without @)');
    if (username && editor) {
      editor.chain().focus().insertContent(`<span class="text-accent font-semibold">@${username}</span>`).run();
    }
  };

  const clearFormatting = () => {
    editor?.chain().focus().unsetAllMarks().clearNodes().run();
  };

  return (
    <div className="space-y-2">
      {/* Enhanced Toolbar */}
      <div className="flex flex-wrap items-center gap-1 p-2 bg-surface border border-app rounded-t">
        {/* Text Formatting */}
        <div className="flex items-center gap-1 border-r border-app pr-2 mr-2">
          <button
            className={`px-2 py-1 rounded text-sm hover:bg-surface-2 ${
              editor?.isActive('bold') ? 'bg-accent text-black' : ''
            }`}
            onClick={() => editor?.chain().focus().toggleBold().run()}
            title="Bold (⌘B)"
          >
            <strong>B</strong>
          </button>
          <button
            className={`px-2 py-1 rounded text-sm italic hover:bg-surface-2 ${
              editor?.isActive('italic') ? 'bg-accent text-black' : ''
            }`}
            onClick={() => editor?.chain().focus().toggleItalic().run()}
            title="Italic (⌘I)"
          >
            I
          </button>
          <button
            className={`px-2 py-1 rounded text-sm hover:bg-surface-2 ${
              editor?.isActive('strike') ? 'bg-accent text-black' : ''
            }`}
            onClick={() => editor?.chain().focus().toggleStrike().run()}
            title="Strikethrough (⌘S)"
          >
            <span className="line-through">S</span>
          </button>
          <button
            className={`px-2 py-1 rounded text-sm font-mono hover:bg-surface-2 ${
              editor?.isActive('code') ? 'bg-accent text-black' : ''
            }`}
            onClick={() => editor?.chain().focus().toggleCode().run()}
            title="Code (⌘M)"
          >
            &lt;/&gt;
          </button>
        </div>

        {/* Lists */}
        <div className="flex items-center gap-1 border-r border-app pr-2 mr-2">
          <button
            className={`px-2 py-1 rounded text-sm hover:bg-surface-2 ${
              editor?.isActive('bulletList') ? 'bg-accent text-black' : ''
            }`}
            onClick={() => editor?.chain().focus().toggleBulletList().run()}
            title="Bullet List (⌘⇧8)"
          >
            •
          </button>
          <button
            className={`px-2 py-1 rounded text-sm hover:bg-surface-2 ${
              editor?.isActive('orderedList') ? 'bg-accent text-black' : ''
            }`}
            onClick={() => editor?.chain().focus().toggleOrderedList().run()}
            title="Numbered List (⌘⇧7)"
          >
            1.
          </button>
        </div>

        {/* Block Elements */}
        <div className="flex items-center gap-1 border-r border-app pr-2 mr-2">
          <button
            className={`px-2 py-1 rounded text-sm hover:bg-surface-2 ${
              editor?.isActive('blockquote') ? 'bg-accent text-black' : ''
            }`}
            onClick={() => editor?.chain().focus().toggleBlockquote().run()}
            title="Quote"
          >
            "
          </button>
          <button
            className={`px-2 py-1 rounded text-sm hover:bg-surface-2 ${
              editor?.isActive('codeBlock') ? 'bg-accent text-black' : ''
            }`}
            onClick={() => editor?.chain().focus().toggleCodeBlock().run()}
            title="Code Block"
          >
            { }
          </button>
        </div>

        {/* Links & Media */}
        <div className="flex items-center gap-1 border-r border-app pr-2 mr-2">
          <button
            className="px-2 py-1 rounded text-sm hover:bg-surface-2"
            onClick={addLink}
            title="Link (⌘K)"
          >
            🔗
          </button>
          <button
            className="px-2 py-1 rounded text-sm hover:bg-surface-2"
            onClick={addImage}
            title="Image"
          >
            📷
          </button>
          <button
            className="px-2 py-1 rounded text-sm hover:bg-surface-2"
            onClick={addMention}
            title="Mention (@)"
          >
            @
          </button>
        </div>

        {/* Clear Formatting */}
        <div className="flex items-center gap-1">
          <button
            className="px-2 py-1 rounded text-sm hover:bg-surface-2"
            onClick={clearFormatting}
            title="Clear formatting (⌘\)"
          >
            Clear formatting
          </button>
        </div>
      </div>

      {/* Editor Content */}
      <EditorContent editor={editor} />
      
      {/* Status */}
      {mu.isPending && (
        <div className="text-xs text-muted mt-1 px-2">Saving…</div>
      )}
    </div>
  );
}
