import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import 'dotenv/config';

// For migrations
const migrationClient = postgres(process.env.DATABASE_URL || '', { max: 1 });
const db = drizzle(migrationClient);

async function main() {
  console.log('Running migrations...');
  
  await migrate(db, { migrationsFolder: './lib/db/migrations' });
  
  console.log('Migrations completed!');
  
  await migrationClient.end();
  process.exit(0);
}

main().catch((error) => {
  console.error('Migration error:', error);
  process.exit(1);
}); 