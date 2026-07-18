import { Sparkles, PenLine } from "lucide-react";
import { Card } from "@/shared/components/Card";

export function ChoiceScreen({
  hasResume,
  onChooseExtract,
  onChooseManual,
  extracting,
}: {
  hasResume: boolean;
  onChooseExtract: () => void;
  onChooseManual: () => void;
  extracting: boolean;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <button onClick={onChooseExtract} disabled={!hasResume || extracting} className="text-left disabled:opacity-50">
        <Card className="h-full p-6 transition-transform hover:-translate-y-0.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-signal-500/10 text-signal-600 dark:text-signal-400">
            <Sparkles size={19} />
          </div>
          <h3 className="mt-4 font-display text-base font-semibold">
            {extracting ? "Reading your resume…" : "Auto-fill from my resume"}
          </h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {hasResume
              ? "Uses the resume you already uploaded in Resume Analyzer. You can edit everything after."
              : "Upload a resume in Resume Analyzer first to use this option."}
          </p>
        </Card>
      </button>

      <button onClick={onChooseManual} className="text-left">
        <Card className="h-full p-6 transition-transform hover:-translate-y-0.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500">
            <PenLine size={19} />
          </div>
          <h3 className="mt-4 font-display text-base font-semibold">Start from scratch</h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Fill in your details manually — good if you're building a fresh resume from nothing.
          </p>
        </Card>
      </button>
    </div>
  );
}
