import postgres from "postgres";
import { config } from "dotenv";
import path from "path";

// Load environment variables
config({ path: path.resolve(process.cwd(), ".env.local") });

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is not set");
}

async function fixJobsRLS() {
  const client = postgres(DATABASE_URL!);

  try {
    console.log("🔧 Fixing RLS policies for jobs table...\n");

    // 1. Drop existing policies
    await client`DROP POLICY IF EXISTS "Users can view their own jobs" ON jobs;`;
    await client`DROP POLICY IF EXISTS "Users can insert their own jobs" ON jobs;`;
    await client`DROP POLICY IF EXISTS "Service role can do everything" ON jobs;`;
    console.log("✅ Dropped existing policies");

    // 2. Since we're using Clerk auth, we'll make jobs readable by anyone
    // but only writable by service role (backend)
    await client`
      CREATE POLICY "Anyone can read jobs" ON jobs
      FOR SELECT
      USING (true);
    `;
    console.log("✅ Created public read policy");

    // 3. Only service role can insert/update/delete
    await client`
      CREATE POLICY "Service role full access" ON jobs
      FOR ALL
      USING (auth.role() = 'service_role')
      WITH CHECK (auth.role() = 'service_role');
    `;
    console.log("✅ Created service role policy");

    // Verify the setup
    const verification = await client`
      SELECT 
        schemaname,
        tablename,
        policyname,
        cmd
      FROM pg_policies
      WHERE tablename = 'jobs'
      ORDER BY policyname;
    `;

    console.log("\n📋 Updated policies:");
    console.table(verification);

    console.log("\n🎉 RLS fix complete!");
    console.log("\nNote: Jobs are now publicly readable (filtered by job ID)");
    console.log("Only the backend (service role) can create/update jobs");

  } catch (error) {
    console.error("❌ Error fixing RLS:", error);
    throw error;
  } finally {
    await client.end();
  }
}

fixJobsRLS().catch(console.error);