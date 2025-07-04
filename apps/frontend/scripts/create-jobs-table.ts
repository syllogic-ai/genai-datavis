import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { config } from "dotenv";
import path from "path";

// Load environment variables from .env.local
config({ path: path.resolve(process.cwd(), ".env.local") });

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is not set");
}

async function createJobsTable() {
  const client = postgres(DATABASE_URL!);
  const db = drizzle(client);

  try {
    // Check if jobs table exists
    const checkTableQuery = `
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'jobs'
      );
    `;

    const tableExists = await client.unsafe(checkTableQuery);
    
    if (tableExists[0].exists) {
      console.log("✅ Jobs table already exists");
      await client.end();
      return;
    }

    console.log("📦 Creating jobs table...");

    // Create the jobs table
    const createTableQuery = `
      CREATE TABLE "jobs" (
        "id" text PRIMARY KEY NOT NULL,
        "user_id" text NOT NULL,
        "dashboard_id" text NOT NULL,
        "chat_id" text,
        "status" text DEFAULT 'pending' NOT NULL,
        "progress" integer DEFAULT 0,
        "request_id" text NOT NULL,
        "message" text NOT NULL,
        "context_widget_ids" jsonb,
        "target_widget_type" text,
        "result" jsonb,
        "error" text,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "started_at" timestamp,
        "completed_at" timestamp,
        "processing_time_ms" integer,
        "queue_time_ms" integer
      );
    `;

    await client.unsafe(createTableQuery);
    console.log("✅ Jobs table created");

    // Add foreign key constraints
    const addConstraintsQuery = `
      ALTER TABLE "jobs" ADD CONSTRAINT "jobs_user_id_users_id_fk" 
        FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
      
      ALTER TABLE "jobs" ADD CONSTRAINT "jobs_dashboard_id_dashboards_id_fk" 
        FOREIGN KEY ("dashboard_id") REFERENCES "public"."dashboards"("id") ON DELETE cascade ON UPDATE no action;
      
      ALTER TABLE "jobs" ADD CONSTRAINT "jobs_chat_id_chats_id_fk" 
        FOREIGN KEY ("chat_id") REFERENCES "public"."chats"("id") ON DELETE no action ON UPDATE no action;
    `;

    await client.unsafe(addConstraintsQuery);
    console.log("✅ Foreign key constraints added");

    // Create indexes for better query performance
    const createIndexesQuery = `
      CREATE INDEX IF NOT EXISTS "idx_jobs_user_id" ON "jobs" ("user_id");
      CREATE INDEX IF NOT EXISTS "idx_jobs_dashboard_id" ON "jobs" ("dashboard_id");
      CREATE INDEX IF NOT EXISTS "idx_jobs_status" ON "jobs" ("status");
      CREATE INDEX IF NOT EXISTS "idx_jobs_created_at" ON "jobs" ("created_at");
    `;

    await client.unsafe(createIndexesQuery);
    console.log("✅ Indexes created");

    console.log("🎉 Jobs table setup complete!");

  } catch (error) {
    console.error("❌ Error creating jobs table:", error);
    throw error;
  } finally {
    await client.end();
  }
}

// Run the script
createJobsTable().catch(console.error);