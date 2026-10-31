import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Lock, RefreshCw, UploadCloud } from "lucide-react";
import { supabase } from "@/shared/lib/supabaseClient";
import { ScoreGauge } from "@/shared/components/ScoreGauge";
import { trackEvent } from "@/shared/lib/analytics";
import { ShareButtons } from "@/shared/components/ShareButtons";
import { SITE_URL } from "@/shared/lib/referral";

const MAX_BYTES = 3 * 1024 * 1024;

interface QuickResult {
  ats_score: number;
  verdict: string;
  top_issues: string[];
  more_issues_count: number;
  missing_keywords: string[];
}

type State =
  | { kind: "idle" }
  | { kind: "loading"; fileName: string }
  | { kind: "done"; result: QuickResult }
  | { kind: "error"; message: string; limit?: boolean };

function readAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

/**
 * Landing-page "try before you sign up": upload a resume, get a quick ATS
 * score and the top 3 fixes from the public-ats-check Edge Function. The
 * rest of the report is shown locked, behind a free sign-up.
 */
export function QuickAtsCheck({ signupClass }: { signupClass: string }) {
  const [state, setState] = useState<State>({ kind: "idle" });
  const inputRef = useRef<HTMLInputElement>(null);

  async function check(file: File) {
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext !== "pdf" && ext !== "docx") {
      setState({ kind: "error", message: "Please upload a PDF or DOCX file." });
      return;
    }
    if (file.size > MAX_BYTES) {
      setState({ kind: "error", message: "File must be under 3 MB for the quick check." });
      return;
    }
    setState({ kind: "loading", fileName: file.name });
    trackEvent("quick_ats_check_started");
    try {
      const fileBase64 = await readAsBase64(file);
      const { data, error } = await supabase.functions.invoke("public-ats-check", {
        body: { fileBase64, fileType: ext },
      });
      if (error) {
        // Non-2xx: the server's { error } message is in the raw Response.
        let message = "Something went wrong. Please try again.";
        let limit = false;
        try {
          const parsed = await (error as { context?: Response }).context?.json();
          if (parsed?.error) message = parsed.error;
          limit = Boolean(parsed?.limit);
        } catch {
          /* keep the fallback message */
        }
        setState({ kind: "error", message, limit });
        trackEvent("quick_ats_check_failed", { limit });
        return;
      }
      setState({ kind: "done", result: data.result as QuickResult });
      trackEvent("quick_ats_check_done", { score: data.result?.ats_score });
    } catch {
      setState({ kind: "error", message: "Couldn't read that file. Please try another one." });
    }
  }

  const reset = () => {
    setState({ kind: "idle" });
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div
      id="free-check"
      className="rounded-2xl border border-line-light bg-white p-5 shadow-sm dark:border-line-dark dark:bg-ink-900 sm:p-6"
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-signal-600 dark:text-signal-400">
        Free ATS check, no sign-up
      </p>
      <h2 className="mt-1 font-display text-xl font-semibold">How does your resume score?</h2>

      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.docx"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) check(f);
        }}
      />

      {state.kind === "idle" && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="mt-4 flex w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-line-light px-4 py-8 text-center transition-colors hover:border-signal-500 hover:bg-paper-100 dark:border-line-dark dark:hover:bg-ink-800"
        >
          <UploadCloud className="mb-2 text-signal-500" size={28} />
          <span className="text-sm font-medium">Upload your resume</span>
          <span className="mt-1 text-xs text-slate-500 dark:text-slate-400">PDF or DOCX, up to 3 MB</span>
        </button>
      )}

      {state.kind === "loading" && (
        <div className="mt-4 flex flex-col items-center justify-center rounded-xl bg-paper-100 px-4 py-8 text-center dark:bg-ink-800">
          <RefreshCw className="mb-2 animate-spin text-signal-500" size={26} />
          <span className="text-sm font-medium">Checking {state.fileName}…</span>
          <span className="mt-1 text-xs text-slate-500 dark:text-slate-400">Usually takes 10–20 seconds</span>
        </div>
      )}

      {state.kind === "error" && (
        <div className="mt-4 rounded-xl bg-paper-100 p-4 text-sm dark:bg-ink-800">
          <p>{state.message}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {state.limit ? (
              <Link to="/signup" className={signupClass}>
                Sign up free
              </Link>
            ) : (
              <button type="button" onClick={reset} className="font-medium text-signal-600 dark:text-signal-400">
                Try again
              </button>
            )}
          </div>
        </div>
      )}

      {state.kind === "done" && (
        <div className="mt-4">
          <div className="flex flex-col items-center">
            <ScoreGauge score={state.result.ats_score} label="Quick ATS score" size={150} />
            <p className="mt-2 text-center text-sm text-slate-600 dark:text-slate-400">{state.result.verdict}</p>
          </div>

          {state.result.top_issues.length > 0 && (
            <>
              <h3 className="mt-5 text-sm font-semibold">Top fixes</h3>
              <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm">
                {state.result.top_issues.map((issue) => (
                  <li key={issue}>{issue}</li>
                ))}
              </ol>
            </>
          )}

          {state.result.missing_keywords.length > 0 && (
            <>
              <h3 className="mt-4 text-sm font-semibold">Keywords you may be missing</h3>
              <div className="mt-2 flex flex-wrap gap-2">
                {state.result.missing_keywords.map((k) => (
                  <span key={k} className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-900 dark:bg-amber-500/20 dark:text-amber-200">
                    {k}
                  </span>
                ))}
              </div>
            </>
          )}

          <div className="relative mt-5 overflow-hidden rounded-xl border border-line-light p-4 dark:border-line-dark">
            <div aria-hidden className="space-y-2 blur-sm">
              <div className="h-3 w-4/5 rounded bg-slate-300 dark:bg-slate-600" />
              <div className="h-3 w-3/5 rounded bg-slate-300 dark:bg-slate-600" />
              <div className="h-3 w-2/3 rounded bg-slate-300 dark:bg-slate-600" />
            </div>
            <div className="absolute inset-0 flex items-center justify-center gap-2 bg-white/60 px-3 text-center text-sm font-medium dark:bg-ink-900/60">
              <Lock size={14} />
              {state.result.more_issues_count > 0 ? `${state.result.more_issues_count} more fixes, ` : ""}
              section-by-section feedback and job match
            </div>
          </div>

          <Link to="/signup" className={`${signupClass} mt-4 w-full`}>
            See my full report, free
          </Link>
          <div className="mt-5 border-t border-line-light pt-4 dark:border-line-dark">
            <p className="mb-2 text-sm font-medium">Know someone job hunting? Share the free check</p>
            <ShareButtons
              source="quick_check"
              url={`${SITE_URL}/?utm_source=share&utm_campaign=quick_check`}
              text={`My resume scored ${state.result.ats_score}/100 on CareerPilot AI's free ATS check. Check yours, no sign-up needed:`}
            />
          </div>
          <button
            type="button"
            onClick={reset}
            className="mt-3 w-full text-center text-xs text-slate-500 hover:underline dark:text-slate-400"
          >
            Check another resume
          </button>
        </div>
      )}

      <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">
        We don't store your resume for this check. It's analysed by our AI provider and then discarded.
      </p>
    </div>
  );
}
