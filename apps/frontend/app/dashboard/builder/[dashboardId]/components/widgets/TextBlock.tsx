"use client";

import { useCallback } from "react";
import { useEditor, EditorContent, BubbleMenu } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import { GripVertical } from "lucide-react";
import { Widget } from "@/types/enhanced-dashboard-types";

interface TextBlockProps {
  widget: Widget;
  onUpdate: (widgetId: string, updates: Partial<Widget>) => void;
  isEditing: boolean;
  onEditToggle: () => void;
}

export function TextBlock({ widget, onUpdate, isEditing, onEditToggle }: TextBlockProps) {
  const handleContentChange = useCallback(
    (html: string) => {
      onUpdate(widget.id, {
        config: {
          ...widget.config,
          content: html,
        },
      });
    },
    [widget.id, widget.config, onUpdate]
  );

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        bulletList: {
          keepMarks: true,
          keepAttributes: false,
        },
        orderedList: {
          keepMarks: true,
          keepAttributes: false,
        },
      }),
      Underline,
      Placeholder.configure({
        placeholder: "Start writing or press Cmd+B, Cmd+I for formatting...",
        emptyEditorClass: "is-editor-empty",
      }),
    ],
    content: widget.config.content || "",
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      handleContentChange(html);
    },
    editorProps: {
      attributes: {
        class: `prose prose-lg dark:prose-invert max-w-full bg-transparent focus:outline-none`,
      },
    },
  });

  if (!editor) {
    return (
      <div className="h-fit w-full bg-transparent flex items-center justify-center">
        <div className="text-gray-500 dark:text-gray-400 text-center">
          <div className="text-2xl mb-2">📝</div>
          <p className="text-sm">Loading editor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-fit bg-transparent relative group">
      {/* Drag Handle */}
      <div className="drag-handle absolute left-[-40px] top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-grab active:cursor-grabbing z-[9999] bg-gray-100 dark:bg-gray-800 rounded p-2 border border-gray-200 dark:border-gray-700 shadow-sm">
        <GripVertical className="w-3 h-3 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200" />
      </div>
        <BubbleMenu
          editor={editor}
          tippyOptions={{ 
            duration: 100,
            zIndex: 9999,
            placement: 'top',
            interactive: true,
            appendTo: () => document.body
          }}
          className="flex w-fit max-w-[90vw] overflow-hidden rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-xl z-[9999]"
        >
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`p-2 transition-all hover:bg-gray-100 dark:hover:bg-gray-700 ${
            editor.isActive("bold")
              ? "bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400"
              : "text-gray-700 dark:text-gray-300"
          }`}
        >
          <span className="font-bold">B</span>
        </button>
        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`p-2 transition-all hover:bg-gray-100 dark:hover:bg-gray-700 ${
            editor.isActive("italic")
              ? "bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400"
              : "text-gray-700 dark:text-gray-300"
          }`}
        >
          <span className="italic">I</span>
        </button>
        <button
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={`p-2 transition-all hover:bg-gray-100 dark:hover:bg-gray-700 ${
            editor.isActive("underline")
              ? "bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400"
              : "text-gray-700 dark:text-gray-300"
          }`}
        >
          <span className="underline">U</span>
        </button>
        <div className="w-px bg-gray-200 dark:bg-gray-700 my-1" />
        <button
          onClick={() => editor.chain().focus().setParagraph().run()}
          className={`p-2 transition-all hover:bg-gray-100 dark:hover:bg-gray-700 ${
            editor.isActive("paragraph")
              ? "bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400"
              : "text-gray-700 dark:text-gray-300"
          }`}
        >
          <span className="text-sm">¶</span>
        </button>
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={`p-2 transition-all hover:bg-gray-100 dark:hover:bg-gray-700 ${
            editor.isActive("heading", { level: 1 })
              ? "bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400"
              : "text-gray-700 dark:text-gray-300"
          }`}
        >
          <span className="font-bold text-lg">H1</span>
        </button>
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={`p-2 transition-all hover:bg-gray-100 dark:hover:bg-gray-700 ${
            editor.isActive("heading", { level: 2 })
              ? "bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400"
              : "text-gray-700 dark:text-gray-300"
          }`}
        >
          <span className="font-bold">H2</span>
        </button>
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={`p-2 transition-all hover:bg-gray-100 dark:hover:bg-gray-700 ${
            editor.isActive("heading", { level: 3 })
              ? "bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400"
              : "text-gray-700 dark:text-gray-300"
          }`}
        >
          <span className="font-bold text-sm">H3</span>
        </button>
        <div className="w-px bg-gray-200 dark:bg-gray-700 my-1" />
        <button
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`p-2 transition-all hover:bg-gray-100 dark:hover:bg-gray-700 ${
            editor.isActive("bulletList")
              ? "bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400"
              : "text-gray-700 dark:text-gray-300"
          }`}
        >
          <span>•</span>
        </button>
        <button
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`p-2 transition-all hover:bg-gray-100 dark:hover:bg-gray-700 ${
            editor.isActive("orderedList")
              ? "bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400"
              : "text-gray-700 dark:text-gray-300"
          }`}
        >
          <span>1.</span>
        </button>
        </BubbleMenu>

        <EditorContent 
          editor={editor} 
          className="w-full h-fit bg-transparent border-none outline-none focus:outline-none"
        />
        
        {/* TipTap Editor Styles */}
        <style jsx global>{`
          .ProseMirror {
            outline: none !important;
            border: none !important;
            background: transparent !important;
            min-height: 0 !important;
          }
          
          .ProseMirror h1 {
            font-size: 2rem;
            font-weight: bold;
            margin: 1rem 0 0.5rem 0;
            line-height: 1.2;
          }
          
          .ProseMirror h2 {
            font-size: 1.5rem;
            font-weight: bold;
            margin: 0.75rem 0 0.5rem 0;
            line-height: 1.3;
          }
          
          .ProseMirror h3 {
            font-size: 1.25rem;
            font-weight: bold;
            margin: 0.5rem 0 0.25rem 0;
            line-height: 1.4;
          }
          
          .ProseMirror p {
            margin: 0.25rem 0;
            line-height: 1.6;
          }
          
          .ProseMirror p:first-child {
            margin-top: 0;
          }
          
          .ProseMirror p:last-child {
            margin-bottom: 0;
          }
          
          .ProseMirror p:empty {
            margin: 0;
            height: 0;
          }
          
          .ProseMirror ul, .ProseMirror ol {
            margin: 0.5rem 0;
            padding-left: 1.5rem;
          }
          
          .ProseMirror li {
            margin: 0.25rem 0;
          }
          
          .ProseMirror p.is-editor-empty:first-child::before {
            content: attr(data-placeholder);
            float: left;
            color: #9ca3af;
            pointer-events: none;
            height: 0;
          }
          
          .tippy-box {
            z-index: 9999 !important;
          }
        `}</style>
    </div>
  );
}