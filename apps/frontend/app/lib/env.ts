// Environment variable helper for the frontend
// Next.js automatically loads .env, .env.local, .env.development, .env.production

/**
 * Helper to get environment variables with proper typing
 * @param key - The environment variable key
 * @param defaultValue - Optional default value if the environment variable is not defined
 * @returns The environment variable value or the default value
 */
export function getEnv<T extends string | boolean | number>(
  key: string, 
  defaultValue?: T
): T {
  const value = process.env[`NEXT_PUBLIC_${key}`];
  
  if (value === undefined) {
    if (defaultValue !== undefined) {
      return defaultValue;
    }
    throw new Error(`Environment variable NEXT_PUBLIC_${key} is not defined`);
  }

  // Convert the value to the appropriate type based on defaultValue
  if (typeof defaultValue === "boolean") {
    return (value.toLowerCase() === "true") as unknown as T;
  } else if (typeof defaultValue === "number") {
    return Number(value) as unknown as T;
  }
  
  return value as unknown as T;
}

/**
 * API URL from environment variables
 */
export const API_URL = getEnv("API_URL", "http://localhost:8000");

/**
 * Feature flags
 */
export const FEATURE_FLAGS = {
  analytics: getEnv("FEATURE_ANALYTICS", false),
  auth: getEnv("AUTH_ENABLED", false),
};

/**
 * External services configuration
 */
export const EXTERNAL = {
  mapboxToken: getEnv("MAPBOX_TOKEN", ""),
}; 