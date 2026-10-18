import { Link } from "react-router-dom";
import { Moon, Sun, Laptop, LogOut, Menu, Sparkles } from "lucide-react";
import { useTheme } from "@/shared/hooks/useTheme";
import { useAuth } from "@/features/auth/AuthContext";
import { Button } from "@/shared/components/Button";
import { useUsage } from "@/shared/hooks/useUsage";
import { UsageBadge } from "@/shared/components/UsageBadge";

const themeOptions = [
  { value: "light", icon: Sun },
  { value: "dark", icon: Moon },
  { value: "system", icon: Laptop },
] as const;

interface TopbarProps {
  onMenuClick?: () => void;
}

export function Topbar({ onMenuClick }: TopbarProps) {
  const { theme, setTheme } = useTheme();
  const { user, signOut } = useAuth();
  const { data: usage } = useUsage();

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-line-light bg-white/80 px-4 backdrop-blur dark:border-line-dark dark:bg-ink-900/80 sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <button
          onClick={onMenuClick}
          aria-label="Open menu"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-paper-100 dark:hover:bg-ink-800 md:hidden"
        >
          <Menu size={19} />
        </button>
        <div className="hidden truncate text-sm text-slate-500 dark:text-slate-400 sm:block">
          {user?.email && <span>Signed in as {user.email}</span>}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        <UsageBadge />
        {usage?.plan === "free" && (
          <Link to="/dashboard/billing" aria-label="Upgrade to Pro for ₹499">
            <Button size="sm" tabIndex={-1} className="gap-1 whitespace-nowrap px-2.5 sm:gap-2 sm:px-3">
              <Sparkles size={13} className="hidden sm:block" />
              Upgrade ₹499
            </Button>
          </Link>
        )}
        <div className="flex items-center rounded-lg border border-line-light p-0.5 dark:border-line-dark">
          {themeOptions.map(({ value, icon: Icon }) => (
            <button
              key={value}
              onClick={() => setTheme(value)}
              aria-label={`Use ${value} theme`}
              className={`flex h-7 w-7 items-center justify-center rounded-md transition-colors ${
                theme === value
                  ? "bg-signal-500 text-white"
                  : "text-slate-500 hover:text-ink-950 dark:hover:text-paper-50"
              }`}
            >
              <Icon size={14} />
            </button>
          ))}
        </div>

        <Button variant="ghost" size="sm" onClick={signOut}>
          <LogOut size={14} />
          <span className="hidden sm:inline">Sign out</span>
        </Button>
      </div>
    </header>
  );
}
