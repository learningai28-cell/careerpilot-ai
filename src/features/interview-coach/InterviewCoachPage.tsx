import { MessagesSquare } from "lucide-react";
import { EmptyState } from "@/shared/components/EmptyState";
import { Skeleton } from "@/shared/components/Skeleton";
import { useResume } from "@/features/resume-analyzer/hooks";
import { useInterviewSession, useInterviewAnswers } from "./hooks";
import { SetupForm } from "./components/SetupForm";
import { QuestionCard } from "./components/QuestionCard";
import { QuestionCategory } from "./types";

const categoryOrder: QuestionCategory[] = ["hr", "behavioural", "technical", "case_study"];
const categoryTitle: Record<QuestionCategory, string> = {
  hr: "HR questions",
  behavioural: "Behavioural questions",
  technical: "Technical questions",
  case_study: "Case study questions",
};

export function InterviewCoachPage() {
  const { data: resume, isLoading: resumeLoading } = useResume();
  const { data: sessionData, isLoading: sessionLoading } = useInterviewSession();
  const questionIds = sessionData?.questions.map((q) => q.id) ?? [];
  const { data: answers } = useInterviewAnswers(questionIds);

  const loading = resumeLoading || sessionLoading;

  return (
    <div className="mx-auto max-w-4xl animate-fade-up">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-semibold">Interview Coach</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Tailored questions, STAR sample answers, and scored practice — built from your resume.
        </p>
      </div>

      <div className="mb-6">
        <SetupForm hasResume={!!resume} />
      </div>

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : !sessionData ? (
        <EmptyState
          icon={<MessagesSquare size={20} />}
          title="No interview session yet"
          description="Set a target role above and generate your first question set."
        />
      ) : (
        <div className="space-y-8">
          {categoryOrder.map((category) => {
            const questionsInCategory = sessionData.questions.filter(
              (q) => q.category === category
            );
            if (questionsInCategory.length === 0) return null;
            return (
              <div key={category}>
                <h2 className="mb-3 font-display text-base font-semibold">
                  {categoryTitle[category]}
                </h2>
                <div className="space-y-3">
                  {questionsInCategory.map((q, i) => (
                    <QuestionCard
                      key={q.id}
                      question={q}
                      index={i}
                      existingAnswer={answers?.[q.id]}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
