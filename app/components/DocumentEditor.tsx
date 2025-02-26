"use client"

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Heading from '@tiptap/extension-heading'
import BulletList from '@tiptap/extension-bullet-list'
import OrderedList from '@tiptap/extension-ordered-list'
import ListItem from '@tiptap/extension-list-item'
import { Bold, Italic, List, ListOrdered, Type } from 'lucide-react'
import { cn } from '../lib/utils'
import { useEffect, useState } from 'react'
import { md } from '../lib/markdown-utils'
import Placeholder from '@tiptap/extension-placeholder'

interface DocumentEditorProps {
  content: string; // Markdown content
  onChange?: (html: string) => void;
  editable?: boolean;
}

export function DocumentEditor({ content, onChange, editable = true }: DocumentEditorProps) {
  const [isMounted, setIsMounted] = useState(false)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        bulletList: {
          keepMarks: true,
          keepAttributes: false
        },
        orderedList: {
          keepMarks: true,
          keepAttributes: false
        }
      }),
      Placeholder.configure({
        placeholder: 'Write something...',
      }),
      ListItem,
    ],
    content: md.render(content),
    editable,
    onUpdate: ({ editor }) => {
      if (onChange) {
        // Convertir el contenido HTML a Markdown
        const html = editor.getHTML();
        // TODO: Implementar la conversión de HTML a Markdown
        onChange(html);
      }
    }
  });

  // Actualizar el contenido cuando cambie externamente
  useEffect(() => {
    if (editor && content) {
      const html = md.render(content);
      if (editor.getHTML() !== html) {
        editor.commands.setContent(html);
      }
    }
  }, [editor, content]);

  useEffect(() => {
    setIsMounted(true)
  }, [])

  if (!isMounted) {
    return <div className="border rounded-lg p-4 min-h-[300px]">Loading editor...</div>
  }

  if (!editor) {
    return null;
  }

  return (
    <div className="border rounded-lg">
      {editable && (
        <div className="border-b p-2 flex gap-2">
          <button
            onClick={() => editor.chain().focus().toggleBold().run()}
            disabled={!editor.can().chain().focus().toggleBold().run()}
            className={cn(
              "p-2 rounded hover:bg-secondary",
              editor.isActive('bold') && "bg-secondary"
            )}
            title="Bold"
            aria-label="Toggle bold"
          >
            <Bold className="h-4 w-4" />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleItalic().run()}
            disabled={!editor.can().chain().focus().toggleItalic().run()}
            className={cn(
              "p-2 rounded hover:bg-secondary",
              editor.isActive('italic') && "bg-secondary"
            )}
            title="Italic"
            aria-label="Toggle italic"
          >
            <Italic className="h-4 w-4" />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            disabled={!editor.can().chain().focus().toggleBulletList().run()}
            className={cn(
              "p-2 rounded hover:bg-secondary",
              editor.isActive('bulletList') && "bg-secondary"
            )}
            title="Bullet List"
            aria-label="Toggle bullet list"
          >
            <List className="h-4 w-4" />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            disabled={!editor.can().chain().focus().toggleOrderedList().run()}
            className={cn(
              "p-2 rounded hover:bg-secondary",
              editor.isActive('orderedList') && "bg-secondary"
            )}
            title="Numbered List"
            aria-label="Toggle numbered list"
          >
            <ListOrdered className="h-4 w-4" />
          </button>
          <select
            onChange={(e) => {
              if (e.target.value === 'paragraph') {
                editor.chain().focus().setParagraph().run();
              } else {
                editor.chain().focus().toggleHeading({ level: parseInt(e.target.value) as 1 | 2 | 3 | 4 }).run();
              }
            }}
            value={
              editor.isActive('heading', { level: 1 })
                ? '1'
                : editor.isActive('heading', { level: 2 })
                ? '2'
                : editor.isActive('heading', { level: 3 })
                ? '3'
                : 'paragraph'
            }
            className="p-2 rounded hover:bg-secondary border"
            aria-label="Text style"
          >
            <option value="paragraph">Normal</option>
            <option value="1">Heading 1</option>
            <option value="2">Heading 2</option>
            <option value="3">Heading 3</option>
          </select>
        </div>
      )}
      <EditorContent 
        editor={editor} 
        className="prose prose-sm max-w-none p-4 min-h-[300px] focus:outline-none"
      />
    </div>
  );
}