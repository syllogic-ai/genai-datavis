"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import Typography from "@tiptap/extension-typography";
import Link from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import { Widget } from "@/types/enhanced-dashboard-types";
import { useTextEditor } from "../TextEditorContext";
import { loadGoogleFont } from "@/components/tiptap/GoogleFonts";
import { usePathname } from "next/navigation";

interface TextBlockProps {
  widget: Widget;
  onUpdate: (widgetId: string, updates: Partial<Widget>) => void;
  isEditing: boolean;
  onEditToggle: () => void;
}

export function TextBlock({ widget, onUpdate, isEditing, onEditToggle }: TextBlockProps) {
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedContentRef = useRef<string>("");
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const { setActiveEditor, showToolbar, hideToolbar } = useTextEditor();
  const pathname = usePathname();
  
  // Check if we're on a public dashboard route (/d/[dashboardId])
  const isPublicRoute = pathname?.startsWith('/d/');
  
  // Debug logging
  console.log('[TextBlock] Component props:', {
    widgetId: widget.id,
    isEditing,
    isPublicRoute,
    pathname,
    hasContent: !!widget.config.content
  });

  // Helper function to normalize HTML for comparison
  const normalizeHTML = (html: string) => {
    // Create a temporary div to parse and re-serialize HTML
    const temp = document.createElement('div');
    temp.innerHTML = html;
    return temp.innerHTML;
  };

  // Helper function to extract and load fonts from HTML content
  const loadFontsFromContent = async (htmlContent: string) => {
    if (!htmlContent) return;
    
    console.log('[TextBlock] Extracting fonts from content:', htmlContent.substring(0, 200) + '...');
    
    // Create a temporary div to parse HTML
    const temp = document.createElement('div');
    temp.innerHTML = htmlContent;
    
    // Find all elements with font-family style
    const elementsWithFonts = temp.querySelectorAll('[style*="font-family"]');
    const fontsToLoad = new Set<string>();
    
    elementsWithFonts.forEach((element) => {
      const styleAttr = (element as HTMLElement).getAttribute('style');
      console.log('[TextBlock] Found element with style:', styleAttr);
      
      // Use regex to extract font-family value more reliably
      const fontFamilyMatch = styleAttr?.match(/font-family:\s*([^;]+)/);
      if (fontFamilyMatch) {
        const fullFontFamily = fontFamilyMatch[1].trim();
        console.log('[TextBlock] Extracted font-family:', fullFontFamily);
        
        // Extract the primary font name, handling various quote styles
        // Remove surrounding quotes first
        const cleanedFamily = fullFontFamily.replace(/^["']|["']$/g, '');
        // Then split by comma and get first font
        const primaryFont = cleanedFamily.split(',')[0].replace(/['"]/g, '').trim();
        
        console.log('[TextBlock] Primary font to load:', primaryFont);
        
        if (primaryFont && 
            !primaryFont.includes('serif') && 
            !primaryFont.includes('sans-serif') && 
            !primaryFont.includes('monospace') &&
            primaryFont !== 'inherit' &&
            primaryFont !== 'initial') {
          fontsToLoad.add(primaryFont);
        }
      }
    });
    
    // Load all unique fonts
    console.log('[TextBlock] Fonts to load:', Array.from(fontsToLoad));
    const loadPromises: Promise<void>[] = [];
    
    fontsToLoad.forEach(font => {
      console.log('[TextBlock] Loading font:', font);
      loadGoogleFont(font);
      
      // Also check if font is available using document.fonts API
      if ('fonts' in document) {
        const fontCheckPromise = document.fonts.ready.then(() => {
          console.log(`[TextBlock] Document fonts ready, checking for ${font}`);
          // Force a re-render after fonts are loaded
          setFontsLoaded(true);
        });
        loadPromises.push(fontCheckPromise);
      }
    });
    
    // Wait for all fonts to be ready
    if (loadPromises.length > 0) {
      await Promise.all(loadPromises);
    }
  };

  const handleContentChange = useCallback(
    (html: string) => {
      // Normalize both current and saved content for accurate comparison
      const normalizedHtml = normalizeHTML(html);
      const normalizedSaved = normalizeHTML(lastSavedContentRef.current);
      
      // Skip if content hasn't actually changed
      if (normalizedHtml === normalizedSaved) return;
      
      // Clear existing timeout
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }

      // Set new timeout for auto-save (debounced)
      autoSaveTimeoutRef.current = setTimeout(() => {
        console.log('[TextBlock] Saving content with font styles:', html);
        onUpdate(widget.id, {
          config: {
            ...widget.config,
            content: html,
          },
        });
        lastSavedContentRef.current = html;
      }, 2000); // 2 second debounce to match WidgetPersistence
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
        // Disable link and underline from StarterKit since we're adding them separately
        link: false,
        underline: false,
      }) as any,
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
      TextStyle.extend({
        parseHTML() {
          return [
            {
              tag: 'span',
              getAttrs: (element) => {
                const el = element as HTMLElement;
                const hasStyles = el.style.fontFamily || el.style.fontWeight || el.style.fontSize;
                return hasStyles ? {} : false;
              },
            },
          ];
        },
        addAttributes() {
          return {
            ...this.parent?.(),
            fontFamily: {
              default: null,
              parseHTML: element => {
                const fontFamily = element.style.fontFamily;
                if (!fontFamily) return null;
                // Clean up the font family value - remove outer quotes if present
                return fontFamily.replace(/^["']|["']$/g, '');
              },
            },
            fontWeight: {
              default: null,
              parseHTML: element => element.style.fontWeight || null,
            },
            fontSize: {
              default: null,
              parseHTML: element => element.style.fontSize || null,
            },
          };
        },
        renderHTML({ HTMLAttributes }) {
          const styles = [];
          
          // Collect all style properties
          if (HTMLAttributes.fontWeight) {
            styles.push(`font-weight: ${HTMLAttributes.fontWeight}`);
          }
          if (HTMLAttributes.fontSize) {
            styles.push(`font-size: ${HTMLAttributes.fontSize}`);
          }
          if (HTMLAttributes.fontFamily) {
            // Pass font-family as-is from the stored value
            styles.push(`font-family: ${HTMLAttributes.fontFamily}`);
          }
          
          // Include any existing styles from parent
          if (HTMLAttributes.style) {
            styles.push(HTMLAttributes.style);
          }
          
          if (styles.length === 0) {
            return ['span', {}];
          }
          
          return [
            'span',
            {
              style: styles.join('; '),
            },
            0,
          ];
        },
      }),
    ],
    content: widget.config.content || "",
    editable: isEditing, // Make editor read-only when not editing
    immediatelyRender: false, // Fix SSR hydration mismatch
    parseOptions: {
      preserveWhitespace: 'full',
    },
    onCreate: ({ editor }) => {
      // Force update to ensure content is properly rendered
      if (widget.config.content) {
        editor.commands.setContent(widget.config.content);
      }
    },
    onUpdate: ({ editor }) => {
      // Only handle changes when editing is enabled
      if (isEditing) {
        const html = editor.getHTML();
        handleContentChange(html);
      }
    },
    onFocus: ({ editor }) => {
      // Only activate toolbar when editing is enabled
      if (isEditing) {
        setActiveEditor(editor);
        showToolbar();
      }
    },
    onSelectionUpdate: ({ editor }) => {
      // Immediately update active editor on selection changes for faster toolbar updates
      if (editor.isFocused && isEditing) {
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
        class: `max-w-full focus:outline-none min-h-[2rem] ${!isEditing ? 'cursor-default' : 'cursor-text'}`,
      },
    },
  });

  // Initialize last saved content reference and update editor
  useEffect(() => {
    console.log('[TextBlock] Widget content loaded from database:', widget.config.content);
    lastSavedContentRef.current = widget.config.content || "";
    
    // Load fonts from content
    loadFontsFromContent(widget.config.content || "");
    
    // Update editor content when widget content changes
    if (editor && widget.config.content) {
      const currentHTML = editor.getHTML();
      const normalizedCurrent = normalizeHTML(currentHTML);
      const normalizedWidget = normalizeHTML(widget.config.content);
      
      if (normalizedCurrent !== normalizedWidget) {
        console.log('[TextBlock] Updating editor content, current:', currentHTML, 'new:', widget.config.content);
        editor.commands.setContent(widget.config.content);
      }
    }
  }, [widget.config.content, editor]);

  // Update editor editable state when isEditing changes
  useEffect(() => {
    if (editor) {
      editor.setEditable(isEditing);
      console.log('[TextBlock] Editor editable state updated:', isEditing);
    }
  }, [editor, isEditing]);

  // Always load fonts from content, even without editor (for read-only public dashboards)
  useEffect(() => {
    if (widget.config.content && !editor) {
      console.log('[TextBlock] Loading fonts for read-only mode');
      loadFontsFromContent(widget.config.content);
    }
  }, [widget.config.content, editor]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, []);

  // Debug rendered content
  useEffect(() => {
    if (editor) {
      const checkRenderedStyles = () => {
        const editorElement = document.querySelector('.ProseMirror');
        if (editorElement) {
          console.log('[TextBlock] Editor DOM content:', editorElement.innerHTML);
          const styledElements = editorElement.querySelectorAll('[style]');
          styledElements.forEach((elem, i) => {
            const computedStyle = window.getComputedStyle(elem);
            console.log(`[TextBlock] Element ${i}:`, {
              tagName: elem.tagName,
              styleAttribute: elem.getAttribute('style'),
              computedFontFamily: computedStyle.fontFamily,
              computedFontWeight: computedStyle.fontWeight,
              computedFontSize: computedStyle.fontSize,
              parentStyles: elem.parentElement ? window.getComputedStyle(elem.parentElement).fontFamily : 'N/A'
            });
          });
        }
      };
      
      // Check after a delay to ensure rendering is complete
      setTimeout(checkRenderedStyles, 500);
    }
  }, [editor, widget.config.content]);

  // For read-only mode (ONLY on public dashboard routes /d/[dashboardId]), render content directly with proper font loading
  if (isPublicRoute && !isEditing && widget.config.content) {
    return (
      <div className="w-full min-h-full bg-transparent relative group rounded-lg transition-all duration-200 p-2">
        <div 
          className="bg-transparent p-1 w-full min-h-[2rem] ProseMirror"
          dangerouslySetInnerHTML={{ __html: widget.config.content }}
          style={{
            outline: 'none',
            border: 'none',
            background: 'transparent',
            minHeight: '2rem',
            height: 'auto',
            position: 'relative',
            zIndex: 10,
            wordWrap: 'break-word',
            overflowWrap: 'break-word',
            color: 'var(--foreground)',
            fontFamily: 'var(--font-sans)',
            pointerEvents: 'none', // Make it truly read-only
            userSelect: 'text' // But allow text selection
          }}
        />
        
        {/* Apply same TipTap styles for consistency */}
        <style jsx global>{`
          .ProseMirror h1 {
            font-size: 2rem;
            font-weight: bold;
            margin: 1rem 0 0.5rem 0;
            line-height: 1.2;
            color: var(--foreground);
            font-family: var(--font-serif);
          }
          
          .ProseMirror h2 {
            font-size: 1.5rem;
            font-weight: bold;
            margin: 0.75rem 0 0.5rem 0;
            line-height: 1.3;
            color: var(--foreground);
            font-family: var(--font-serif);
          }
          
          .ProseMirror h3 {
            font-size: 1.25rem;
            font-weight: bold;
            margin: 0.5rem 0 0.25rem 0;
            line-height: 1.4;
            color: var(--foreground);
            font-family: var(--font-serif);
          }
          
          .ProseMirror h4 {
            font-size: 1.125rem;
            font-weight: bold;
            margin: 0.5rem 0 0.25rem 0;
            line-height: 1.4;
            color: var(--foreground);
            font-family: var(--font-serif);
          }
          
          .ProseMirror h5 {
            font-size: 1rem;
            font-weight: bold;
            margin: 0.5rem 0 0.25rem 0;
            line-height: 1.4;
            color: var(--foreground);
            font-family: var(--font-serif);
          }
          
          .ProseMirror h6 {
            font-size: 0.875rem;
            font-weight: bold;
            margin: 0.5rem 0 0.25rem 0;
            line-height: 1.4;
            color: var(--foreground);
            font-family: var(--font-serif);
          }
          
          .ProseMirror p {
            margin: 0.25rem 0;
            line-height: 1.6;
            color: var(--foreground);
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
            color: var(--foreground);
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
            color: var(--muted-foreground);
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
            color: var(--foreground);
          }
          
          .ProseMirror a {
            color: var(--primary);
            text-decoration: underline;
          }
          
          .ProseMirror a:hover {
            color: var(--primary);
            opacity: 0.8;
          }
        `}</style>
      </div>
    );
  }

  if (!editor) {
    return (
      <div className="h-full w-full bg-transparent flex items-center justify-center p-4">
        <div className="text-center" style={{ color: 'var(--muted-foreground)' }}>
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
            color: var(--foreground) !important;
            font-family: var(--font-sans);
          }
          
          /* Remove inherit rules to allow inline styles to work */
          
          
          .ProseMirror h1 {
            font-size: 2rem;
            font-weight: bold;
            margin: 1rem 0 0.5rem 0;
            line-height: 1.2;
            color: var(--foreground);
            font-family: var(--font-serif);
          }
          
          .ProseMirror h2 {
            font-size: 1.5rem;
            font-weight: bold;
            margin: 0.75rem 0 0.5rem 0;
            line-height: 1.3;
            color: var(--foreground);
            font-family: var(--font-serif);
          }
          
          .ProseMirror h3 {
            font-size: 1.25rem;
            font-weight: bold;
            margin: 0.5rem 0 0.25rem 0;
            line-height: 1.4;
            color: var(--foreground);
            font-family: var(--font-serif);
          }
          
          .ProseMirror h4 {
            font-size: 1.125rem;
            font-weight: bold;
            margin: 0.5rem 0 0.25rem 0;
            line-height: 1.4;
            color: var(--foreground);
            font-family: var(--font-serif);
          }
          
          .ProseMirror h5 {
            font-size: 1rem;
            font-weight: bold;
            margin: 0.5rem 0 0.25rem 0;
            line-height: 1.4;
            color: var(--foreground);
            font-family: var(--font-serif);
          }
          
          .ProseMirror h6 {
            font-size: 0.875rem;
            font-weight: bold;
            margin: 0.5rem 0 0.25rem 0;
            line-height: 1.4;
            color: var(--foreground);
            font-family: var(--font-serif);
          }
          
          .ProseMirror p {
            margin: 0.25rem 0;
            line-height: 1.6;
            color: var(--foreground);
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
            color: var(--foreground);
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
            color: var(--muted-foreground);
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
            color: var(--foreground);
          }
          
          .ProseMirror a {
            color: var(--primary);
            text-decoration: underline;
          }
          
          .ProseMirror a:hover {
            color: var(--primary);
            opacity: 0.8;
          }
          
          .ProseMirror p.is-editor-empty:first-child::before {
            content: attr(data-placeholder);
            float: left;
            color: var(--muted-foreground);
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