import { createClient } from '@supabase/supabase-js';
import { auth } from "./auth";
import { headers } from "next/headers";
import db from "@/db";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

/**
 * Execute a database operation with user validation
 * Uses service role to bypass RLS but validates user permissions in application layer
 */
export async function withRLS<T>(
  operation: (db: any) => Promise<T>
): Promise<T> {
  try {
    // Get the session from Better Auth to validate user
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      throw new Error("Unauthorized: No valid session found");
    }

    // Use the existing Drizzle db connection
    // User validation is handled in the operation itself
    return await operation(db);
  } catch (error) {
    console.error("Failed to execute operation with user validation:", error);
    throw error;
  }
}

/**
 * Create Supabase client with service role (bypasses RLS)
 * Use this for operations where you handle user permissions manually
 */
export function createServiceRoleClient() {
  return createClient(supabaseUrl, supabaseServiceKey);
}

/**
 * Get the current user's ID for use in database queries
 */
export async function getCurrentUserId(): Promise<string | null> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    return session?.user?.id || null;
  } catch (error) {
    console.error("Failed to get current user ID:", error);
    return null;
  }
}