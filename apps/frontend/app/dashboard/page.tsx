"use client";

import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { v4 as uuidv4 } from "uuid";
// FilePond + Supabase imports, etc.
import { FilePond, registerPlugin } from 'react-filepond';
import FilePondPluginFileValidateType from 'filepond-plugin-file-validate-type';
import FilePondPluginImagePreview from 'filepond-plugin-image-preview';
import 'filepond/dist/filepond.min.css';
import 'filepond-plugin-image-preview/dist/filepond-plugin-image-preview.css';

import { uploadFileToSupabase } from "@/app/lib/supabase";
import { createChat, createFile } from "@/app/lib/actions";
import { SiteHeader } from "@/components/dashboard/SiteHeader";
registerPlugin(FilePondPluginFileValidateType);
registerPlugin(FilePondPluginImagePreview);

export default function DashboardPage() {
  const router = useRouter();
  const { user, isLoaded, isSignedIn } = useUser();

  const [error, setError] = useState<string | null>(null);

  // Early returns if user not loaded / not signed in
  if (!isLoaded) {
    return <div>Loading...</div>;
  }
  if (!isSignedIn) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <h1 className="text-2xl font-semibold mb-6 text-center">Please sign in to upload files</h1>
      </div>
    );
  }

  const userId = user?.id;

  // Handle file upload
  const handleFileUpload = async (fileItems: any[]) => {
    if (!fileItems.length) return;

    try {
      const fileBlob = fileItems[0].file as File;
      // Upload to Supabase
      const url = await uploadFileToSupabase(fileBlob);

      // Generate IDs
      const fileId = uuidv4();
      const chatId = uuidv4();

      // Create file + chat records in your DB
      await Promise.all([
        createFile(fileId, "original", fileBlob.name, url, userId),
        createChat(chatId, userId, fileId)
      ]);

      // Navigate to the new chat page
      router.push(`/dashboard/c/${chatId}`);

    } catch (err) {
      setError(err instanceof Error ? err.message : "Error uploading file");
      console.error("Error uploading file:", err);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden text-black">
      <SiteHeader />
      <div className="flex-1 overflow-auto">
        <div className="flex flex-col justify-center items-center h-full">
          <h1 className="text-2xl font-semibold mb-6 text-center">
            What data would you like to analyze?
          </h1>
          <div className="w-full max-w-lg">
            <FilePond
              allowMultiple={false}
              maxFiles={1}
              acceptedFileTypes={['.csv', 'text/csv']}
              labelIdle='Drag & Drop your CSV file or <span class="filepond--label-action">Browse</span>'
              onupdatefiles={handleFileUpload}
              credits={false}
              className="filepond-container"
            />

            {error && (
              <div className="mt-4 p-3 bg-red-100 text-red-700 rounded">
                {error}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
