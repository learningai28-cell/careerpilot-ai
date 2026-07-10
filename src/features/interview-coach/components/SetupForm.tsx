import { useState } from "react";
import { toast } from "sonner";
import { Card, CardBody } from "@/shared/components/Card";
import { Input } from "@/shared/components/Input";
import { Button } from "@/shared/components/Button";
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
  const generate = useGenerateInterview();

  const handleGenerate = async () => {
    if (!targetRole.trim()) {
      toast.error("Enter a target role first.");
      return;
    }
    try {
      await generate.mutateAsync({
        targetRole: targetRole.trim(),
        experienceYears: experienceYears ? Number(experienceYears) : null,
        difficulty,
      });
      toast.success("Interview questions ready.");
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
