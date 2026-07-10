import { ReactNode } from "react";

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-paper-50 dark:bg-ink-950">
      {/* Brand panel */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-ink-950 p-10 text-paper-50 lg:flex">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-signal-500">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M1 15 L8 2 L15 15 L8 11 Z" fill="white" />
            </svg>
          </div>
          <span className="font-display text-[15px] font-semibold tracking-tight">
            CareerPilot AI
          </span>
        </div>

        <div className="relative z-10 max-w-sm">
          <h1 className="font-display text-3xl font-semibold leading-tight">
            From job posting to offer letter — one flight path.
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-400">
            Resume analysis, JD matching, and interview prep, scored and tracked
            in one place.
          </p>
        </div>

        {/* Signature ascent-arc motif */}
        <svg
          className="absolute bottom-0 left-0 w-full opacity-70"
          height="180"
          viewBox="0 0 600 180"
          preserveAspectRatio="none"
        >
          <path
            d="M0,150 C100,140 150,90 220,95 C300,100 320,40 420,30 C480,24 520,45 600,10"
            fill="none"
            stroke="#17B890"
            strokeWidth="2"
            strokeDasharray="4 6"
          />
          <circle cx="600" cy="10" r="4" fill="#34D3A6" />
        </svg>
      </div>

      {/* Form panel */}
      <div className="flex w-full flex-col justify-center px-6 py-12 sm:px-12 lg:w-1/2 lg:px-20">
        <div className="mx-auto w-full max-w-sm animate-fade-up">{children}</div>
      </div>
    </div>
  );
}
