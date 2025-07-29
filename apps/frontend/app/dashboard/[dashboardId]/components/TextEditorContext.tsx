"use client";

import React, { createContext, useContext, useState, useCallback } from 'react';
import { Editor } from '@tiptap/react';

interface TextEditorContextType {
  activeEditor: Editor | null;
  isToolbarVisible: boolean;
  setActiveEditor: (editor: Editor | null) => void;
  showToolbar: () => void;
  hideToolbar: () => void;
}

const TextEditorContext = createContext<TextEditorContextType | undefined>(undefined);

export function useTextEditor() {
  const context = useContext(TextEditorContext);
  if (context === undefined) {
    throw new Error('useTextEditor must be used within a TextEditorProvider');
  }
  return context;
}

interface TextEditorProviderProps {
  children: React.ReactNode;
}

export function TextEditorProvider({ children }: TextEditorProviderProps) {
  const [activeEditor, setActiveEditorState] = useState<Editor | null>(null);
  const [isToolbarVisible, setIsToolbarVisible] = useState(false);

  const setActiveEditor = useCallback((editor: Editor | null) => {
    setActiveEditorState(editor);
  }, []);

  const showToolbar = useCallback(() => {
    setIsToolbarVisible(true);
  }, []);

  const hideToolbar = useCallback(() => {
    setIsToolbarVisible(false);
    setActiveEditorState(null);
  }, []);

  const value: TextEditorContextType = {
    activeEditor,
    isToolbarVisible,
    setActiveEditor,
    showToolbar,
    hideToolbar,
  };

  return (
    <TextEditorContext.Provider value={value}>
      {children}
    </TextEditorContext.Provider>
  );
}