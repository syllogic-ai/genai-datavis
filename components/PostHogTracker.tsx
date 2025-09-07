"use client";

import { useEffect } from "react";
import posthog from "posthog-js";
import { useSession } from "@/lib/auth-client";

/**
 * PostHog user identification and tracking component
 * Place this in your root layout or main app component
 */
export function PostHogTracker() {
  const { data: session } = useSession();
  const user = session?.user;

  useEffect(() => {
    if (user) {
      // Identify the user in PostHog
      posthog.identify(user.id, {
        email: user.email,
        name: user.name,
        image: user.image,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt,
      });

      console.log('PostHog: User identified', user.id);
    } else {
      // Reset PostHog when user logs out
      posthog.reset();
      console.log('PostHog: User session reset');
    }
  }, [user]);

  // This component doesn't render anything
  return null;
}

/**
 * Track user sign-in event
 * Call this after successful authentication
 */
export function trackUserSignIn(userId: string, method: string, email?: string) {
  posthog.capture('user_signed_in', {
    method,
    email,
    timestamp: new Date().toISOString(),
  });
  console.log('PostHog: Tracked sign-in event', { userId, method, email });
}

/**
 * Track user sign-up event
 * Call this after successful user registration
 */
export function trackUserSignUp(userId: string, method: string, email?: string) {
  posthog.capture('user_signed_up', {
    method,
    email,
    timestamp: new Date().toISOString(),
  });
  console.log('PostHog: Tracked sign-up event', { userId, method, email });
}