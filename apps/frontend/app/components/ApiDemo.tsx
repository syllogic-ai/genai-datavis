'use client';

import { useState, useEffect } from 'react';
import { API_URL, FEATURE_FLAGS } from '../lib/env';

interface ApiResponse {
  message: string;
  endpoints: Array<{
    path: string;
    method: string;
    description: string;
  }>;
}

export default function ApiDemo() {
  const [apiInfo, setApiInfo] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchApiInfo = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const response = await fetch(`${API_URL}/`);
        
        if (!response.ok) {
          throw new Error(`API responded with status ${response.status}`);
        }
        
        const data = await response.json();
        setApiInfo(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error occurred');
        console.error('Error fetching API info:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchApiInfo();
  }, []);

  return (
    <div className="p-4 bg-white shadow rounded-lg">
      <h2 className="text-xl font-bold mb-4">API Connection Demo</h2>
      <p className="mb-2">Connected to: <code className="bg-gray-100 px-2 py-1">{API_URL}</code></p>
      
      {FEATURE_FLAGS.analytics && (
        <p className="mb-2 text-green-600">Analytics feature is enabled</p>
      )}
      
      {loading && <p>Loading API information...</p>}
      
      {error && (
        <div className="p-3 bg-red-100 text-red-700 rounded mb-3">
          Error: {error}
        </div>
      )}
      
      {apiInfo && (
        <div>
          <p className="font-medium">{apiInfo.message}</p>
          <h3 className="font-semibold mt-3 mb-2">Available Endpoints:</h3>
          <ul className="list-disc pl-5">
            {apiInfo.endpoints.map((endpoint, index) => (
              <li key={index}>
                <code className="bg-gray-100 px-1">{endpoint.method} {endpoint.path}</code> - {endpoint.description}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
} 