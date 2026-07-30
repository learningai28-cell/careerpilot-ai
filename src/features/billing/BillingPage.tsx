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

export function BillingPage() {
  const { user } = useAuth();
  const { data: usage } = useUsage();
  const queryClient = useQueryClient();

  const isPro = usage?.plan === "pro";

  return (
    <div className="mx-auto max-w-2xl animate-fade-up">
      <div className="mb-8">
        <h1 className="font-display text-2xl font-semibold">Plan & billing</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {isPro
            ? "You're on the Pro plan."
            : "Upgrade for unlimited access across every module."}
        </p>
      </div>

      <Card>
        <CardHeader className="flex items-center gap-2">
          <Crown size={18} className="text-amber-500" />
          <h2 className="font-display text-base font-semibold">
            {isPro ? "Pro plan — active" : "Pro plan"}
          </h2>
        </CardHeader>
        <CardBody>
          {isPro ? (
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Thanks for upgrading — every module below is unlimited for you now.
            </p>
          ) : (
            <>
              <ul className="mb-5 space-y-2">
                {PRO_BENEFITS.map((b) => (
                  <li key={b} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
                    <Check size={16} className="mt-0.5 shrink-0 text-signal-500" />
                    {b}
                  </li>
                ))}
              </ul>
              <RazorpayCheckout
                onUpgraded={() => {
                  queryClient.invalidateQueries({ queryKey: ["usage", user?.id] });
                }}
              />
            </>
          )}
        </CardBody>
      </Card>

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
