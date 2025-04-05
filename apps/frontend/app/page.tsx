'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { API_URL } from './lib/env';

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const selectedFile = acceptedFiles[0];
      
      // Check if the file is a CSV
      if (selectedFile.type === 'text/csv' || selectedFile.name.endsWith('.csv')) {
        setFile(selectedFile);
        setUploadSuccess(true);
        setError(null);
      } else {
        setError('Please upload a CSV file');
        setFile(null);
        setUploadSuccess(false);
      }
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv']
    },
    maxFiles: 1
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
      const lines = fileContent.split('\n');
      const headers = lines[0].split(',');
      const dataArray = [];
      
      // Start from index 1 to skip the header row
      for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim()) {  // Skip empty lines
          const values = lines[i].split(',');
          const rowObject: Record<string, string> = {};
          
          headers.forEach((header, index) => {
            rowObject[header.trim()] = values[index]?.trim() || '';
          });
          
          dataArray.push(rowObject);
        }
      }
      
      // Send the parsed data as JSON
      const response = await fetch(`${API_URL}/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: dataArray
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail ? JSON.stringify(errorData.detail) : `Analysis failed with status ${response.status}`);
      }

      const result = await response.json();
      setAnalysisResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error analyzing file');
      console.error('Error analyzing file:', err);
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-white p-4 text-black">
      <div className="w-full max-w-lg">
        <div className="mb-8 w-full">
          <div 
            {...getRootProps()} 
            className={`p-8 border-2 border-dashed rounded-lg text-center cursor-pointer transition-colors ${
              isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400'
            } ${uploadSuccess ? 'border-green-500 bg-green-50' : ''}`}
          >
            <input {...getInputProps()} />
            {isDragActive ? (
              <p className="text-blue-500">Drop the CSV file here...</p>
            ) : (
              <div>
                <p className="mb-2">Drag and drop a CSV file here, or click to select a file</p>
                <p className="text-sm text-gray-500">Only CSV files are accepted</p>
              </div>
            )}
            
            {file && uploadSuccess && (
              <div className="mt-4 p-2 bg-green-100 rounded">
                <p className="text-green-700">
                  File uploaded successfully: {file.name} ({(file.size / 1024).toFixed(2)} KB)
                </p>
              </div>
            )}
          </div>

          {error && (
            <div className="mt-4 p-3 bg-red-100 text-red-700 rounded">
              {error}
            </div>
          )}

          <div className="mt-6">
            <button
              onClick={analyzeData}
              disabled={!file || analyzing}
              className={`w-full py-2 px-4 rounded font-medium ${
                !file || analyzing
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-500 text-white hover:bg-blue-600'
              }`}
            >
              {analyzing ? 'Analyzing...' : 'Analyze Data'}
            </button>
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
