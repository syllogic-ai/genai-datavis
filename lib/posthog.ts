import { PostHog } from 'posthog-node'

// NOTE: This is a Node.js client, so you can use it for sending events from the server side to PostHog.
export default function PostHogClient() {
  // Check if PostHog is properly configured
  const apiKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST;
  
  if (!apiKey) {
    console.warn('PostHog: NEXT_PUBLIC_POSTHOG_KEY is not set. PostHog tracking will be disabled.');
    // Return a mock client that doesn't do anything
    return {
      identify: () => {},
      capture: () => {},
      shutdown: () => Promise.resolve(),
    } as unknown as PostHog;
  }
  
  const posthogClient = new PostHog(apiKey, {
    host: host || 'https://app.posthog.com',
    flushAt: 1,
    flushInterval: 0,
  })

  return posthogClient
}
