import { ScanSearch } from "lucide-react";
import { Card } from "@/shared/components/Card";
import { ScoreGauge } from "@/shared/components/ScoreGauge";
import { EmptyState } from "@/shared/components/EmptyState";
import { Skeleton } from "@/shared/components/Skeleton";
import { useJD, useJDAnalysis } from "./hooks";
import { JDInputCard } from "./components/JDInputCard";
import { SkillsBreakdown } from "./components/SkillsBreakdown";
import { ResponsibilitiesAndExperience } from "./components/ResponsibilitiesAndExperience";
import { MissingKeywordsAndGap } from "./components/MissingKeywordsAndGap";

export function JDAnalyzerPage() {
  const { data: jd, isLoading: jdLoading } = useJD();
  const { data: analysis, isLoading: analysisLoading, refetch } = useJDAnalysis();

  const loading = jdLoading || analysisLoading;

  return (
    <div className="mx-auto max-w-4xl animate-fade-up">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-semibold">JD Analyzer</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Paste a job description to break it down and match it against your resume.
        </p>
      </div>

      <div className="mb-6">
        <JDInputCard onAnalyzed={() => refetch()} />
      </div>

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : !jd || !analysis ? (
        <EmptyState
          icon={<ScanSearch size={20} />}
          title="No analysis yet"
          description="Paste a job description above and click Analyze to see your match."
        />
      ) : (
        <div className="space-y-6">
          <Card className="p-6">
            <div className="flex flex-wrap items-center gap-10">
              <ScoreGauge score={analysis.match_score} label="Resume match" />
              <div className="max-w-sm text-sm text-slate-500 dark:text-slate-400">
                Matched against your uploaded resume ·{" "}
                {analysis.match_score >= 70
                  ? "Strong match — small refinements could push this further."
                  : analysis.match_score >= 40
                  ? "Decent overlap with clear gaps to close — see below."
                  : "Significant gaps found. Work through the recommendations below."}
              </div>
            </div>
          </Card>

          <SkillsBreakdown
            requiredSkills={analysis.required_skills}
            preferredSkills={analysis.preferred_skills}
          />
          <ResponsibilitiesAndExperience
            responsibilities={analysis.responsibilities}
            experienceRequired={analysis.experience_required}
            softSkills={analysis.soft_skills}
            technicalSkills={analysis.technical_skills}
          />
          <MissingKeywordsAndGap
            missingKeywords={analysis.missing_keywords}
            skillsGap={analysis.skills_gap}
          />

          <Card>
            <div className="px-5 pt-5">
              <h3 className="font-display text-sm font-semibold">Recommended improvements</h3>
            </div>
            <div className="px-5 pb-5">
              <ul className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-300">
                {analysis.recommendations.map((r, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-signal-500" />
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
