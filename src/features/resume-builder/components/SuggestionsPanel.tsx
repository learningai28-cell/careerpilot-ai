import { useMemo, useState } from "react";
import { Sparkles, Check } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/shared/components/Card";
import { Button } from "@/shared/components/Button";
import { useResumeAnalysis } from "@/features/resume-analyzer/hooks";
import { useJDAnalysis } from "@/features/jd-analyzer/hooks";
import { ResumeProfileData } from "../types";

export function SuggestionsPanel({
  draft,
  onChange,
}: {
  draft: ResumeProfileData;
  onChange: (next: ResumeProfileData) => void;
}) {
  const { data: resumeAnalysis } = useResumeAnalysis();
  const { data: jdAnalysis } = useJDAnalysis();
  const [summaryApplied, setSummaryApplied] = useState(false);
  const [addedKeywords, setAddedKeywords] = useState<Set<string>>(new Set());

  const missingKeywords = useMemo(() => {
    const fromResume = resumeAnalysis?.missing_keywords ?? [];
    const fromJD = jdAnalysis?.missing_keywords ?? [];
    const combined = [...fromResume, ...fromJD];
    // Dedupe case-insensitively, keep first-seen original casing.
    const seen = new Set<string>();
    return combined.filter((kw) => {
      const key = kw.toLowerCase();
      if (seen.has(key) || draft.skills.some((s) => s.toLowerCase() === key)) return false;
      seen.add(key);
      return true;
    });
  }, [resumeAnalysis, jdAnalysis, draft.skills]);

  const hasSummarySuggestion =
    resumeAnalysis?.improved_summary && resumeAnalysis.improved_summary !== draft.summary;

  if (!hasSummarySuggestion && missingKeywords.length === 0) return null;

  const applySummary = () => {
    onChange({ ...draft, summary: resumeAnalysis!.improved_summary! });
    setSummaryApplied(true);
  };

  const addKeyword = (kw: string) => {
    onChange({ ...draft, skills: [...draft.skills, kw] });
    setAddedKeywords((prev) => new Set(prev).add(kw));
  };

  return (
    <Card className="mb-4 border-signal-500/30 bg-signal-500/5">
      <CardHeader className="flex items-center gap-2">
        <Sparkles size={16} className="text-signal-600 dark:text-signal-400" />
        <h3 className="font-display text-sm font-semibold">Suggestions</h3>
        <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
          from your Resume Analyzer{jdAnalysis ? " and JD Analyzer" : ""} results — nothing here
          is applied automatically
        </span>
      </CardHeader>
      <CardBody className="space-y-4">
        {hasSummarySuggestion && (
          <div>
            <h4 className="mb-1.5 text-xs font-semibold text-slate-500">Suggested summary</h4>
            <p className="mb-2 rounded-lg bg-white p-3 text-sm leading-relaxed dark:bg-ink-900">
              {resumeAnalysis!.improved_summary}
            </p>
            <Button size="sm" variant="secondary" onClick={applySummary} disabled={summaryApplied}>
              {summaryApplied ? (
                <>
                  <Check size={13} /> Applied
                </>
              ) : (
                "Use this summary"
              )}
            </Button>
          </div>
        )}

        {missingKeywords.length > 0 && (
          <div>
            <h4 className="mb-1.5 text-xs font-semibold text-slate-500">
              Missing keywords — click to add to Skills
            </h4>
            <div className="flex flex-wrap gap-2">
              {missingKeywords.map((kw) => {
                const added = addedKeywords.has(kw);
                return (
                  <button
                    key={kw}
                    onClick={() => !added && addKeyword(kw)}
                    disabled={added}
                    className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                      added
                        ? "bg-signal-500/15 text-signal-600 dark:text-signal-400"
                        : "bg-amber-500/10 text-amber-500 hover:bg-amber-500/20"
                    }`}
                  >
                    {added && <Check size={11} />}
                    {kw}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </CardBody>
    </Card>
  );
}
