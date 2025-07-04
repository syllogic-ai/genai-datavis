import { sql } from 'drizzle-orm';
import db from '@/db';

async function removeForeignKeyConstraints() {
  console.log('🗄️ Starting foreign key constraint removal...\n');
  
  try {
    // 1. Drop foreign key constraint from jobs table (dashboard_id)
    console.log('1. Dropping foreign key constraint from jobs table...');
    await db.execute(sql`ALTER TABLE "jobs" DROP CONSTRAINT IF EXISTS "jobs_dashboard_id_dashboards_id_fk"`);
    console.log('✅ Jobs table foreign key constraint dropped\n');

    // 2. Drop foreign key constraint from llm_usage table (chat_id)  
    console.log('2. Dropping foreign key constraint from llm_usage table...');
    await db.execute(sql`ALTER TABLE "llm_usage" DROP CONSTRAINT IF EXISTS "llm_usage_chat_id_chats_id_fk"`);
    console.log('✅ LLM usage table foreign key constraint dropped\n');

    // 3. Add new columns to llm_usage table for better analytics
    console.log('3. Adding new columns to llm_usage table...');
    await db.execute(sql`ALTER TABLE "llm_usage" ADD COLUMN IF NOT EXISTS "request_id" text`);
    await db.execute(sql`ALTER TABLE "llm_usage" ADD COLUMN IF NOT EXISTS "dashboard_id" text`);
    console.log('✅ New columns added to llm_usage table\n');

    // 4. Create indexes for better query performance on text fields
    console.log('4. Creating indexes for better query performance...');
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "idx_jobs_dashboard_id" ON "jobs" ("dashboard_id")`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "idx_llm_usage_chat_id" ON "llm_usage" ("chat_id")`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "idx_llm_usage_request_id" ON "llm_usage" ("request_id")`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "idx_llm_usage_dashboard_id" ON "llm_usage" ("dashboard_id")`);
    console.log('✅ Indexes created\n');

    // 5. Update existing llm_usage records to populate dashboard_id from associated chats
    console.log('5. Updating existing llm_usage records with dashboard_id...');
    const result = await db.execute(sql`
      UPDATE "llm_usage" 
      SET "dashboard_id" = (
        SELECT c."dashboard_id" 
        FROM "chats" c 
        WHERE c."id" = "llm_usage"."chat_id"
      )
      WHERE "llm_usage"."dashboard_id" IS NULL 
        AND "llm_usage"."chat_id" IS NOT NULL
    `);
    console.log('✅ Existing llm_usage records updated\n');

    console.log('🎉 Foreign key constraint removal completed successfully!');
    console.log('📊 Jobs and LLM usage records will now be preserved for analytics when dashboards are deleted.');
    
  } catch (error) {
    console.error('❌ Error removing foreign key constraints:', error);
    throw error;
  }
}

// Run the script
removeForeignKeyConstraints()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });