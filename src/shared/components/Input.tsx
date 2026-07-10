import { InputHTMLAttributes, forwardRef } from "react";
import clsx from "clsx";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={clsx(
        "h-10 w-full rounded-xl border border-line-light bg-white px-3 text-sm outline-none transition-colors",
        "placeholder:text-slate-400 focus:border-signal-500",
        "dark:border-line-dark dark:bg-ink-900 dark:text-paper-50",
        className
      )}
      {...props}
    />
  )
);
Input.displayName = "Input";
