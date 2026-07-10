import { FileText } from "lucide-react";
import { Card } from "@/shared/components/Card";
import { ScoreGauge } from "@/shared/components/ScoreGauge";
import { EmptyState } from "@/shared/components/EmptyState";
import { Skeleton } from "@/shared/components/Skeleton";
import { useResume, useResumeAnalysis } from "./hooks";
import { UploadCard } from "./components/UploadCard";
import { StrengthsWeaknesses } from "./components/StrengthsWeaknesses";
import { KeywordsAndFormatting } from "./components/KeywordsAndFormatting";
import { SkillsGap } from "./components/SkillsGap";
import { SectionFeedback } from "./components/SectionFeedback";
import { ImprovedSummary } from "./components/ImprovedSummary";

export function ResumeAnalyzerPage() {
  const { data: resume, isLoading: resumeLoading } = useResume();
  const { data: analysis, isLoading: analysisLoading, refetch } = useResumeAnalysis();

  return (
    <div className="mx-auto max-w-4xl animate-fade-up">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-semibold">Resume Analyzer</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          ATS score, strengths, gaps, and section-by-section rewrites.
        </p>
      </div>

      <div className="mb-6">
        <UploadCard onAnalyzed={() => refetch()} />
      </div>

      {resumeLoading || analysisLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : !resume ? (
        <EmptyState
          icon={<FileText size={20} />}
          title="No resume yet"
          description="Upload a PDF or DOCX above to get your ATS score and a full breakdown."
        />
      ) : !analysis ? (
        <EmptyState
          icon={<FileText size={20} />}
          title="Ready to analyze"
          description="Your resume is uploaded. Analysis will start automatically, or re-upload to trigger it again."
        />
      ) : (
        <div className="space-y-6">
          <Card className="p-6">
            <div className="flex flex-wrap items-center gap-10">
              <ScoreGauge score={analysis.ats_score} label="ATS score" />
              <div className="max-w-sm text-sm text-slate-500 dark:text-slate-400">
                Analyzed {new Date(analysis.created_at).toLocaleDateString()} ·{" "}
                {analysis.ats_score >= 70
                  ? "Strong shape — small refinements below could push this further."
                  : analysis.ats_score >= 40
                  ? "Solid foundation with clear gaps to close — see below."
                  : "Significant gaps found. Work through the sections below in order."}
              </div>
            </div>
          </Card>

          <StrengthsWeaknesses strengths={analysis.strengths} weaknesses={analysis.weaknesses} />
          <KeywordsAndFormatting
            missingKeywords={analysis.missing_keywords}
            formattingIssues={analysis.formatting_issues}
          />
          <SkillsGap items={analysis.skills_gap} />
          <SectionFeedback items={analysis.section_feedback} />
          <ImprovedSummary text={analysis.improved_summary} />
        </div>
      )}
    </div>
  );
}
