import { ScoreGauge } from "@/shared/components/ScoreGauge";
import { Button } from "@/shared/components/Button";
import { InterviewAnswer } from "../types";

const confidenceColor: Record<string, string> = {
  high: "text-signal-600 dark:text-signal-400",
  medium: "text-amber-500",
  low: "text-rose-500",
};

export function AnswerFeedback({
  feedback,
  onPracticeAgain,
}: {
  feedback: InterviewAnswer;
  onPracticeAgain: () => void;
}) {
  return (
    <div className="mt-4 rounded-xl border border-line-light bg-paper-50 p-4 dark:border-line-dark dark:bg-ink-950">
      <div className="flex flex-wrap items-center gap-6">
        <ScoreGauge score={feedback.score ?? 0} label="Answer score" size={110} />
        <div className="flex-1 space-y-2 text-sm">
          {feedback.confidence_level && (
            <p>
              Confidence read:{" "}
              <span className={`font-medium capitalize ${confidenceColor[feedback.confidence_level]}`}>
                {feedback.confidence_level}
              </span>
            </p>
          )}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <h4 className="mb-1 text-xs font-semibold text-slate-500">Strengths</h4>
          <ul className="space-y-1 text-sm text-slate-600 dark:text-slate-300">
            {feedback.strengths.map((s, i) => (
              <li key={i} className="flex gap-2">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-signal-500" />
                {s}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="mb-1 text-xs font-semibold text-slate-500">Weaknesses</h4>
          <ul className="space-y-1 text-sm text-slate-600 dark:text-slate-300">
            {feedback.weaknesses.map((w, i) => (
              <li key={i} className="flex gap-2">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-amber-500" />
                {w}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {feedback.better_answer && (
        <div className="mt-4">
          <h4 className="mb-1 text-xs font-semibold text-slate-500">A stronger version</h4>
          <p className="rounded-lg bg-white p-3 text-sm leading-relaxed dark:bg-ink-900">
            {feedback.better_answer}
          </p>
        </div>
      )}

      {feedback.communication_tips.length > 0 && (
        <div className="mt-4">
          <h4 className="mb-1 text-xs font-semibold text-slate-500">Communication tips</h4>
          <ul className="space-y-1 text-sm text-slate-600 dark:text-slate-300">
            {feedback.communication_tips.map((t, i) => (
              <li key={i} className="flex gap-2">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-slate-400" />
                {t}
              </li>
            ))}
          </ul>
        </div>
      )}

      <Button size="sm" variant="ghost" className="mt-3" onClick={onPracticeAgain}>
        Practice again
      </Button>
    </div>
  );
}
