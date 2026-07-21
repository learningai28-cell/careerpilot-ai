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

// The app can be deployed two ways: under GitHub Pages' project subpath
// (/careerpilot-ai/...) right now, or at a custom domain's root (/...)
// later once that migration happens. React Router needs to know which one
// is active so client-side navigation (Link, Navigate, useNavigate) keeps
// the correct prefix instead of silently dropping it — this is computed
// at runtime from the actual URL rather than hardcoded, so it keeps
// working after the domain switch without another code change.
const basename = window.location.pathname.startsWith("/careerpilot-ai") ? "/careerpilot-ai" : "/";

export const router = createBrowserRouter(
  [
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
  ],
  { basename }
);
