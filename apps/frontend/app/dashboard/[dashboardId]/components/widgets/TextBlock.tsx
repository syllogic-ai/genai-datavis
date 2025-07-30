"use client";

import { useCallback, useEffect, useRef } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import Typography from "@tiptap/extension-typography";
import Link from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import FontFamily from "@tiptap/extension-font-family";
import { TextStyle } from "@tiptap/extension-text-style";
import { Widget } from "@/types/enhanced-dashboard-types";
import { useTextEditor } from "../TextEditorContext";

interface TextBlockProps {
  widget: Widget;
  onUpdate: (widgetId: string, updates: Partial<Widget>) => void;
  isEditing: boolean;
  onEditToggle: () => void;
}

export function TextBlock({ widget, onUpdate, isEditing, onEditToggle }: TextBlockProps) {
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedContentRef = useRef<string>("");
  const { setActiveEditor, showToolbar, hideToolbar } = useTextEditor();

  const handleContentChange = useCallback(
    (html: string) => {
      // Skip if content hasn't actually changed
      if (html === lastSavedContentRef.current) return;
      
      // Clear existing timeout
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }

      // Set new timeout for auto-save (debounced)
      autoSaveTimeoutRef.current = setTimeout(() => {
        onUpdate(widget.id, {
          config: {
            ...widget.config,
            content: html,
          },
        });
        lastSavedContentRef.current = html;
      }, 1000); // 1 second debounce
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
        heading: {
          levels: [1, 2, 3, 4, 5, 6],
        },
      }),
      Underline,
      Typography,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-500 hover:text-blue-700 underline',
        },
      }),
      Placeholder.configure({
        placeholder: "Click to start writing...",
        emptyEditorClass: "is-editor-empty",
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
        alignments: ['left', 'center', 'right'],
        defaultAlignment: 'left',
      }),
      TextStyle.configure(),
      FontFamily.configure({
        types: ['textStyle'],
      }),
    ],
    content: widget.config.content || "",
    immediatelyRender: false, // Fix SSR hydration mismatch
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      handleContentChange(html);
    },
    onFocus: ({ editor }) => {
      setActiveEditor(editor);
      showToolbar();
    },
    onSelectionUpdate: ({ editor }) => {
      // Immediately update active editor on selection changes for faster toolbar updates
      if (editor.isFocused) {
        setActiveEditor(editor);
      }
    },
    onBlur: ({ editor }) => {
      // Keep the editor active even when blurred for persistent toolbar
      // Only clear if another editor becomes active
      setTimeout(() => {
        if (!editor.isFocused) {
          // Don't hide toolbar since it's always visible now
          // hideToolbar();
        }
      }, 100);
    },
    editorProps: {
      attributes: {
        class: `prose prose-lg dark:prose-invert max-w-full focus:outline-none min-h-[2rem]`,
      },
    },
  });

  // Initialize last saved content reference
  useEffect(() => {
    lastSavedContentRef.current = widget.config.content || "";
  }, [widget.config.content]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, []);

  if (!editor) {
    return (
      <div className="h-full w-full bg-transparent flex items-center justify-center p-4">
        <div className="text-gray-500 dark:text-gray-400 text-center">
          <div className="text-2xl mb-2">📝</div>
          <p className="text-sm">Loading editor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-full bg-transparent relative group rounded-lg transition-all duration-200 p-2">
        {/* Bubble menu removed - will be replaced with fixed toolbar */}

        <div className="bg-transparent p-1 w-full min-h-[2rem]">
          <EditorContent 
            editor={editor} 
            className="w-full bg-transparent border-none outline-none focus:outline-none relative z-10 min-h-[2rem]"
          />
        </div>
        
        {/* TipTap Editor Styles - Enhanced for unlimited height */}
        <style jsx global>{`
          .ProseMirror {
            outline: none !important;
            border: none !important;
            background: transparent !important;
            min-height: 2rem !important;
            max-height: none !important;
            height: auto !important;
            position: relative !important;
            z-index: 10 !important;
            cursor: text !important;
            overflow-y: visible !important;
            word-wrap: break-word !important;
            overflow-wrap: break-word !important;
            color: hsl(var(--foreground)) !important;
            font-family: var(--font-sans) !important;
          }
          
          .ProseMirror h1 {
            font-size: 2rem;
            font-weight: bold;
            margin: 1rem 0 0.5rem 0;
            line-height: 1.2;
            color: hsl(var(--foreground));
            font-family: var(--font-serif);
          }
          
          .ProseMirror h2 {
            font-size: 1.5rem;
            font-weight: bold;
            margin: 0.75rem 0 0.5rem 0;
            line-height: 1.3;
            color: hsl(var(--foreground));
            font-family: var(--font-serif);
          }
          
          .ProseMirror h3 {
            font-size: 1.25rem;
            font-weight: bold;
            margin: 0.5rem 0 0.25rem 0;
            line-height: 1.4;
            color: hsl(var(--foreground));
            font-family: var(--font-serif);
          }
          
          .ProseMirror h4 {
            font-size: 1.125rem;
            font-weight: bold;
            margin: 0.5rem 0 0.25rem 0;
            line-height: 1.4;
            color: hsl(var(--foreground));
            font-family: var(--font-serif);
          }
          
          .ProseMirror h5 {
            font-size: 1rem;
            font-weight: bold;
            margin: 0.5rem 0 0.25rem 0;
            line-height: 1.4;
            color: hsl(var(--foreground));
            font-family: var(--font-serif);
          }
          
          .ProseMirror h6 {
            font-size: 0.875rem;
            font-weight: bold;
            margin: 0.5rem 0 0.25rem 0;
            line-height: 1.4;
            color: hsl(var(--foreground));
            font-family: var(--font-serif);
          }
          
          .ProseMirror p {
            margin: 0.25rem 0;
            line-height: 1.6;
            color: hsl(var(--foreground));
            font-family: var(--font-sans);
          }
          
          .ProseMirror p:first-child {
            margin-top: 0;
          }
          
          .ProseMirror p:last-child {
            margin-bottom: 0;
          }
          
          .ProseMirror p:empty {
            margin: 0;
            height: 1.5rem;
          }
          
          .ProseMirror ul, .ProseMirror ol {
            margin: 0.5rem 0;
            padding-left: 1.5rem;
            list-style-position: outside;
          }
          
          .ProseMirror ul {
            list-style-type: disc;
          }
          
          .ProseMirror ol {
            list-style-type: decimal;
          }
          
          .ProseMirror li {
            margin: 0.25rem 0;
            display: list-item;
            list-style-position: outside;
            color: hsl(var(--foreground));
            font-family: var(--font-sans);
          }
          
          .ProseMirror ul li {
            list-style-type: disc;
          }
          
          .ProseMirror ol li {
            list-style-type: decimal;
          }
          
          .ProseMirror blockquote {
            border-left: 4px solid hsl(var(--border));
            margin: 1rem 0;
            padding-left: 1rem;
            font-style: italic;
            color: hsl(var(--muted-foreground));
          }
          
          .ProseMirror code {
            background-color: hsl(var(--muted));
            color: hsl(var(--accent-foreground));
            padding: 0.125rem 0.25rem;
            border-radius: 0.25rem;
            font-family: 'Courier New', Courier, monospace;
            font-size: 0.875rem;
          }
          
          .ProseMirror pre {
            background-color: hsl(var(--muted));
            border: 1px solid hsl(var(--border));
            border-radius: 0.375rem;
            padding: 1rem;
            margin: 1rem 0;
            overflow-x: auto;
            font-family: 'Courier New', Courier, monospace;
            font-size: 0.875rem;
            color: hsl(var(--foreground));
          }
          
          .ProseMirror a {
            color: hsl(var(--primary));
            text-decoration: underline;
          }
          
          .ProseMirror a:hover {
            color: hsl(var(--primary));
            opacity: 0.8;
          }
          
          .ProseMirror p.is-editor-empty:first-child::before {
            content: attr(data-placeholder);
            float: left;
            color: hsl(var(--muted-foreground));
            pointer-events: none;
            height: 0;
          }
          
          .tippy-box {
            z-index: 10000 !important;
          }
          
          /* Ensure text is selectable */
          .ProseMirror * {
            user-select: text !important;
            -webkit-user-select: text !important;
            -moz-user-select: text !important;
            -ms-user-select: text !important;
          }
          
          /* Text alignment support */
          .ProseMirror p[data-text-align="left"],
          .ProseMirror h1[data-text-align="left"],
          .ProseMirror h2[data-text-align="left"],
          .ProseMirror h3[data-text-align="left"],
          .ProseMirror h4[data-text-align="left"],
          .ProseMirror h5[data-text-align="left"],
          .ProseMirror h6[data-text-align="left"] {
            text-align: left;
          }
          
          .ProseMirror p[data-text-align="center"],
          .ProseMirror h1[data-text-align="center"],
          .ProseMirror h2[data-text-align="center"],
          .ProseMirror h3[data-text-align="center"],
          .ProseMirror h4[data-text-align="center"],
          .ProseMirror h5[data-text-align="center"],
          .ProseMirror h6[data-text-align="center"] {
            text-align: center;
          }
          
          .ProseMirror p[data-text-align="right"],
          .ProseMirror h1[data-text-align="right"],
          .ProseMirror h2[data-text-align="right"],
          .ProseMirror h3[data-text-align="right"],
          .ProseMirror h4[data-text-align="right"],
          .ProseMirror h5[data-text-align="right"],
          .ProseMirror h6[data-text-align="right"] {
            text-align: right;
          }
        `}</style>
    </div>
  );
}