"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { API_URL } from "./lib/env";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";

// Define form schema
const formSchema = z.object({
  message: z.string().min(1, {
    message: "Please enter a message.",
  }),
});

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [chatResponse, setChatResponse] = useState<string | null>(null);
  const [isChatLoading, setIsChatLoading] = useState(false);

  // Initialize form
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      message: "",
    },
  });

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

  const analyzeData = async () => {
    if (!file) return;

    setAnalyzing(true);
    setError(null);
    setAnalysisResult(null);

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

    setIsChatLoading(true);
    setChatResponse(null);

    // If we don't have analysis results yet, run the analysis first
    if (!analysisResult) {
      await analyzeData();
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
        throw new Error(`Chat request failed with status ${response.status}`);
      }

      const result = await response.json();
      setChatResponse(result.response);

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
    <div className="flex justify-center items-center min-h-screen bg-white p-4 text-black">
      <div className="w-full max-w-lg">
        <div className="mb-8 w-full">
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

          {/* Chat prompt feature */}
          <div className="mt-6">
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="relative rounded-xl border border-gray-300/20 overflow-hidden">
                <Textarea
                  {...form.register("message")}
                  placeholder="Ask a question about your data..."
                  className="min-h-24 py-4 pb-14 resize-none rounded-xl"
                  disabled={!file || analyzing || isChatLoading}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      const content = form.getValues('message');
                      if (content.trim() && !(!file || analyzing || isChatLoading)) {
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
                    disabled={!file || analyzing || isChatLoading}
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

            {chatResponse && (
              <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h3 className="text-lg font-medium mb-2">Response:</h3>
                <p className="whitespace-pre-line">{chatResponse}</p>
              </div>
            )}
          </div>
        </div>

        {analysisResult && (
          <div className="mt-8 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h2 className="text-xl font-bold mb-4">Analysis Results</h2>
            <pre className="bg-gray-100 p-4 rounded overflow-auto max-h-96">
              {JSON.stringify(analysisResult, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
