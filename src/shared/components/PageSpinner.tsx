export function PageSpinner() {
  return (
    <div className="flex h-screen items-center justify-center bg-paper-50 dark:bg-ink-950">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-signal-500 border-t-transparent" />
    </div>
  );
}

/** Smaller fallback for content rendered inside the dashboard shell. */
export function ContentSpinner() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-signal-500 border-t-transparent" />
    </div>
  );
}
