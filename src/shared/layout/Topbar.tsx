import { Moon, Sun, Laptop, LogOut } from "lucide-react";
import { useTheme } from "@/shared/hooks/useTheme";
import { useAuth } from "@/features/auth/AuthContext";
import { Button } from "@/shared/components/Button";
import { UsageBadge } from "@/shared/components/UsageBadge";

const themeOptions = [
  { value: "light", icon: Sun },
  { value: "dark", icon: Moon },
  { value: "system", icon: Laptop },
] as const;

export function Topbar() {
  const { theme, setTheme } = useTheme();
  const { user, signOut } = useAuth();

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-line-light bg-white/80 px-6 backdrop-blur dark:border-line-dark dark:bg-ink-900/80">
      <div className="text-sm text-slate-500 dark:text-slate-400">
        {user?.email && <span>Signed in as {user.email}</span>}
      </div>

      <div className="flex items-center gap-3">
        <UsageBadge />
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
          <LogOut size={14} /> Sign out
        </Button>
      </div>
    </header>
  );
}
