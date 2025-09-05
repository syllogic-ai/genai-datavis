import { sql } from "drizzle-orm";
import db from "@/db";
import { auth } from "./auth";
import { headers } from "next/headers";

/**
 * Creates a database client with RLS context for the current user
 * This sets up the proper PostgreSQL variables that Supabase RLS policies expect
 */
export async function createRLSContext() {
  try {
    // Get the session from Better Auth
    const session = await auth.api.getSession({
      headers: headers(),
    });

    if (!session?.user?.id) {
      // No authenticated user - return db without RLS context
      return db;
    }

    // Set the auth context for RLS policies
    await db.execute(sql`
      SELECT set_config('request.jwt.claim.sub', ${session.user.id}, TRUE);
      SELECT set_config('role', 'authenticated', TRUE);
    `);

    return db;
  } catch (error) {
    console.error("Failed to create RLS context:", error);
    // Return regular db if RLS setup fails
    return db;
  }
}

/**
 * Execute a database query with proper RLS context
 * Use this function for all user-scoped database operations
 */
export async function withRLS<T>(
  operation: (db: typeof db) => Promise<T>
): Promise<T> {
  const dbWithRLS = await createRLSContext();
  
  try {
    return await operation(dbWithRLS);
  } finally {
    // Clean up the auth context
    try {
      await dbWithRLS.execute(sql`
        SELECT set_config('request.jwt.claim.sub', NULL, TRUE);
        SELECT set_config('role', 'anon', TRUE);
      `);
    } catch (error) {
      console.error("Failed to cleanup RLS context:", error);
    }
  }
}

/**
 * Get the current user's ID for use in database queries
 */
export async function getCurrentUserId(): Promise<string | null> {
  try {
    const session = await auth.api.getSession({
      headers: headers(),
    });
    return session?.user?.id || null;
  } catch (error) {
    console.error("Failed to get current user ID:", error);
    return null;
  }
}