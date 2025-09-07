"use client";

import { motion } from "motion/react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { EnhancedFileManager, type ExistingFile } from "@/components/enhanced-file-manager";
import { FileRecord } from "../hooks/useSetupState";

interface SetupPhaseProps {
  dashboardId: string;
  files: FileRecord[];
  onFileAdded: (file: FileRecord) => void;
  onFileRemoved: (fileId: string) => void;
  onContinue: () => void;
  isLoading?: boolean;
  onRefreshFiles?: () => void;
  isUpdatingMode?: boolean; // True when updating sources from existing dashboard
}

export function SetupPhase({
  dashboardId,
  files,
  onFileAdded,
  onFileRemoved,
  onContinue,
  isLoading = false,
  onRefreshFiles,
  isUpdatingMode = false,
}: SetupPhaseProps) {
  // Debug logging
  React.useEffect(() => {
    console.log('[SetupPhase] Files prop updated:', files);
  }, [files]);

  // Convert FileRecord to ExistingFile format
  const existingFiles: ExistingFile[] = files.map(file => ({
    id: file.id,
    name: file.name,
    size: file.size,
    type: file.type,
    storagePath: file.storagePath,
    uploadedAt: file.uploadedAt,
    status: 'ready'
  }));

  const handleFileAdded = (file: ExistingFile) => {
    onFileAdded({
      id: file.id,
      name: file.name,
      size: file.size,
      type: file.type,
      storagePath: file.storagePath,
      uploadedAt: file.uploadedAt,
    });
  };

  return (
    <div className="min-h-[calc(100vh-1rem)] flex items-center justify-center p-6 bg-transparent">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-4xl mx-auto"
      >
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            {isUpdatingMode ? "Manage Data Sources" : "Connect Your Data Sources"}
          </h1>
          <p className="text-lg text-muted-foreground">
            {isUpdatingMode 
              ? "Add, remove, or update your data sources" 
              : "Upload your files to get started with data analysis"}
          </p>
        </div>

        {/* Enhanced File Manager */}
        <EnhancedFileManager
          dashboardId={dashboardId}
          existingFiles={existingFiles}
          onFileAdded={handleFileAdded}
          onFileRemoved={onFileRemoved}
          onRefreshFiles={onRefreshFiles}
          maxFiles={10}
        />

        {/* Continue Button */}
        <motion.div 
          className="flex flex-col items-center mt-8"
          initial={{ opacity: 0.5 }}
          animate={{ opacity: files.length > 0 ? 1 : 0.5 }}
        >
        
          <Button
            onClick={onContinue}
            disabled={!isUpdatingMode && files.length === 0}
            size="lg"
            className={`px-8 py-3 text-base font-medium transition-all ${
              (isUpdatingMode || files.length > 0)
                ? 'bg-primary hover:bg-primary/90  shadow-lg hover:shadow-xl'
                : 'cursor-not-allowed'
            }`}
          >
            {isUpdatingMode ? "Back to Dashboard" : "Continue to Dashboard"}
          </Button>
        </motion.div>
      </motion.div>
    </div>
  );
}