import { FileText, ScanSearch, MessagesSquare } from "lucide-react";
import { ModuleCard } from "./ModuleCard";
import { ScoreGauge } from "@/shared/components/ScoreGauge";
import { Card, CardBody, CardHeader } from "@/shared/components/Card";
import { useAuth } from "@/features/auth/AuthContext";

const modules = [
  {
    to: "/dashboard/resume-analyzer",
    title: "Resume Analyzer",
    description: "ATS score, strengths, gaps, and section-by-section rewrites.",
    icon: FileText,
  },
  {
    to: "/dashboard/jd-analyzer",
    title: "JD Analyzer",
    description: "Break down any job post and match it against your resume.",
    icon: ScanSearch,
  },
  {
    to: "/dashboard/interview-coach",
    title: "Interview Coach",
    description: "Tailored questions, STAR answers, and live mock scoring.",
    icon: MessagesSquare,
  },
] as const;

export function DashboardHome() {
  const { user } = useAuth();
  const firstName = user?.email?.split("@")[0];

  return (
    <div className="mx-auto max-w-5xl animate-fade-up">
      <div className="mb-8">
        <h1 className="font-display text-2xl font-semibold">
          Welcome back{firstName ? `, ${firstName}` : ""}
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Here's where you left off, and where to go next.
        </p>
      </div>

      <Card className="mb-8">
        <CardHeader className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-base font-semibold">Readiness overview</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              A composite of your latest resume, match, and interview scores.
            </p>
          </div>
        </CardHeader>
        <CardBody className="flex flex-wrap items-center gap-10">
          <ScoreGauge score={0} label="Overall readiness" />
          <p className="max-w-sm text-sm text-slate-500 dark:text-slate-400">
            Nothing scored yet. Upload a resume to get your first ATS score — it will anchor
            every other module from here.
          </p>
        </CardBody>
      </Card>

      <h2 className="mb-3 font-display text-base font-semibold">Modules</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {modules.map((m) => (
          <ModuleCard key={m.to} {...m} />
        ))}
      </div>
    </div>
  );
}
