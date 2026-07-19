import { useState } from "react";
import { toast } from "sonner";
import { Briefcase } from "lucide-react";
import { Card, CardBody } from "@/shared/components/Card";
import { Input } from "@/shared/components/Input";
import { Button } from "@/shared/components/Button";
import { useJD } from "@/features/jd-analyzer/hooks";
import { useGenerateInterview } from "../hooks";
import { Difficulty } from "../types";

const difficulties: { value: Difficulty; label: string }[] = [
  { value: "easy", label: "Easy" },
  { value: "medium", label: "Medium" },
  { value: "hard", label: "Hard" },
];

export function SetupForm({ hasResume }: { hasResume: boolean }) {
  const [targetRole, setTargetRole] = useState("");
  const [experienceYears, setExperienceYears] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [groundInJD, setGroundInJD] = useState(false);
  const generate = useGenerateInterview();
  const { data: jd } = useJD();

  const handleGenerate = async () => {
    if (!groundInJD && !targetRole.trim()) {
      toast.error("Enter a target role first.");
      return;
    }
    try {
      await generate.mutateAsync({
        targetRole: groundInJD ? undefined : targetRole.trim(),
        experienceYears: experienceYears ? Number(experienceYears) : null,
        difficulty,
        useJD: groundInJD,
      });
      toast.success(
        groundInJD ? "Interview questions ready, grounded in your JD." : "Interview questions ready."
      );
    } catch (err: any) {
      toast.error(err.message ?? "Something went wrong.");
    }
  };

  return (
    <Card className="p-6">
      {!hasResume ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Upload and analyze a resume in the Resume Analyzer first — interview questions are
          generated from it.
        </p>
      ) : (
        <div className="space-y-3">
          {jd && (
            <button
              onClick={() => setGroundInJD((v) => !v)}
              className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-colors ${
                groundInJD
                  ? "border-signal-500 bg-signal-500/5"
                  : "border-line-light dark:border-line-dark"
              }`}
            >
              <div
                className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                  groundInJD
                    ? "bg-signal-500/15 text-signal-600 dark:text-signal-400"
                    : "bg-paper-100 text-slate-400 dark:bg-ink-800"
                }`}
              >
                <Briefcase size={16} />
              </div>
              <div>
                <p className="text-sm font-medium">
                  Base questions on my analyzed JD
                  {jd.title ? ` — ${jd.title}` : ""}
                  {jd.company ? ` at ${jd.company}` : ""}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Uses the actual job posting from JD Analyzer instead of a manually typed role.
                </p>
              </div>
            </button>
          )}

          {!groundInJD && (
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-500">
                Target role
              </label>
              <Input
                placeholder="e.g. Senior Procurement Manager"
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
              />
            </div>
          )}

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="mb-1.5 block text-xs font-medium text-slate-500">
                Years of experience
              </label>
              <Input
                type="number"
                min={0}
                placeholder="7"
                value={experienceYears}
                onChange={(e) => setExperienceYears(e.target.value)}
              />
            </div>
            <div className="flex-1">
              <label className="mb-1.5 block text-xs font-medium text-slate-500">
                Difficulty
              </label>
              <div className="flex gap-1.5">
                {difficulties.map((d) => (
                  <button
                    key={d.value}
                    onClick={() => setDifficulty(d.value)}
                    className={`h-10 flex-1 rounded-xl border text-xs font-medium transition-colors ${
                      difficulty === d.value
                        ? "border-signal-500 bg-signal-500/10 text-signal-600 dark:text-signal-400"
                        : "border-line-light text-slate-500 dark:border-line-dark"
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <Button
            className="w-full"
            disabled={generate.isPending}
            onClick={handleGenerate}
          >
            {generate.isPending ? "Generating questions…" : "Generate interview questions"}
          </Button>
        </div>
      )}
    </Card>
  );
}
