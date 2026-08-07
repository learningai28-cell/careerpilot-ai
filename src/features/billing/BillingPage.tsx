import { Crown, Check } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardBody, CardHeader } from "@/shared/components/Card";
import { useAuth } from "@/features/auth/AuthContext";
import { useUsage } from "@/shared/hooks/useUsage";
import { MODULE_LABELS } from "@/shared/lib/usageLimits";
import { RazorpayCheckout } from "./RazorpayCheckout";

const PRO_BENEFITS = [
  "Unlimited Resume Analyzer, JD Analyzer, and Interview Coach generations",
  "Unlimited Resume Builder auto-extracts",
  "No monthly resets to plan around",
];

const PRO_PRICE_DISPLAY = "₹499";
const PRO_BILLING_PERIOD = "every 3 months";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function BillingPage() {
  const { user } = useAuth();
  const { data: usage } = useUsage();
  const queryClient = useQueryClient();

  const isPro = usage?.plan === "pro";
  // usage.plan already flips back to "free" once proExpiresAt has passed
  // (see useUsage.ts), so proExpiresAt here — when isPro is true — is
  // always a future renewal date, never a lapsed one.
  const hasLapsedPro = !isPro && !!usage?.proExpiresAt;

  return (
    <div className="mx-auto max-w-2xl animate-fade-up">
      <div className="mb-8">
        <h1 className="font-display text-2xl font-semibold">Plan & billing</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {isPro
            ? "You're on the Pro plan."
            : `Upgrade for unlimited access across every module — ${PRO_PRICE_DISPLAY} ${PRO_BILLING_PERIOD}.`}
        </p>
      </div>

      <Card>
        <CardHeader className="flex items-center gap-2">
          <Crown size={18} className="text-amber-500" />
          <h2 className="font-display text-base font-semibold">
            {isPro ? "Pro plan — active" : hasLapsedPro ? "Pro plan — expired" : "Pro plan"}
          </h2>
        </CardHeader>
        <CardBody>
          {isPro ? (
            <>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Thanks for upgrading — every module below is unlimited for you now.
              </p>
              {usage?.proExpiresAt && (
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                  Valid until {formatDate(usage.proExpiresAt)} ({PRO_PRICE_DISPLAY} paid,{" "}
                  {PRO_BILLING_PERIOD}).
                </p>
              )}
              <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                This is a one-time payment, not an auto-renewing subscription — we won't charge
                you again automatically. Come back here to pay ₹499 and renew once this period
                ends.
              </p>
            </>
          ) : (
            <>
              {hasLapsedPro && usage?.proExpiresAt && (
                <p className="mb-3 text-sm text-amber-600 dark:text-amber-400">
                  Your Pro period ended {formatDate(usage.proExpiresAt)}. Renew to keep unlimited access.
                </p>
              )}
              <p className="mb-1 flex items-baseline gap-1">
                <span className="font-display text-2xl font-semibold">{PRO_PRICE_DISPLAY}</span>
                <span className="text-sm text-slate-500 dark:text-slate-400">{PRO_BILLING_PERIOD}</span>
              </p>
              <p className="mb-4 text-xs text-slate-400 dark:text-slate-500">
                One-time payment of ₹499 that unlocks unlimited access for 3 months. It does not
                auto-renew or auto-charge you — you'll need to come back and pay again after 3
                months if you want to continue.
              </p>
              <ul className="mb-5 space-y-2">
                {PRO_BENEFITS.map((b) => (
                  <li key={b} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
                    <Check size={16} className="mt-0.5 shrink-0 text-signal-500" />
                    {b}
                  </li>
                ))}
              </ul>
              <RazorpayCheckout
                label={hasLapsedPro ? "Renew Pro — ₹499" : "Upgrade to Pro — ₹499"}
                onUpgraded={() => {
                  queryClient.invalidateQueries({ queryKey: ["usage", user?.id] });
                }}
              />
            </>
          )}
        </CardBody>
      </Card>

      <p className="mt-6 text-center text-xs text-slate-400 dark:text-slate-500">
        Questions about your payment or plan? Write to{" "}
        <a href="mailto:hello@operix.co.in" className="font-medium text-signal-600 dark:text-signal-400">
          hello@operix.co.in
        </a>
      </p>

      {!isPro && usage && (
        <Card className="mt-6">
          <CardHeader>
            <h2 className="font-display text-base font-semibold">This month's free usage</h2>
          </CardHeader>
          <CardBody className="space-y-2">
            {usage.perModule.map((m) => (
              <div key={m.module} className="flex items-center justify-between text-sm">
                <span className="text-slate-600 dark:text-slate-300">{MODULE_LABELS[m.module]}</span>
                <span className={`data-figure ${m.atLimit ? "text-amber-500" : "text-slate-400"}`}>
                  {m.used}/{m.limit}
                </span>
              </div>
            ))}
          </CardBody>
        </Card>
      )}
    </div>
  );
}
