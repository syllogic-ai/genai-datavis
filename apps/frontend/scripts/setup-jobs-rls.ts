import postgres from "postgres";
import { config } from "dotenv";
import path from "path";

// Load environment variables
config({ path: path.resolve(process.cwd(), ".env.local") });

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is not set");
}

async function setupJobsRLS() {
  const client = postgres(DATABASE_URL);

  try {
    console.log("🔒 Setting up RLS for jobs table...\n");

    // 1. Enable RLS on the jobs table
    await client`ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;`;
    console.log("✅ RLS enabled on jobs table");

    // 2. Drop existing policies if any
    await client`DROP POLICY IF EXISTS "Users can view their own jobs" ON jobs;`;
    await client`DROP POLICY IF EXISTS "Users can insert their own jobs" ON jobs;`;
    await client`DROP POLICY IF EXISTS "Service role can do everything" ON jobs;`;
    console.log("✅ Cleaned up existing policies");

    // 3. Create policy for users to view their own jobs
    await client`
      CREATE POLICY "Users can view their own jobs" ON jobs
      FOR SELECT
      USING (auth.uid()::text = user_id);
    `;
    console.log("✅ Created SELECT policy for users");

    // 4. Create policy for users to insert their own jobs
    await client`
      CREATE POLICY "Users can insert their own jobs" ON jobs
      FOR INSERT
      WITH CHECK (auth.uid()::text = user_id);
    `;
    console.log("✅ Created INSERT policy for users");

    // 5. Create policy for service role to do everything
    await client`
      CREATE POLICY "Service role can do everything" ON jobs
      FOR ALL
      USING (auth.role() = 'service_role')
      WITH CHECK (auth.role() = 'service_role');
    `;
    console.log("✅ Created service role policy");

    // 6. Grant necessary permissions
    await client`GRANT ALL ON jobs TO authenticated;`;
    await client`GRANT ALL ON jobs TO service_role;`;
    console.log("✅ Granted permissions to roles");

    // 7. Also ensure the jobs table is accessible via the API
    await client`GRANT USAGE ON SCHEMA public TO anon, authenticated;`;
    await client`GRANT SELECT ON jobs TO anon, authenticated;`;
    console.log("✅ Granted API access permissions");

    console.log("\n🎉 RLS setup complete for jobs table!");
    console.log("\nPolicies created:");
    console.log("- Users can view their own jobs");
    console.log("- Users can insert their own jobs");
    console.log("- Service role has full access");

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

    console.log("\n📋 Verification - Active policies:");
    console.table(verification);

  } catch (error) {
    console.error("❌ Error setting up RLS:", error);
    throw error;
  } finally {
    await client.end();
  }
}

setupJobsRLS().catch(console.error);