"use client";

import { Editor } from "@tiptap/react";
import { motion, AnimatePresence } from "motion/react";
import { useEffect, useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GOOGLE_FONTS, loadGoogleFont } from "./GoogleFonts";

interface SimpleEditorToolbarProps {
  editor: Editor | null;
  isVisible: boolean;
}

export function SimpleEditorToolbar({ editor, isVisible }: SimpleEditorToolbarProps) {
  const [editorState, setEditorState] = useState({});

  // Force toolbar state updates on editor changes
  useEffect(() => {
    if (!editor) return;

    const updateState = () => {
      // Force a re-render by updating state
      setEditorState({});
    };

    // Listen to editor updates
    editor.on('selectionUpdate', updateState);
    editor.on('transaction', updateState);
    
    return () => {
      editor.off('selectionUpdate', updateState);
      editor.off('transaction', updateState);
    };
  }, [editor]);

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

  const handleFontChange = (fontFamily: string) => {
    if (fontFamily === "default" || !fontFamily) {
      editor.chain().focus().unsetFontFamily().run();
    } else {
      loadGoogleFont(fontFamily);
      editor.chain().focus().setFontFamily(fontFamily).run();
    }
  };

  const getCurrentFont = () => {
    const fontFamily = editor.getAttributes('textStyle').fontFamily;
    if (!fontFamily) return "default";
    
    const matchingFont = GOOGLE_FONTS.find(font => 
      font.value === fontFamily || font.name.toLowerCase() === fontFamily.toLowerCase()
    );
    return matchingFont ? fontFamily : "default";
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="w-full z-40 bg-background border-b border-border"
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

          <Separator orientation="vertical" className="mx-1 h-6 border-border" />

          {/* Text formatting */}
          <Button
            variant="ghost"
            size="sm"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().toggleBold().run()}
            data-active={editor.isActive('bold')}
            className="h-8 w-8 p-0 data-[active=true]:bg-accent data-[active=true]:text-accent-foreground"
          >
            <Bold className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().toggleItalic().run()}
            data-active={editor.isActive('italic')}
            className="h-8 w-8 p-0 data-[active=true]:bg-accent data-[active=true]:text-accent-foreground"
          >
            <Italic className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            data-active={editor.isActive('underline')}
            className="h-8 w-8 p-0 data-[active=true]:bg-accent data-[active=true]:text-accent-foreground"
          >
            <Underline className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().toggleCode().run()}
            data-active={editor.isActive('code')}
            className="h-8 w-8 p-0 data-[active=true]:bg-accent data-[active=true]:text-accent-foreground"
          >
            <Code className="h-4 w-4" />
          </Button>

          <Separator orientation="vertical" className="mx-1 h-6 border-border" />

          {/* Font Family Selector */}
          <Select value={getCurrentFont()} onValueChange={handleFontChange}>
            <SelectTrigger className="w-[140px] h-8">
              <SelectValue placeholder="Font" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default">Default</SelectItem>
              {GOOGLE_FONTS.map((font) => (
                <SelectItem key={font.value} value={font.value}>
                  <span style={{ fontFamily: font.value }}>{font.name}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Separator orientation="vertical" className="mx-1 h-6 border-border" />

          {/* Headings */}
          <Button
            variant="ghost"
            size="sm"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().setParagraph().run()}
            data-active={editor.isActive('paragraph')}
            className="h-8 w-8 p-0 data-[active=true]:bg-accent data-[active=true]:text-accent-foreground"
          >
            <Pilcrow className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            data-active={editor.isActive('heading', { level: 1 })}
            className="h-8 w-8 p-0 data-[active=true]:bg-accent data-[active=true]:text-accent-foreground"
          >
            <Heading1 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            data-active={editor.isActive('heading', { level: 2 })}
            className="h-8 w-8 p-0 data-[active=true]:bg-accent data-[active=true]:text-accent-foreground"
          >
            <Heading2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            data-active={editor.isActive('heading', { level: 3 })}
            className="h-8 w-8 p-0 data-[active=true]:bg-accent data-[active=true]:text-accent-foreground"
          >
            <Heading3 className="h-4 w-4" />
          </Button>

          <Separator orientation="vertical" className="mx-1 h-6 border-border" />

          {/* Text Alignment */}
          <Button
            variant="ghost"
            size="sm"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().setTextAlign('left').run()}
            data-active={editor.isActive({ textAlign: 'left' })}
            className="h-8 w-8 p-0 data-[active=true]:bg-accent data-[active=true]:text-accent-foreground"
          >
            <AlignLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().setTextAlign('center').run()}
            data-active={editor.isActive({ textAlign: 'center' })}
            className="h-8 w-8 p-0 data-[active=true]:bg-accent data-[active=true]:text-accent-foreground"
          >
            <AlignCenter className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().setTextAlign('right').run()}
            data-active={editor.isActive({ textAlign: 'right' })}
            className="h-8 w-8 p-0 data-[active=true]:bg-accent data-[active=true]:text-accent-foreground"
          >
            <AlignRight className="h-4 w-4" />
          </Button>

          <Separator orientation="vertical" className="mx-1 h-6 border-border" />

          {/* Lists */}
          <Button
            variant="ghost"
            size="sm"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            data-active={editor.isActive('bulletList')}
            className="h-8 w-8 p-0 data-[active=true]:bg-accent data-[active=true]:text-accent-foreground"
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            data-active={editor.isActive('orderedList')}
            className="h-8 w-8 p-0 data-[active=true]:bg-accent data-[active=true]:text-accent-foreground"
          >
            <ListOrdered className="h-4 w-4" />
          </Button>

          <Separator orientation="vertical" className="mx-1 h-6 border-border" />

          {/* Quote and Link */}
          <Button
            variant="ghost"
            size="sm"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            data-active={editor.isActive('blockquote')}
            className="h-8 w-8 p-0 data-[active=true]:bg-accent data-[active=true]:text-accent-foreground"
          >
            <Quote className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onMouseDown={(e) => e.preventDefault()}
            onClick={toggleLink}
            data-active={editor.isActive('link')}
            className="h-8 w-8 p-0 data-[active=true]:bg-accent data-[active=true]:text-accent-foreground"
          >
            <Link className="h-4 w-4" />
          </Button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}