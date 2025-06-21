/**
 * Environment configuration and validation
 * 
 * This file centralizes all environment variable access and validation
 * to ensure type safety and proper error handling.
 */

import { z } from 'zod';

const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().url(),
  
  // Clerk Authentication
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(1),
  CLERK_SECRET_KEY: z.string().min(1),
  
  // Supabase (if used)
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  
  // App Configuration
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
});

type Env = z.infer<typeof envSchema>;

class EnvironmentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EnvironmentError';
  }
}

function getEnv(): Env {
  try {
    return envSchema.parse({
      DATABASE_URL: process.env.DATABASE_URL,
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
      CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY,
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
      NODE_ENV: process.env.NODE_ENV,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors
        .filter(err => err.code === 'invalid_type' && err.received === 'undefined')
        .map(err => err.path.join('.'));
      
      throw new EnvironmentError(
        `Missing required environment variables: ${missingVars.join(', ')}`
      );
    }
    throw error;
  }
}

// Validate environment variables at startup
let env: Env;
try {
  env = getEnv();
} catch (error) {
  console.error('Environment validation failed:', error);
  throw error;
}

// Export validated environment variables
export const {
  DATABASE_URL,
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
  CLERK_SECRET_KEY,
  NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY,
  NODE_ENV,
} = env;

// Environment helpers
export const isDevelopment = NODE_ENV === 'development';
export const isProduction = NODE_ENV === 'production';
export const isTest = NODE_ENV === 'test';

// API URL with fallback
export const getApiUrl = () => {
  if (typeof window !== 'undefined') {
    return `${window.location.protocol}//${window.location.host}/api`;
  }
  return process.env.VERCEL_URL 
    ? `https://${process.env.VERCEL_URL}/api`
    : 'http://localhost:3000/api';
};

export default env;