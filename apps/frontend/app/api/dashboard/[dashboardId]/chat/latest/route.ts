import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabase } from "@/app/lib/supabase";

// GET /api/dashboard/[dashboardId]/chat/latest - Get the latest chat for a dashboard
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ dashboardId: string }> }
) {
  try {
    const { userId } = await auth();
    const { dashboardId } = await params;
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Add timeout and retry logic for Supabase calls
    const TIMEOUT_MS = 10000; // 10 seconds
    const MAX_RETRIES = 2;
    
    let lastError;
    
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        // Create an AbortController for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
        
        // Find the most recent chat for this dashboard and user
        const { data: existingChats, error: fetchError } = await supabase
          .from('chats')
          .select('id')
          .eq('dashboard_id', dashboardId)
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(1)
          .abortSignal(controller.signal);

        clearTimeout(timeoutId);

        if (fetchError) {
          throw new Error(`Supabase error: ${fetchError.message}`);
        }

        const chat = existingChats && existingChats.length > 0 ? existingChats[0] : null;
        return NextResponse.json({ chat });
        
      } catch (error: any) {
        lastError = error;
        console.error(`Chat fetch attempt ${attempt + 1} failed:`, error.message);
        
        // If it's the last attempt, don't retry
        if (attempt === MAX_RETRIES - 1) break;
        
        // Wait before retrying (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }

    // If all retries failed
    console.error("All chat fetch attempts failed. Last error:", lastError);
    return NextResponse.json(
      { 
        error: "Database connection timeout", 
        details: "Unable to connect to database. Please try again later." 
      },
      { status: 503 }
    );

  } catch (error) {
    console.error("Error in chat/latest API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}