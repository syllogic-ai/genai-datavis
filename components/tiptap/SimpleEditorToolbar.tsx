"use client";

import { Editor } from "@tiptap/react";
import { motion, AnimatePresence } from "motion/react";
import { useEffect, useState, useCallback } from "react";
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
  AlignRight,
  Plus,
  Minus
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
import { GOOGLE_FONTS, FONT_WEIGHTS, loadGoogleFont, getAvailableWeights } from "./GoogleFonts";

interface SimpleEditorToolbarProps {
  editor: Editor | null;
  isVisible: boolean;
}

export function SimpleEditorToolbar({ editor, isVisible }: SimpleEditorToolbarProps) {
  const [editorState, setEditorState] = useState({});

  // Helper function to check if editor is still valid
  const isEditorValid = useCallback((editor: Editor | null): editor is Editor => {
    if (!editor) return false;
    try {
      // Try to access a property that requires the editor to be mounted
      editor.isDestroyed;
      return !editor.isDestroyed && !!editor.view && !!editor.view.dom;
    } catch (error) {
      return false;
    }
  }, []);

  // Force toolbar state updates on editor changes
  useEffect(() => {
    if (!isEditorValid(editor)) return;

    const updateState = () => {
      // Only update if editor is still valid
      if (isEditorValid(editor)) {
        setEditorState({});
      }
    };

    // Listen to editor updates
    editor.on('selectionUpdate', updateState);
    editor.on('transaction', updateState);
    
    return () => {
      if (isEditorValid(editor)) {
        editor.off('selectionUpdate', updateState);
        editor.off('transaction', updateState);
      }
    };
  }, [editor, isEditorValid]);

  if (!isEditorValid(editor) || !isVisible) {
    return null;
  }

  const toggleLink = () => {
    if (!isEditorValid(editor)) return;
    
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('URL', previousUrl);

    // cancelled
    if (url === null) {
      if (isEditorValid(editor)) {
        editor.chain().focus().run();
      }
      return;
    }

    // empty
    if (url === '') {
      if (isEditorValid(editor)) {
        editor.chain().focus().extendMarkRange('link').unsetLink().run();
      }
      return;
    }

    // update link
    if (isEditorValid(editor)) {
      editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    }
  };

  const handleFontChange = (fontFamily: string) => {
    if (!isEditorValid(editor)) return;
    
    if (fontFamily === "default" || !fontFamily) {
      // Remove font family by updating textStyle without fontFamily
      const currentAttrs = editor.getAttributes('textStyle');
      const { fontFamily: _, ...restAttrs } = currentAttrs;
      if (Object.keys(restAttrs).length > 0) {
        editor.chain().focus().setMark('textStyle', restAttrs).run();
      } else {
        editor.chain().focus().unsetMark('textStyle').run();
      }
    } else {
      loadGoogleFont(fontFamily);
      // Get current attributes and merge with new font family
      const currentAttrs = editor.getAttributes('textStyle');
      
      // Ensure we're setting the font family value correctly
      // The fontFamily from GOOGLE_FONTS already includes quotes where needed
      editor.chain().focus().setMark('textStyle', { 
        ...currentAttrs, 
        fontFamily 
      }).run();
    }
  };

  const getCurrentFont = () => {
    if (!isEditorValid(editor)) return "default";
    
    // First try to get font from current text style attributes
    let fontFamily = editor.getAttributes('textStyle').fontFamily;
    
    // If no font found in textStyle, check the DOM element at cursor position
    if (!fontFamily) {
      try {
        const { from } = editor.state.selection;
        const resolvedPos = editor.state.doc.resolve(from);
        
        // Walk up the tree to find any element with font-family styling
        const view = editor.view;
        const domAtPos = view.domAtPos(from);
        let element = domAtPos.node;
        
        // Search parent elements for font-family style
        while (element && element.nodeType !== Node.DOCUMENT_NODE) {
          if (element.nodeType === Node.ELEMENT_NODE) {
            const el = element as HTMLElement;
            const style = el.getAttribute('style');
            if (style && style.includes('font-family')) {
              const match = style.match(/font-family:\s*([^;]+)/);
              if (match) {
                fontFamily = match[1].trim().replace(/['"]/g, '');
                break;
              }
            }
            // Also check computed style
            const computedStyle = window.getComputedStyle(el);
            if (computedStyle.fontFamily && computedStyle.fontFamily !== 'inherit' && computedStyle.fontFamily !== 'initial') {
              // Only use computed style if it's not a generic fallback
              const computedFont = computedStyle.fontFamily.split(',')[0].trim().replace(/['"]/g, '');
              if (!computedFont.includes('serif') && !computedFont.includes('sans-serif') && !computedFont.includes('monospace')) {
                fontFamily = computedFont;
                break;
              }
            }
          }
          element = element.parentNode;
        }
      } catch (error) {
        console.log('[Toolbar] Error detecting font from DOM:', error);
      }
    }
    
    if (!fontFamily) return "default";
    
    // Normalize the font family for comparison
    // Remove extra quotes and spaces
    const normalizedFontFamily = fontFamily.replace(/['"]/g, '').trim();
    
    const matchingFont = GOOGLE_FONTS.find(font => {
      const normalizedFontValue = font.value.replace(/['"]/g, '').trim();
      return normalizedFontValue === normalizedFontFamily || 
             font.value === fontFamily ||
             font.name.toLowerCase() === normalizedFontFamily.toLowerCase();
    });
    
    return matchingFont ? matchingFont.value : "default";
  };

  const handleFontWeightChange = (fontWeight: string) => {
    if (!isEditorValid(editor)) return;
    
    if (fontWeight === "default" || !fontWeight) {
      // Remove font weight by updating textStyle without fontWeight
      const currentAttrs = editor.getAttributes('textStyle');
      const { fontWeight: _, ...restAttrs } = currentAttrs;
      if (Object.keys(restAttrs).length > 0) {
        editor.chain().focus().setMark('textStyle', restAttrs).run();
      } else {
        editor.chain().focus().unsetMark('textStyle').run();
      }
    } else {
      // Get current attributes and merge with new font weight
      const currentAttrs = editor.getAttributes('textStyle');
      editor.chain().focus().setMark('textStyle', { 
        ...currentAttrs, 
        fontWeight 
      }).run();
    }
  };

  const getCurrentFontWeight = () => {
    if (!isEditorValid(editor)) return "400";
    
    // First try to get weight from current text style attributes
    let fontWeight = editor.getAttributes('textStyle').fontWeight;
    
    // If no weight found in textStyle, check the DOM element at cursor position
    if (!fontWeight) {
      try {
        const { from } = editor.state.selection;
        const view = editor.view;
        const domAtPos = view.domAtPos(from);
        let element = domAtPos.node;
        
        // Search parent elements for font-weight style
        while (element && element.nodeType !== Node.DOCUMENT_NODE) {
          if (element.nodeType === Node.ELEMENT_NODE) {
            const el = element as HTMLElement;
            const style = el.getAttribute('style');
            if (style && style.includes('font-weight')) {
              const match = style.match(/font-weight:\s*([^;]+)/);
              if (match) {
                fontWeight = match[1].trim();
                break;
              }
            }
            // Also check computed style
            const computedStyle = window.getComputedStyle(el);
            if (computedStyle.fontWeight && computedStyle.fontWeight !== 'inherit' && computedStyle.fontWeight !== 'initial') {
              fontWeight = computedStyle.fontWeight;
              break;
            }
          }
          element = element.parentNode;
        }
      } catch (error) {
        console.log('[Toolbar] Error detecting font weight from DOM:', error);
      }
    }
    
    return fontWeight || "400";
  };

  const getAvailableWeightsForCurrentFont = () => {
    if (!isEditorValid(editor)) return getAvailableWeights("default");
    
    const fontFamily = editor.getAttributes('textStyle').fontFamily;
    if (!fontFamily) return getAvailableWeights("default");
    
    // Find the matching font to get its weights
    const normalizedFontFamily = fontFamily.replace(/['"]/g, '').trim();
    const matchingFont = GOOGLE_FONTS.find(font => {
      const normalizedFontValue = font.value.replace(/['"]/g, '').trim();
      return normalizedFontValue === normalizedFontFamily || 
             font.value === fontFamily ||
             font.name.toLowerCase() === normalizedFontFamily.toLowerCase();
    });
    
    return matchingFont ? matchingFont.weights : ["400", "700"];
  };

  const getCurrentFontSize = () => {
    if (!isEditorValid(editor)) return "16px";
    
    // First try to get size from current text style attributes
    let fontSize = editor.getAttributes('textStyle').fontSize;
    
    // If no size found in textStyle, check the DOM element at cursor position
    if (!fontSize) {
      try {
        const { from } = editor.state.selection;
        const view = editor.view;
        const domAtPos = view.domAtPos(from);
        let element = domAtPos.node;
        
        // Search parent elements for font-size style
        while (element && element.nodeType !== Node.DOCUMENT_NODE) {
          if (element.nodeType === Node.ELEMENT_NODE) {
            const el = element as HTMLElement;
            const style = el.getAttribute('style');
            if (style && style.includes('font-size')) {
              const match = style.match(/font-size:\s*([^;]+)/);
              if (match) {
                fontSize = match[1].trim();
                break;
              }
            }
            // Also check computed style
            const computedStyle = window.getComputedStyle(el);
            if (computedStyle.fontSize && computedStyle.fontSize !== 'inherit' && computedStyle.fontSize !== 'initial') {
              fontSize = computedStyle.fontSize;
              break;
            }
          }
          element = element.parentNode;
        }
      } catch (error) {
        console.log('[Toolbar] Error detecting font size from DOM:', error);
      }
    }
    
    return fontSize || "16px";
  };

  const increaseFontSize = () => {
    if (!isEditorValid(editor)) return;
    
    const currentSize = getCurrentFontSize();
    const sizeValue = parseFloat(currentSize.replace('px', '')) || 16;
    const newSize = Math.min(sizeValue + 2, 72); // Max 72px
    
    // Get current attributes and merge with new font size
    const currentAttrs = editor.getAttributes('textStyle');
    editor.chain().focus().setMark('textStyle', { 
      ...currentAttrs, 
      fontSize: `${newSize}px` 
    }).run();
  };

  const decreaseFontSize = () => {
    if (!isEditorValid(editor)) return;
    
    const currentSize = getCurrentFontSize();
    const sizeValue = parseFloat(currentSize.replace('px', '')) || 16;
    const newSize = Math.max(sizeValue - 2, 8); // Min 8px
    
    // Get current attributes and merge with new font size
    const currentAttrs = editor.getAttributes('textStyle');
    editor.chain().focus().setMark('textStyle', { 
      ...currentAttrs, 
      fontSize: `${newSize}px` 
    }).run();
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

          {/* Font Weight Selector */}
          <Select value={getCurrentFontWeight()} onValueChange={handleFontWeightChange}>
            <SelectTrigger className="w-[120px] h-8">
              <SelectValue placeholder="Weight" />
            </SelectTrigger>
            <SelectContent>
              {getAvailableWeightsForCurrentFont().map((weight) => {
                const weightName = FONT_WEIGHTS.find(w => w.value === weight)?.name || weight;
                return (
                  <SelectItem key={weight} value={weight}>
                    <span style={{ fontWeight: weight }}>{weightName}</span>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>

          {/* Font Size Controls */}
          <Button
            variant="ghost"
            size="sm"
            onMouseDown={(e) => e.preventDefault()}
            onClick={decreaseFontSize}
            className="h-8 w-8 p-0"
            title="Decrease font size"
          >
            <Minus className="h-4 w-4" />
          </Button>
          <span className="text-xs text-muted-foreground min-w-[32px] text-center">
            {getCurrentFontSize().replace('px', '')}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onMouseDown={(e) => e.preventDefault()}
            onClick={increaseFontSize}
            className="h-8 w-8 p-0"
            title="Increase font size"
          >
            <Plus className="h-4 w-4" />
          </Button>

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