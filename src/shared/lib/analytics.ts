import posthog from "posthog-js";

const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY as string | undefined;
const POSTHOG_HOST = (import.meta.env.VITE_POSTHOG_HOST as string | undefined) || "https://us.i.posthog.com";

let initialized = false;

/**
 * Initializes PostHog for error monitoring (exception autocapture) and
 * product analytics (pageviews, clicks). Silently does nothing if no key
 * is configured — this is what makes local development safe: without a
 * VITE_POSTHOG_KEY set (which local dev never has, only the GitHub Actions
 * build does), no events are captured and no PostHog network calls happen
 * at all.
 */
export function initAnalytics() {
  if (!POSTHOG_KEY || initialized) return;

  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    capture_exceptions: true, // reports uncaught JS errors automatically
    capture_pageview: true,
    autocapture: true,
    person_profiles: "identified_only", // don't create profiles for anonymous visitors
  });

  initialized = true;
}

export function identifyUser(userId: string, email?: string) {
  if (!initialized) return;
  posthog.identify(userId, email ? { email } : undefined);
}

export function resetAnalyticsIdentity() {
  if (!initialized) return;
  posthog.reset();
}

export function captureException(error: unknown) {
  if (!initialized) return;
  posthog.captureException(error);
}
