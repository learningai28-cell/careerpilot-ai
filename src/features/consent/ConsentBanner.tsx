import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/shared/components/Button";
import { getConsent, setConsent, type ConsentChoice } from "@/shared/lib/analytics";

/**
 * Cookie / analytics consent banner (Google Consent Mode v2 + PostHog).
 *
 * Renders nothing once a choice is stored. Currently mounted on the landing
 * page and the signup page. To cover the whole app, render <ConsentBanner />
 * once inside the router tree (e.g. in DashboardShell or a root layout
 * route) -- it is safe to mount in several places; each instance hides
 * itself after a choice.
 */
export function ConsentBanner() {
  const [choice, setChoice] = useState<ConsentChoice | null>(() => getConsent());
  if (choice) return null;

  const decide = (c: ConsentChoice) => {
    setConsent(c);
    setChoice(c);
  };

  return (
    <div
      role="region"
      aria-label="Cookie consent"
      className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-xl rounded-2xl border border-line-light bg-white p-4 shadow-card dark:border-line-dark dark:bg-ink-900 dark:shadow-card-dark"
    >
      <p className="text-sm text-slate-600 dark:text-slate-400">
        We use cookies for analytics and to measure our ads. You can accept or reject them; the
        app works either way.{" "}
        <Link
          to="/privacy"
          className="font-medium text-signal-600 underline dark:text-signal-400"
        >
          Privacy Policy
        </Link>
      </p>
      <div className="mt-3 flex gap-2">
        <Button size="sm" onClick={() => decide("granted")}>
          Accept
        </Button>
        <Button size="sm" variant="secondary" onClick={() => decide("denied")}>
          Reject
        </Button>
      </div>
    </div>
  );
}
