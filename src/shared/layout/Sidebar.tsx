import { NavLink } from "react-router-dom";
import clsx from "clsx";
import { X, LayoutGrid, FileText, ScanSearch, MessagesSquare, FileEdit } from "lucide-react";

const nav = [
  { to: "/dashboard", label: "Overview", icon: LayoutGrid, end: true },
  { to: "/dashboard/resume-analyzer", label: "Resume Analyzer", icon: FileText },
  { to: "/dashboard/resume-builder", label: "Resume Builder", icon: FileEdit },
  { to: "/dashboard/jd-analyzer", label: "JD Analyzer", icon: ScanSearch },
  { to: "/dashboard/interview-coach", label: "Interview Coach", icon: MessagesSquare },
];

interface SidebarProps {
  /** Mobile-only: whether the slide-out drawer is open. Ignored on desktop, where the sidebar is always visible. */
  open?: boolean;
  onClose?: () => void;
}

export function Sidebar({ open = false, onClose }: SidebarProps) {
  return (
    <>
      {/* Mobile backdrop — tapping it closes the drawer. Desktop never renders this. */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-ink-950/40 md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={clsx(
          "fixed inset-y-0 left-0 z-50 flex w-64 shrink-0 flex-col border-r border-line-light bg-white px-3 py-5 transition-transform duration-200 ease-out",
          "dark:border-line-dark dark:bg-ink-900",
          "md:static md:z-auto md:w-60 md:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="mb-8 flex items-center justify-between px-2">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-signal-500">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M1 15 L8 2 L15 15 L8 11 Z" fill="white" />
              </svg>
            </div>
            <span className="font-display text-[15px] font-semibold tracking-tight">
              CareerPilot
            </span>
          </div>
          <button
            onClick={onClose}
            aria-label="Close menu"
            className="text-slate-400 hover:text-ink-950 dark:hover:text-paper-50 md:hidden"
          >
            <X size={19} />
          </button>
        </div>

        <nav className="flex flex-1 flex-col gap-1">
          {nav.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={onClose}
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
    </>
  );
}
