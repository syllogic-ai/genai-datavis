"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { API_URL } from "./lib/env";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Box } from "lucide-react";

// Define form schema
const formSchema = z.object({
  message: z.string().min(1, {
    message: "Please enter a message.",
  }),
});

// Type for chat message
type ChatMessage = {
  role: 'user' | 'system';
  content: string;
};

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [showDropzone, setShowDropzone] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [showJson, setShowJson] = useState(true);

  // Initialize form
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      message: "",
    },
  });

  // Scroll to bottom when messages change
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const selectedFile = acceptedFiles[0];

      // Check if the file is a CSV
      if (
        selectedFile.type === "text/csv" ||
        selectedFile.name.endsWith(".csv")
      ) {
        setFile(selectedFile);
        setUploadSuccess(true);
        setError(null);
      } else {
        setError("Please upload a CSV file");
        setFile(null);
        setUploadSuccess(false);
      }
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "text/csv": [".csv"],
    },
    maxFiles: 1,
  });

  const analyzeData = async (values: {message: string}) => {
    if (!file) return;

    setAnalyzing(true);
    setError(null);

    try {
      // Read the file content
      const fileContent = await file.text();

      // Parse CSV into array of objects
      const lines = fileContent.split("\n");
      const headers = lines[0].split(",");
      const dataArray = [];

      // Start from index 1 to skip the header row
      for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim()) {
          // Skip empty lines
          const values = lines[i].split(",");
          const rowObject: Record<string, string> = {};

          headers.forEach((header, index) => {
            rowObject[header.trim()] = values[index]?.trim() || "";
          });

          dataArray.push(rowObject);
        }
      }

      // Send the parsed data as JSON
      const response = await fetch(`${API_URL}/analyze`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          data: dataArray,
          prompt: values.message,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.detail
            ? JSON.stringify(errorData.detail)
            : `Analysis failed with status ${response.status}`
        );
      }

      const result = await response.json();
      setAnalysisResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error analyzing file");
      console.error("Error analyzing file:", err);
    } finally {
      setAnalyzing(false);
    }
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!file) return;

    // Hide dropzone after sending first message
    setShowDropzone(false);
    
    setIsChatLoading(true);
    
    // Add user message to chat
    const userMessage: ChatMessage = {
      role: 'user',
      content: values.message
    };
    setMessages(prev => [...prev, userMessage]);

    // If we don't have analysis results yet, run the analysis first
    if (!analysisResult) {
      await analyzeData(values);
    }

    try {
      const response = await fetch(`${API_URL}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: values.message,
          data: analysisResult,
        }),
      });

      if (!response.ok) {
        try {
          const errorData = await response.json();
          throw new Error(
            errorData.detail
              ? JSON.stringify(errorData.detail)
              : `Chat request failed with status ${response.status}`
          );
        } catch (jsonError) {
          throw new Error(`Chat request failed with status ${response.status}`);
        }
      }

      const result = await response.json();
      
      // Add system response to chat
      const systemMessage: ChatMessage = {
        role: 'system',
        content: result.response
      };
      setMessages(prev => [...prev, systemMessage]);

      // Reset the form
      form.reset({ message: "" });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error processing chat request"
      );
      console.error("Chat error:", err);
    } finally {
      setIsChatLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-white text-black">
      <div className="flex-1 overflow-hidden">
        {showDropzone && (
          <div className="flex flex-col justify-center items-center h-full">
            <h1 className="text-2xl font-semibold mb-6 text-center">What data would you like to analyze?</h1>
            <div className="w-full max-w-lg">
              <div
                {...getRootProps()}
                className={`p-8 border-2 border-dashed rounded-lg text-center cursor-pointer transition-colors ${
                  isDragActive
                    ? "border-gray-500 bg-blue-50"
                    : "border-gray-300 hover:border-blue-400"
                } ${uploadSuccess ? "border-green-500/10 bg-green-50/30" : ""}`}
              >
                <input {...getInputProps()} />
                {isDragActive ? (
                  <p className="text-blue-500">Drop the CSV file here...</p>
                ) : (
                  <div>
                    <p className="mb-2">
                      Drag and drop a CSV file here, or click to select a file
                    </p>
                    <p className="text-sm text-gray-500">
                      Only CSV files are accepted
                    </p>
                  </div>
                )}

                {file && uploadSuccess && (
                  <div className="mt-4 p-2 bg-green-100/30 rounded">
                    <p className="text-green-700/60">
                      File uploaded successfully: {file.name} (
                      {(file.size / 1024).toFixed(2)} KB)
                    </p>
                  </div>
                )}
              </div>

              {error && (
                <div className="mt-4 p-3 bg-red-100 text-red-700 rounded">
                  {error}
                </div>
              )}
            </div>
          </div>
        )}
        
        <div className="p-4 flex flex-col md:flex-row gap-4 justify-center">
          {/* Chat messages */}
          {messages.length > 0 && (
            <div className="w-full md:w-1/2 max-w-2xl">
              <ScrollArea ref={scrollAreaRef} className="h-[calc(100vh-180px)] rounded-lg pr-4">
                <div className="space-y-4 p-4">
                  {messages.map((message, index) => (
                    <div
                      key={index}
                      className={`p-4 rounded-lg ${
                        message.role === 'user'
                          ? 'bg-blue-100 ml-12'
                          : 'bg-gray-100 mr-12'
                      }`}
                    >
                      <p className="whitespace-pre-line">{message.content}</p>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Analysis Results JSON */}
          {analysisResult && (
            <div className={`w-full ${messages.length > 0 ? 'md:w-1/2' : ''} max-w-2xl`}>
              <div className="rounded-lg border border-gray-200 overflow-hidden">
                <div className="bg-gray-50 p-3 border-b border-gray-200 flex justify-between items-center">
                  <h2 className="text-lg font-medium">Analysis Results</h2>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowJson(!showJson)}
                  >
                    {showJson ? 'Hide' : 'Show'}
                  </Button>
                </div>
                {showJson && (
                  <div className="bg-white">
                    <ScrollArea className="h-[calc(100vh-230px)]">
                      <pre className="p-4 text-sm overflow-auto">
                        {JSON.stringify(analysisResult, null, 2)}
                      </pre>
                    </ScrollArea>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="p-4 flex justify-center">
            <div className="w-full max-w-2xl">
              <div className="p-3 bg-red-100 text-red-700 rounded">
                {error}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Fixed chat input at the bottom */}
      {file && (
        <div className="p-4 border-t border-gray-200 bg-white">
          <div className="max-w-2xl mx-auto">
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="relative rounded-xl border border-gray-300/20 overflow-hidden">
                <Textarea
                  {...form.register("message")}
                  placeholder="Ask a question about your data..."
                  className="min-h-24 py-4 pb-14 resize-none rounded-xl"
                  disabled={analyzing || isChatLoading}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      const content = form.getValues('message');
                      if (content.trim() && !(analyzing || isChatLoading)) {
                        e.preventDefault();
                        form.handleSubmit(onSubmit)();
                      }
                    }
                  }}
                />
                <div className="absolute bottom-3 right-3">
                  <Button
                    type="submit"
                    size="icon"
                    className="rounded-full group"
                    disabled={analyzing || isChatLoading}
                  >
                    {isChatLoading ? (
                      <span className="mx-1">...</span>
                    ) : (
                      <span className="">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={2.5}
                          stroke="currentColor"
                          className="size-4 group-hover:translate-x-0.5 transition-all duration-300"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3"
                          />
                        </svg>
                      </span>
                    )}
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
