import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { config } from "dotenv";
import path from "path";

// Load environment variables
config({ path: path.resolve(process.cwd(), ".env.local") });

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is not set");
}

async function checkJobsTable() {
  const client = postgres(DATABASE_URL!);

  try {
    // Check if jobs table exists and get its structure
    const tableStructure = await client`
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_schema = 'public' 
      AND table_name = 'jobs'
      ORDER BY ordinal_position;
    `;

    if (tableStructure.length === 0) {
      console.log("❌ Jobs table does not exist!");
      return;
    }

    console.log("✅ Jobs table structure:");
    console.table(tableStructure);

    // Check if there are any jobs
    const jobCount = await client`
      SELECT COUNT(*) as count FROM jobs;
    `;
    console.log(`\n📊 Total jobs in table: ${jobCount[0].count}`);

    // Get recent jobs
    const recentJobs = await client`
      SELECT 
        id,
        user_id,
        dashboard_id,
        status,
        progress,
        created_at
      FROM jobs
      ORDER BY created_at DESC
      LIMIT 5;
    `;

    if (recentJobs.length > 0) {
      console.log("\n🔍 Recent jobs:");
      console.table(recentJobs);
    } else {
      console.log("\n📭 No jobs found in the table");
    }

    // Check for RLS policies
    const rlsPolicies = await client`
      SELECT 
        policyname,
        cmd,
        qual,
        with_check
      FROM pg_policies
      WHERE tablename = 'jobs'
      AND schemaname = 'public';
    `;

    if (rlsPolicies.length > 0) {
      console.log("\n🔒 RLS Policies on jobs table:");
      console.table(rlsPolicies);
    } else {
      console.log("\n⚠️  No RLS policies found on jobs table");
    }

    // Check if RLS is enabled
    const rlsEnabled = await client`
      SELECT relrowsecurity 
      FROM pg_class 
      WHERE relname = 'jobs' 
      AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
    `;

    console.log(`\n🔐 RLS Enabled: ${rlsEnabled[0]?.relrowsecurity || false}`);

  } catch (error) {
    console.error("❌ Error checking jobs table:", error);
  } finally {
    await client.end();
  }
}

checkJobsTable().catch(console.error);