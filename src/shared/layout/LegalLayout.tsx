import { ReactNode } from "react";
import { Link } from "react-router-dom";

export function LegalLayout({
  title,
  lastUpdated,
  children,
}: {
  title: string;
  lastUpdated: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-paper-50 dark:bg-ink-950">
      <header className="border-b border-line-light bg-white px-6 py-4 dark:border-line-dark dark:bg-ink-900">
        <div className="mx-auto flex max-w-3xl items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-signal-500">
            <svg width="14" height="14" viewBox="0 0 16 16">
              <path d="M1 15 L8 2 L15 15 L8 11 Z" fill="white" />
            </svg>
          </div>
          <Link to="/" className="font-display text-sm font-semibold">
            CareerPilot AI
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="mb-2 font-display text-2xl font-semibold">{title}</h1>
        <p className="mb-8 text-sm text-slate-500 dark:text-slate-400">
          Last updated: {lastUpdated}
        </p>
        <div className="legal-content space-y-6 text-sm leading-relaxed text-ink-950 dark:text-paper-50">
          {children}
        </div>

        <div className="mt-12 border-t border-line-light pt-6 text-sm dark:border-line-dark">
          <Link to="/login" className="font-medium text-signal-600 dark:text-signal-400">
            ← Back to sign in
          </Link>
        </div>
      </main>
    </div>
  );
}

export function LegalSection({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 font-display text-base font-semibold">{heading}</h2>
      <div className="space-y-3 text-slate-600 dark:text-slate-300">{children}</div>
    </section>
  );
}
