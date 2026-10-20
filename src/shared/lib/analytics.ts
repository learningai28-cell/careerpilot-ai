import posthog from "posthog-js";

const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY as string | undefined;
const POSTHOG_HOST = (import.meta.env.VITE_POSTHOG_HOST as string | undefined) || "https://us.i.posthog.com";

let initialized = false;

// ---------------------------------------------------------------------------
// Cookie / analytics consent (Google Consent Mode v2 + PostHog)
// ---------------------------------------------------------------------------
// index.html sets the Consent Mode defaults (all denied) and restores any
// stored choice synchronously before gtag('config'). This module keeps the
// same localStorage key and mirrors the choice onto PostHog.
export const CONSENT_STORAGE_KEY = "careerpilot-consent";
export type ConsentChoice = "granted" | "denied";

type GtagFn = (...args: unknown[]) => void;
function getGtag(): GtagFn | null {
  const g = (window as unknown as { gtag?: GtagFn }).gtag;
  return typeof g === "function" ? g : null;
}

export function getConsent(): ConsentChoice | null {
  try {
    const v = localStorage.getItem(CONSENT_STORAGE_KEY);
    return v === "granted" || v === "denied" ? v : null;
  } catch {
    return null;
  }
}

function applyPostHogConsent(choice: ConsentChoice) {
  if (!initialized) return;
  if (choice === "granted") {
    posthog.set_config({
      persistence: "localStorage+cookie",
      autocapture: true,
      capture_pageview: true,
    });
    posthog.capture("$pageview");
  } else {
    // Not consented: no cookies / localStorage identifiers, no autocapture
    // or pageviews. Exception capture stays on so error monitoring works.
    posthog.set_config({
      persistence: "memory",
      autocapture: false,
      capture_pageview: false,
    });
  }
}

/** Persists the visitor's choice and propagates it to Google and PostHog. */
export function setConsent(choice: ConsentChoice) {
  try {
    localStorage.setItem(CONSENT_STORAGE_KEY, choice);
  } catch {
    /* storage unavailable: choice only lasts for this page view */
  }
  getGtag()?.("consent", "update", {
    ad_storage: choice,
    ad_user_data: choice,
    ad_personalization: choice,
    analytics_storage: choice,
  });
  applyPostHogConsent(choice);
}

// ---------------------------------------------------------------------------
// Google Ads conversions
// ---------------------------------------------------------------------------
const ADS_ID = "AW-18378497668";
const ADS_LABELS = {
  signup: import.meta.env.VITE_GADS_SIGNUP_LABEL as string | undefined,
  purchase: import.meta.env.VITE_GADS_PURCHASE_LABEL as string | undefined,
} as const;

/**
 * Fires a Google Ads conversion. No-op if the label env var is unset or
 * gtag is unavailable (e.g. blocked). Consent Mode decides whether the ping
 * is cookie-based or cookieless.
 */
export function trackAdsConversion(
  kind: "signup" | "purchase",
  opts?: { value?: number; currency?: string; transactionId?: string }
) {
  const label = ADS_LABELS[kind];
  const gtag = getGtag();
  if (!label || !gtag) return;
  const params: Record<string, unknown> = { send_to: `${ADS_ID}/${label}` };
  if (opts?.value !== undefined) {
    params.value = opts.value;
    params.currency = opts.currency ?? "INR";
  }
  if (opts?.transactionId) params.transaction_id = opts.transactionId;
  gtag("event", "conversion", params);
}

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

  // Until the visitor accepts, run cookieless (in-memory persistence) with
  // autocapture/pageviews off; exception capture stays on for monitoring.
  const consented = getConsent() === "granted";
  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    capture_exceptions: true, // reports uncaught JS errors automatically
    capture_pageview: consented,
    autocapture: consented,
    persistence: consented ? "localStorage+cookie" : "memory",
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
