import { Suspense } from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";
import { LoginPage } from "@/features/auth/LoginPage";
import { SignupPage } from "@/features/auth/SignupPage";
import { ForgotPasswordPage } from "@/features/auth/ForgotPasswordPage";
import { ResetPasswordPage } from "@/features/auth/ResetPasswordPage";
import { ProtectedRoute } from "@/features/auth/ProtectedRoute";
import { DashboardShell } from "@/shared/layout/DashboardShell";
import { LandingPage } from "@/features/landing/LandingPage";
import { lazyWithReload } from "@/shared/lib/lazyWithReload";
import { ContentSpinner, PageSpinner } from "@/shared/components/PageSpinner";

// Feature pages are code-split. lazyWithReload reloads once if a chunk from
// a previous deploy no longer exists (see src/shared/lib/lazyWithReload.ts).
const DashboardHome = lazyWithReload(() =>
  import("@/features/dashboard/DashboardHome").then((m) => ({ default: m.DashboardHome }))
);
const ResumeAnalyzerPage = lazyWithReload(() =>
  import("@/features/resume-analyzer/ResumeAnalyzerPage").then((m) => ({ default: m.ResumeAnalyzerPage }))
);
const InterviewCoachPage = lazyWithReload(() =>
  import("@/features/interview-coach/InterviewCoachPage").then((m) => ({ default: m.InterviewCoachPage }))
);
const ResumeBuilderPage = lazyWithReload(() =>
  import("@/features/resume-builder/ResumeBuilderPage").then((m) => ({ default: m.ResumeBuilderPage }))
);
const JDAnalyzerPage = lazyWithReload(() =>
  import("@/features/jd-analyzer/JDAnalyzerPage").then((m) => ({ default: m.JDAnalyzerPage }))
);
const BillingPage = lazyWithReload(() =>
  import("@/features/billing/BillingPage").then((m) => ({ default: m.BillingPage }))
);
const TermsPage = lazyWithReload(() =>
  import("@/features/legal/TermsPage").then((m) => ({ default: m.TermsPage }))
);
const PrivacyPage = lazyWithReload(() =>
  import("@/features/legal/PrivacyPage").then((m) => ({ default: m.PrivacyPage }))
);

const page = (el: JSX.Element) => <Suspense fallback={<PageSpinner />}>{el}</Suspense>;
// Inside the dashboard shell, keep the sidebar/topbar and only spin the content area.
const content = (el: JSX.Element) => <Suspense fallback={<ContentSpinner />}>{el}</Suspense>;

// The app is served from the domain root, so no router basename is needed.
export const router = createBrowserRouter([
  // Public landing page (logged-in users are sent on to /dashboard). Eager,
  // like the auth pages, because it is the first paint for new visitors.
  { path: "/", element: <LandingPage /> },
  { path: "/login", element: <LoginPage /> },
  { path: "/signup", element: <SignupPage /> },
  { path: "/forgot-password", element: <ForgotPasswordPage /> },
  { path: "/reset-password", element: <ResetPasswordPage /> },
  { path: "/terms", element: page(<TermsPage />) },
  { path: "/privacy", element: page(<PrivacyPage />) },
  {
    element: <ProtectedRoute />,
    children: [
      {
        path: "/dashboard",
        element: <DashboardShell />,
        children: [
          { index: true, element: content(<DashboardHome />) },
          { path: "resume-analyzer", element: content(<ResumeAnalyzerPage />) },
          { path: "resume-builder", element: content(<ResumeBuilderPage />) },
          { path: "jd-analyzer", element: content(<JDAnalyzerPage />) },
          { path: "interview-coach", element: content(<InterviewCoachPage />) },
          { path: "billing", element: content(<BillingPage />) },
        ],
      },
    ],
  },
  { path: "*", element: <Navigate to="/dashboard" replace /> },
]);
