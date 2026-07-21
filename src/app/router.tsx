import { createBrowserRouter, Navigate } from "react-router-dom";
import { LoginPage } from "@/features/auth/LoginPage";
import { SignupPage } from "@/features/auth/SignupPage";
import { ProtectedRoute } from "@/features/auth/ProtectedRoute";
import { DashboardShell } from "@/shared/layout/DashboardShell";
import { DashboardHome } from "@/features/dashboard/DashboardHome";
import { ResumeAnalyzerPage } from "@/features/resume-analyzer/ResumeAnalyzerPage";
import { InterviewCoachPage } from "@/features/interview-coach/InterviewCoachPage";
import { ResumeBuilderPage } from "@/features/resume-builder/ResumeBuilderPage";
import { JDAnalyzerPage } from "@/features/jd-analyzer/JDAnalyzerPage";
import { TermsPage } from "@/features/legal/TermsPage";
import { PrivacyPage } from "@/features/legal/PrivacyPage";

export const router = createBrowserRouter([
  { path: "/", element: <Navigate to="/dashboard" replace /> },
  { path: "/login", element: <LoginPage /> },
  { path: "/signup", element: <SignupPage /> },
  { path: "/terms", element: <TermsPage /> },
  { path: "/privacy", element: <PrivacyPage /> },
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
            element: <JDAnalyzerPage />,
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
