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

export default function ProfilePage() {
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
        <h2 className="text-2xl font-bold">Your Profile</h2>
        <p className="text-muted-foreground">
          Manage your account details and preferences
        </p>
      </div>
      
      <div className="grid gap-6">
        <div className="rounded-lg border bg-card p-6 shadow">
          <h3 className="font-semibold">Account Information</h3>
          <div className="mt-4 space-y-4">
            <div>
              <p className="text-sm font-medium">Email</p>
              <p className="text-sm text-muted-foreground">{user?.emailAddresses[0]?.emailAddress}</p>
            </div>
            <div>
              <p className="text-sm font-medium">Name</p>
              <p className="text-sm text-muted-foreground">{user?.firstName} {user?.lastName}</p>
            </div>
            {dbUser && (
              <>
                <div>
                  <p className="text-sm font-medium">Account Created</p>
                  <p className="text-sm text-muted-foreground">{new Date(dbUser.createdAt).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Data Files</p>
                  <p className="text-sm text-muted-foreground">
                    {dbUser.dataFileLink ? "1 file uploaded" : "No files uploaded"}
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 