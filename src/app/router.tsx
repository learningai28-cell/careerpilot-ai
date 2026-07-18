import { createBrowserRouter, Navigate } from "react-router-dom";
import { ScanSearch } from "lucide-react";
import { LoginPage } from "@/features/auth/LoginPage";
import { SignupPage } from "@/features/auth/SignupPage";
import { ProtectedRoute } from "@/features/auth/ProtectedRoute";
import { DashboardShell } from "@/shared/layout/DashboardShell";
import { DashboardHome } from "@/features/dashboard/DashboardHome";
import { ModulePlaceholder } from "@/shared/components/ModulePlaceholder";
import { ResumeAnalyzerPage } from "@/features/resume-analyzer/ResumeAnalyzerPage";
import { InterviewCoachPage } from "@/features/interview-coach/InterviewCoachPage";
import { ResumeBuilderPage } from "@/features/resume-builder/ResumeBuilderPage";

export const router = createBrowserRouter([
  { path: "/", element: <Navigate to="/dashboard" replace /> },
  { path: "/login", element: <LoginPage /> },
  { path: "/signup", element: <SignupPage /> },
  {
    element: <ProtectedRoute />,
    children: [
      {
        path: "/dashboard",
        element: <DashboardShell />,
        children: [
          { index: true, element: <DashboardHome /> },
          {
            path: "resume-analyzer",
            element: <ResumeAnalyzerPage />,
          },
          {
            path: "resume-builder",
            element: <ResumeBuilderPage />,
          },
          {
            path: "jd-analyzer",
            element: <ModulePlaceholder icon={ScanSearch} title="JD Analyzer" />,
          },
          {
            path: "interview-coach",
            element: <InterviewCoachPage />,
          },
        ],
      },
    ],
  },
  { path: "*", element: <Navigate to="/dashboard" replace /> },
]);
