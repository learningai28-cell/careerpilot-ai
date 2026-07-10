import { ButtonHTMLAttributes, forwardRef } from "react";
import clsx from "clsx";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md";
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={clsx(
          "inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-colors",
          "disabled:opacity-50 disabled:pointer-events-none",
          size === "md" ? "h-10 px-4 text-sm" : "h-8 px-3 text-xs",
          variant === "primary" &&
            "bg-signal-500 text-white hover:bg-signal-600 active:bg-signal-600",
          variant === "secondary" &&
            "border border-line-light dark:border-line-dark bg-transparent text-ink-950 dark:text-paper-50 hover:bg-paper-100 dark:hover:bg-ink-800",
          variant === "ghost" &&
            "text-slate-500 hover:text-ink-950 dark:hover:text-paper-50 hover:bg-paper-100 dark:hover:bg-ink-800",
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
