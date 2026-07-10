import { TextareaHTMLAttributes, forwardRef } from "react";
import clsx from "clsx";

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={clsx(
        "w-full rounded-xl border border-line-light bg-white p-3 text-sm outline-none transition-colors",
        "placeholder:text-slate-400 focus:border-signal-500",
        "dark:border-line-dark dark:bg-ink-900 dark:text-paper-50",
        className
      )}
      {...props}
    />
  )
);
Textarea.displayName = "Textarea";
