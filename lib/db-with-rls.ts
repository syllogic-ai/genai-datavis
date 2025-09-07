<<<<<<< HEAD
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
=======
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
>>>>>>> enhanced_security
  }
}

/**
<<<<<<< HEAD
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
=======
 * Create Supabase client with service role (bypasses RLS)
 * Use this for operations where you handle user permissions manually
 */
export function createServiceRoleClient() {
  return createClient(supabaseUrl, supabaseServiceKey);
>>>>>>> enhanced_security
}

/**
 * Get the current user's ID for use in database queries
 */
export async function getCurrentUserId(): Promise<string | null> {
  try {
    const session = await auth.api.getSession({
<<<<<<< HEAD
      headers: headers(),
=======
      headers: await headers(),
>>>>>>> enhanced_security
    });
    return session?.user?.id || null;
  } catch (error) {
    console.error("Failed to get current user ID:", error);
    return null;
  }
}