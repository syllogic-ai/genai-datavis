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
  const [isProcessing, setIsProcessing] = useState(false);

  // Handle file upload
  const handleFileUpload = async (fileItems: any[]) => {
    if (!fileItems.length || !isSignedIn || !user?.id) {
      setError("You must be signed in to upload files");
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // Check if user exists in DB first
      const userResponse = await fetch(`/api/user?userId=${user.id}`);
      
      // If user not found in DB, create them
      if (userResponse.status === 404) {
        const createUserResponse = await fetch('/api/user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.id,
            email: user.primaryEmailAddress?.emailAddress || '',
          }),
        });
        
        if (!createUserResponse.ok) {
          throw new Error('Failed to create user in database');
        }
      } else if (!userResponse.ok && userResponse.status !== 404) {
        throw new Error('Error checking user in database');
      }

      const fileBlob = fileItems[0].file as File;
      
      // Upload to Supabase
      const url = await uploadFileToSupabase(fileBlob);

      // Generate IDs
      const fileId = uuidv4();
      const chatId = uuidv4();

      // Create file + chat records in your DB
      await Promise.all([
        createFile(fileId, "original", fileBlob.name, url, user.id),
        createChat(chatId, user.id, fileId)
      ]);

      // Navigate to the new chat page
      router.push(`/dashboard/c/${chatId}`);

    } catch (err) {
      setError(err instanceof Error ? err.message : "Error uploading file");
      console.error("Error uploading file:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden text-black">
      <SiteHeader />
      <div className="flex-1 overflow-auto">
        <div className="flex flex-col justify-center items-center h-full px-4">
          <h1 className="text-2xl font-semibold mb-6 text-center">
            What data would you like to analyze?
          </h1>
          <div className="w-full max-w-2xl">
            {!isLoaded ? (
              <div className="text-center p-4">Loading...</div>
            ) : !isSignedIn ? (
              <div className="text-center p-4">You need to sign in to upload files</div>
            ) : (
              <FilePond
                allowMultiple={false}
                maxFiles={1}
                acceptedFileTypes={['.csv', 'text/csv']}
                labelIdle='Drag & Drop your CSV file or <span class="filepond--label-action">Browse</span>'
                onupdatefiles={handleFileUpload}
                credits={false}
                className="filepond-container"
                disabled={isProcessing}
              />
            )}

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
