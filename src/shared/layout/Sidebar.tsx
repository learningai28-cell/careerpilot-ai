import { NavLink } from "react-router-dom";
import clsx from "clsx";
import {
  LayoutGrid,
  FileText,
  ScanSearch,
  MessagesSquare,
  FileEdit,
} from "lucide-react";

const nav = [
  { to: "/dashboard", label: "Overview", icon: LayoutGrid, end: true },
  { to: "/dashboard/resume-analyzer", label: "Resume Analyzer", icon: FileText },
  { to: "/dashboard/resume-builder", label: "Resume Builder", icon: FileEdit },
  { to: "/dashboard/jd-analyzer", label: "JD Analyzer", icon: ScanSearch },
  { to: "/dashboard/interview-coach", label: "Interview Coach", icon: MessagesSquare },
];

export function Sidebar() {
  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-line-light bg-white px-3 py-5 dark:border-line-dark dark:bg-ink-900 md:flex">
      <div className="mb-8 flex items-center gap-2 px-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-signal-500">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M1 15 L8 2 L15 15 L8 11 Z" fill="white" />
          </svg>
        </div>
        <span className="font-display text-[15px] font-semibold tracking-tight">
          CareerPilot
        </span>
      </div>

      <nav className="flex flex-1 flex-col gap-1">
        {nav.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              clsx(
                "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-signal-500/10 text-signal-600 dark:text-signal-400"
                  : "text-slate-500 hover:bg-paper-100 hover:text-ink-950 dark:hover:bg-ink-800 dark:hover:text-paper-50"
              )
            }
          >
            <Icon size={17} strokeWidth={2} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="rounded-xl border border-dashed border-line-light px-3 py-3 text-xs text-slate-500 dark:border-line-dark dark:text-slate-400">
        More modules — salary negotiation, LinkedIn review, job tracker — land here as they ship.
      </div>
    </aside>
  );
}
