"use client";

import { useTextEditor } from "./TextEditorContext";
import { SimpleEditorToolbar } from "@/components/tiptap/SimpleEditorToolbar";

export function DashboardToolbar() {
  const { activeEditor } = useTextEditor();

  return (
    <SimpleEditorToolbar 
      editor={activeEditor} 
      isVisible={true} // Always visible
    />
  );
}