import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';
import { config } from "dotenv";

// Load .env.local manually
config({ path: ".env.local" });

export default defineConfig({
  dialect: "postgresql",
  out: './drizzle',
  schema: './db/schema.ts',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  schemaFilter: ["public"],

});
