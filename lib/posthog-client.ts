"use client";

import posthog from 'posthog-js';

// Client-side PostHog helpers for tracking user interactions
export const trackEvent = (eventName: string, properties?: Record<string, any>) => {
  if (typeof window !== 'undefined' && posthog && posthog.__loaded) {
    posthog.capture(eventName, properties);
  } else if (typeof window !== 'undefined') {
    console.warn('PostHog: Not properly initialized. Event not tracked:', eventName);
  }
};

export const identifyUser = (userId: string, properties?: Record<string, any>) => {
  if (typeof window !== 'undefined' && posthog && posthog.__loaded) {
    posthog.identify(userId, properties);
  } else if (typeof window !== 'undefined') {
    console.warn('PostHog: Not properly initialized. User not identified:', userId);
  }
};

// Common events for your app
export const trackDashboardCreated = (dashboardId: string, name: string) => {
  trackEvent('dashboard_created', {
    dashboard_id: dashboardId,
    dashboard_name: name,
  });
};

export const trackFileUploaded = (fileId: string, fileName: string, fileType: string, fileSize?: number) => {
  trackEvent('file_uploaded', {
    file_id: fileId,
    file_name: fileName,
    file_type: fileType,
    file_size: fileSize,
  });
};

export const trackWidgetCreated = (widgetId: string, widgetType: string, dashboardId: string) => {
  trackEvent('widget_created', {
    widget_id: widgetId,
    widget_type: widgetType,
    dashboard_id: dashboardId,
  });
};

export const trackChatMessageSent = (chatId: string, messageType: 'user' | 'ai' | 'system') => {
  trackEvent('chat_message_sent', {
    chat_id: chatId,
    message_type: messageType,
  });
};

export const trackDashboardViewed = (dashboardId: string, isPublic: boolean) => {
  trackEvent('dashboard_viewed', {
    dashboard_id: dashboardId,
    is_public: isPublic,
  });
};

export const trackThemeChanged = (themeId: string, themeName: string) => {
  trackEvent('theme_changed', {
    theme_id: themeId,
    theme_name: themeName,
  });
};

export const trackUserSignUp = (method: string) => {
  trackEvent('user_signed_up', {
    method,
  });
};