"use client";

import { useTextEditor } from "./TextEditorContext";
import { SimpleEditorToolbar } from "@/components/tiptap/SimpleEditorToolbar";

export function DashboardToolbar() {
  const { activeEditor, isToolbarVisible } = useTextEditor();

  return (
    <SimpleEditorToolbar 
      editor={activeEditor} 
      isVisible={isToolbarVisible} 
    />
  );
}