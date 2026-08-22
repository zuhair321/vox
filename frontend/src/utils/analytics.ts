/**
 * Simple analytics utility — logs events to console in dev,
 * can be extended to send to a real analytics service in production.
 */

type AnalyticsEvent = {
  name: string;
  properties?: Record<string, any>;
  timestamp: number;
};

const EVENT_LOG: AnalyticsEvent[] = [];
const MAX_LOG_SIZE = 100;

export function trackEvent(name: string, properties?: Record<string, any>) {
  const event: AnalyticsEvent = {
    name,
    properties,
    timestamp: Date.now(),
  };
  
  EVENT_LOG.unshift(event);
  if (EVENT_LOG.length > MAX_LOG_SIZE) {
    EVENT_LOG.pop();
  }
  
  // In dev, log to console
  if (import.meta.env.DEV) {
  }
  
  // TODO: Send to analytics service in production
  // if (import.meta.env.PROD) {
  //   fetch('/api/analytics', { method: 'POST', body: JSON.stringify(event) });
  // }
}

export function getEventLog() {
  return [...EVENT_LOG];
}

// Track page views
export function trackPageView(page: string) {
  trackEvent('page_view', { page });
}

// Track user actions
export function trackAction(action: string, target?: string) {
  trackEvent('user_action', { action, target });
}

// Track errors
export function trackError(error: string, context?: string) {
  trackEvent('error', { error, context });
}
