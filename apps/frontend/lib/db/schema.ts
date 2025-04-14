import { pgTable, text, json, timestamp } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: text('id').primaryKey(), // Using Clerk's userId as the primary key
  email: text('email').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  chatHistory: json('chat_history').$type<{
    role: string;
    message: string;
    timestamp: string;
  }[]>(),
  analysisResults: json('analysis_results').$type<any[]>(),
  dataFileLink: text('data_file_link'),
}); 