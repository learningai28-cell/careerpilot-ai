import { LucideIcon, ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Card } from "@/shared/components/Card";

interface ModuleCardProps {
  to: string;
  title: string;
  description: string;
  icon: LucideIcon;
  status?: "ready" | "coming-soon";
}

export function ModuleCard({ to, title, description, icon: Icon, status = "ready" }: ModuleCardProps) {
  const disabled = status === "coming-soon";

  const content = (
    <Card className="group h-full p-5 transition-transform hover:-translate-y-0.5">
      <div className="flex items-start justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-signal-500/10 text-signal-600 dark:text-signal-400">
          <Icon size={19} />
        </div>
        {!disabled && (
          <ArrowUpRight
            size={16}
            className="text-slate-400 opacity-0 transition-opacity group-hover:opacity-100"
          />
        )}
        {disabled && (
          <span className="rounded-full bg-paper-100 px-2 py-0.5 text-[11px] font-medium text-slate-500 dark:bg-ink-800 dark:text-slate-400">
            Coming soon
          </span>
        )}
      </div>
      <h3 className="mt-4 font-display text-[15px] font-semibold">{title}</h3>
      <p className="mt-1 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
        {description}
      </p>
    </Card>
  );

  if (disabled) return <div className="opacity-60">{content}</div>;
  return <Link to={to}>{content}</Link>;
}
