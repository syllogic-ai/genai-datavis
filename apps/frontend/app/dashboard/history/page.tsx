"use client";

import { useUser } from "@clerk/nextjs";
import { redirect } from "next/navigation";
import { useEffect, useState } from "react";

// Define the user data type
type DbUser = {
  id: string;
  email: string;
  createdAt: string;
  updatedAt: string;
  chatHistory: Array<{ role: string; message: string; timestamp: string }>;
  analysisResults: any[];
  dataFileLink: string | null;
};

export default function HistoryPage() {
  const { user, isLoaded } = useUser();
  const [dbUser, setDbUser] = useState<DbUser | null>(null);
  
  // Redirect if the user is not authenticated
  useEffect(() => {
    if (isLoaded && !user) {
      redirect("/sign-in");
    }
    
    // If user is authenticated, fetch user data from our database
    if (isLoaded && user) {
      fetchUserData(user.id);
    }
  }, [isLoaded, user]);
  
  const fetchUserData = async (userId: string) => {
    try {
      // Fetch user data from API endpoint
      const response = await fetch(`/api/user?userId=${userId}`);
      const data = await response.json();
      if (response.ok) {
        setDbUser(data);
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
    }
  };

  if (!isLoaded) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold">Chat History</h2>
        <p className="text-muted-foreground">
          View your previous conversations and analysis
        </p>
      </div>
      
      {dbUser?.chatHistory && dbUser.chatHistory.length > 0 ? (
        <div className="rounded-lg border bg-card shadow">
          <div className="p-6">
            <div className="space-y-6">
              {dbUser.chatHistory.map((chat, index) => (
                <div key={index} className="rounded-lg bg-muted p-4">
                  <div className="flex items-center gap-2">
                    <span className={`font-medium ${
                      chat.role === 'user' ? 'text-blue-600' : 'text-green-600'
                    }`}>
                      {chat.role === 'user' ? 'You' : 'AI Assistant'}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(chat.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <p className="mt-2 text-sm">{chat.message}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border bg-card p-6 shadow text-center">
          <p className="text-muted-foreground">No chat history yet.</p>
          <p className="text-sm text-muted-foreground mt-2">
            Start a conversation in the chart generator to see your history here.
          </p>
        </div>
      )}
    </div>
  );
} 