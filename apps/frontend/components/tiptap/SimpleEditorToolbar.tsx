"use client";

import { Editor } from "@tiptap/react";
import { motion, AnimatePresence } from "motion/react";
import {
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Quote,
  Code,
  Heading1,
  Heading2,
  Heading3,
  Undo,
  Redo,
  Link,
  Pilcrow,
  AlignLeft,
  AlignCenter,
  AlignRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

interface SimpleEditorToolbarProps {
  editor: Editor | null;
  isVisible: boolean;
}

export function SimpleEditorToolbar({ editor, isVisible }: SimpleEditorToolbarProps) {
  if (!editor || !isVisible) {
    return null;
  }

  const toggleLink = () => {
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('URL', previousUrl);

    // cancelled
    if (url === null) {
      editor.chain().focus().run();
      return;
    }

    // empty
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    // update link
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="w-full z-40 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 shadow-sm"
      >
        <div className="flex items-center gap-1 px-4 py-2 overflow-x-auto">
          {/* Undo/Redo */}
          <Button
            variant="ghost"
            size="sm"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().chain().focus().undo().run()}
            className="h-8 w-8 p-0"
          >
            <Undo className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().chain().focus().redo().run()}
            className="h-8 w-8 p-0"
          >
            <Redo className="h-4 w-4" />
          </Button>

          <Separator orientation="vertical" className="mx-1 h-6" />

          {/* Text formatting */}
          <Button
            variant="ghost"
            size="sm"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().toggleBold().run()}
            data-active={editor.isActive('bold')}
            className="h-8 w-8 p-0 data-[active=true]:bg-gray-200 dark:data-[active=true]:bg-gray-700"
          >
            <Bold className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().toggleItalic().run()}
            data-active={editor.isActive('italic')}
            className="h-8 w-8 p-0 data-[active=true]:bg-gray-200 dark:data-[active=true]:bg-gray-700"
          >
            <Italic className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            data-active={editor.isActive('underline')}
            className="h-8 w-8 p-0 data-[active=true]:bg-gray-200 dark:data-[active=true]:bg-gray-700"
          >
            <Underline className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().toggleCode().run()}
            data-active={editor.isActive('code')}
            className="h-8 w-8 p-0 data-[active=true]:bg-gray-200 dark:data-[active=true]:bg-gray-700"
          >
            <Code className="h-4 w-4" />
          </Button>

          <Separator orientation="vertical" className="mx-1 h-6" />

          {/* Headings */}
          <Button
            variant="ghost"
            size="sm"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().setParagraph().run()}
            data-active={editor.isActive('paragraph')}
            className="h-8 w-8 p-0 data-[active=true]:bg-gray-200 dark:data-[active=true]:bg-gray-700"
          >
            <Pilcrow className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            data-active={editor.isActive('heading', { level: 1 })}
            className="h-8 w-8 p-0 data-[active=true]:bg-gray-200 dark:data-[active=true]:bg-gray-700"
          >
            <Heading1 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            data-active={editor.isActive('heading', { level: 2 })}
            className="h-8 w-8 p-0 data-[active=true]:bg-gray-200 dark:data-[active=true]:bg-gray-700"
          >
            <Heading2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            data-active={editor.isActive('heading', { level: 3 })}
            className="h-8 w-8 p-0 data-[active=true]:bg-gray-200 dark:data-[active=true]:bg-gray-700"
          >
            <Heading3 className="h-4 w-4" />
          </Button>

          <Separator orientation="vertical" className="mx-1 h-6" />

          {/* Text Alignment */}
          <Button
            variant="ghost"
            size="sm"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().setTextAlign('left').run()}
            data-active={editor.isActive({ textAlign: 'left' })}
            className="h-8 w-8 p-0 data-[active=true]:bg-gray-200 dark:data-[active=true]:bg-gray-700"
          >
            <AlignLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().setTextAlign('center').run()}
            data-active={editor.isActive({ textAlign: 'center' })}
            className="h-8 w-8 p-0 data-[active=true]:bg-gray-200 dark:data-[active=true]:bg-gray-700"
          >
            <AlignCenter className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().setTextAlign('right').run()}
            data-active={editor.isActive({ textAlign: 'right' })}
            className="h-8 w-8 p-0 data-[active=true]:bg-gray-200 dark:data-[active=true]:bg-gray-700"
          >
            <AlignRight className="h-4 w-4" />
          </Button>

          <Separator orientation="vertical" className="mx-1 h-6" />

          {/* Lists */}
          <Button
            variant="ghost"
            size="sm"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            data-active={editor.isActive('bulletList')}
            className="h-8 w-8 p-0 data-[active=true]:bg-gray-200 dark:data-[active=true]:bg-gray-700"
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            data-active={editor.isActive('orderedList')}
            className="h-8 w-8 p-0 data-[active=true]:bg-gray-200 dark:data-[active=true]:bg-gray-700"
          >
            <ListOrdered className="h-4 w-4" />
          </Button>

          <Separator orientation="vertical" className="mx-1 h-6" />

          {/* Quote and Link */}
          <Button
            variant="ghost"
            size="sm"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            data-active={editor.isActive('blockquote')}
            className="h-8 w-8 p-0 data-[active=true]:bg-gray-200 dark:data-[active=true]:bg-gray-700"
          >
            <Quote className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onMouseDown={(e) => e.preventDefault()}
            onClick={toggleLink}
            data-active={editor.isActive('link')}
            className="h-8 w-8 p-0 data-[active=true]:bg-gray-200 dark:data-[active=true]:bg-gray-700"
          >
            <Link className="h-4 w-4" />
          </Button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}