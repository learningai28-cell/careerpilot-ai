import { useState } from "react";
import { Crown } from "lucide-react";
import { useUsage } from "@/shared/hooks/useUsage";
import { MODULE_LABELS } from "@/shared/lib/usageLimits";
import { Button } from "./Button";

export function UsageBadge() {
  const { data } = useUsage();
  const [open, setOpen] = useState(false);

  if (!data) return null;

  if (data.plan === "pro") {
    return (
      <span className="flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-500">
        <Crown size={12} /> Pro
      </span>
    );
  }

  const mostUsed = [...data.perModule].sort(
    (a, b) => b.used / b.limit - a.used / a.limit
  )[0];

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded-full border border-line-light px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-paper-100 dark:border-line-dark dark:text-slate-300 dark:hover:bg-ink-800"
      >
        Free plan
        {mostUsed && (
          <span className="data-figure text-[11px] text-slate-400">
            {mostUsed.used}/{mostUsed.limit}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-9 z-20 w-64 rounded-xl border border-line-light bg-white p-3 shadow-card dark:border-line-dark dark:bg-ink-900 dark:shadow-card-dark">
          <p className="mb-2 text-xs font-medium text-slate-500">This month</p>
          <div className="space-y-1.5">
            {data.perModule.map((m) => (
              <div key={m.module} className="flex items-center justify-between text-xs">
                <span className="text-slate-600 dark:text-slate-300">
                  {MODULE_LABELS[m.module]}
                </span>
                <span className={`data-figure ${m.atLimit ? "text-amber-500" : "text-slate-400"}`}>
                  {m.used}/{m.limit}
                </span>
              </div>
            ))}
          </div>
          <Button size="sm" className="mt-3 w-full">
            Upgrade to Pro
          </Button>
        </div>
      )}
    </div>
  );
}
