import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// Create a PostgreSQL connection for queryable use
const connectionString = process.env.DATABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const client = postgres(connectionString);

// Create a Drizzle client with the connection and schema
export const db = drizzle(client, { schema });

// Export the schema for use in other files
export * from './schema'; 