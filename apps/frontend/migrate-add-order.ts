#!/usr/bin/env tsx

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { sql } from 'drizzle-orm';

// Database connection
const connectionString = process.env.DATABASE_URL!;
const client = postgres(connectionString);
const db = drizzle(client);

async function addOrderColumn() {
  console.log('🔄 Adding order column to widgets table...');
  
  try {
    // Add the order column if it doesn't exist
    await db.execute(sql`
      ALTER TABLE widgets 
      ADD COLUMN IF NOT EXISTS "order" INTEGER;
    `);
    
    console.log('✅ Order column added successfully');
    
    // Update existing widgets to have order based on layout.y or creation time
    console.log('🔄 Populating order values for existing widgets...');
    
    await db.execute(sql`
      UPDATE widgets 
      SET "order" = COALESCE(
        (layout->>'y')::integer, 
        ROW_NUMBER() OVER (PARTITION BY dashboard_id ORDER BY created_at) - 1
      )
      WHERE "order" IS NULL;
    `);
    
    console.log('✅ Order values populated successfully');
    
    // Create index for better performance
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS widgets_dashboard_order_idx 
      ON widgets (dashboard_id, "order");
    `);
    
    console.log('✅ Index created successfully');
    console.log('🎉 Migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await client.end();
  }
}

if (require.main === module) {
  addOrderColumn().catch(console.error);
}

export { addOrderColumn };