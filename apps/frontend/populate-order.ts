#!/usr/bin/env tsx

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { sql } from 'drizzle-orm';
import 'dotenv/config';
import { config } from "dotenv";

// Load .env.local manually
config({ path: ".env.local" });

// Database connection
const connectionString = process.env.DATABASE_URL!;
const client = postgres(connectionString);
const db = drizzle(client);

async function populateOrderColumn() {
  console.log('🔄 Populating order column for existing widgets...');
  
  try {
    // Update existing widgets to have order based on layout.y or creation time
    await db.execute(sql`
      WITH widget_orders AS (
        SELECT 
          id,
          COALESCE(
            (layout->>'y')::integer, 
            ROW_NUMBER() OVER (PARTITION BY dashboard_id ORDER BY created_at) - 1
          ) as new_order
        FROM widgets 
        WHERE "order" IS NULL
      )
      UPDATE widgets 
      SET "order" = widget_orders.new_order
      FROM widget_orders
      WHERE widgets.id = widget_orders.id;
    `);
    
    console.log('✅ Order values populated successfully');
    
    // Check how many widgets were updated
    const result = await db.execute(sql`
      SELECT 
        COUNT(*) as total_widgets,
        COUNT("order") as widgets_with_order
      FROM widgets;
    `);
    
    console.log('📊 Widget stats:', result[0]);
    console.log('🎉 Migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await client.end();
  }
}

if (require.main === module) {
  populateOrderColumn().catch(console.error);
}

export { populateOrderColumn };