import clsx from "clsx";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={clsx(
        "animate-pulse rounded-lg bg-paper-100 dark:bg-ink-800",
        className
      )}
    />
  );
}
