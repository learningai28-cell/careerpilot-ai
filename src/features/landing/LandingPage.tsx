import { Link, Navigate } from "react-router-dom";
import {
  Check,
  FileEdit,
  FileText,
  MessagesSquare,
  ScanSearch,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/features/auth/AuthContext";
import { useTheme } from "@/shared/hooks/useTheme";
import { Card, CardBody, CardHeader } from "@/shared/components/Card";
import { ConsentBanner } from "@/features/consent/ConsentBanner";
import { FREE_TIER_LIMITS } from "@/shared/lib/usageLimits";

const btnBase =
  "inline-flex h-11 items-center justify-center rounded-xl px-5 text-sm font-medium transition-colors";
const btnPrimary = `${btnBase} bg-signal-500 text-white hover:bg-signal-600`;
const btnSecondary = `${btnBase} border border-line-light bg-transparent text-ink-950 hover:bg-paper-100 dark:border-line-dark dark:text-paper-50 dark:hover:bg-ink-800`;

const modules: { title: string; description: string; icon: LucideIcon }[] = [
  {
    title: "Resume Analyzer",
    description:
      "Upload your resume and get an ATS score with strengths, gaps, and section-by-section rewrite suggestions.",
    icon: FileText,
  },
  {
    title: "JD Analyzer",
    description:
      "Paste any job description, break it down, and see a match score against your resume.",
    icon: ScanSearch,
  },
  {
    title: "AI Interview Coach",
    description:
      "Practise tailored interview questions by speaking your answers, then get scored feedback.",
    icon: MessagesSquare,
  },
  {
    title: "Resume Builder",
    description: "Choose from 10 templates, edit your details, and export a DOCX resume.",
    icon: FileEdit,
  },
];

const steps = [
  { title: "Add your resume", body: "Upload it once and use it across every module." },
  {
    title: "Get scored and matched",
    body: "See your ATS score and how well you fit the roles you are targeting.",
  },
  {
    title: "Practise and polish",
    body: "Rehearse interviews out loud and export an improved resume.",
  },
];

const faqs = [
  {
    q: "What happens to my resume and data?",
    a: "Your resume text, job descriptions, and interview answers are sent to an AI model to generate your analysis and feedback. We do not sell your data or share it with advertisers. See the Privacy Policy for the full details, including how to request deletion.",
  },
  {
    q: "How does payment work?",
    a: "Pro is a one-time payment of ₹499 that unlocks unlimited use for 3 months. Payments are processed securely by Razorpay.",
  },
  {
    q: "Can I cancel? Will I be charged again?",
    a: "There is nothing to cancel. Pro does not auto-renew and we never charge you again automatically. When the 3 months end, you simply return to the free plan unless you choose to pay again.",
  },
  {
    q: "Do I need a card to start?",
    a: "No. Signing up is free and no card is required.",
  },
];

const freeLimits: [string, number][] = [
  ["Resume analyses", FREE_TIER_LIMITS.resume_analyzer],
  ["JD analyses", FREE_TIER_LIMITS.jd_analyzer],
  ["Interview sessions", FREE_TIER_LIMITS.interview_coach],
  ["Resume auto-fills", FREE_TIER_LIMITS.resume_builder_extract],
];

function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2" aria-label="CareerPilot AI home">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-signal-500" aria-hidden="true">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M1 15 L8 2 L15 15 L8 11 Z" fill="white" />
        </svg>
      </span>
      <span className="font-display text-[15px] font-semibold tracking-tight">CareerPilot AI</span>
    </Link>
  );
}

export function LandingPage() {
  const { user, loading } = useAuth();
  useTheme(); // applies the saved/system theme (normally done by the dashboard shell)

  if (loading) {
    return (
      <div
        className="flex min-h-screen items-center justify-center bg-paper-50 dark:bg-ink-950"
        role="status"
        aria-label="Loading"
      >
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-signal-500 border-t-transparent" />
      </div>
    );
  }
  if (user) return <Navigate to="/dashboard" replace />;

  return (
    <div className="min-h-screen bg-paper-50 text-ink-950 dark:bg-ink-950 dark:text-paper-50">
      <header className="border-b border-line-light dark:border-line-dark">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <Logo />
          <nav aria-label="Account" className="flex items-center gap-2">
            <Link to="/login" className={`${btnSecondary} h-9 px-3`}>
              Log in
            </Link>
            <Link to="/signup" className={`${btnPrimary} h-9 px-3`}>
              Sign up
            </Link>
          </nav>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="mx-auto max-w-6xl px-4 pb-16 pt-14 sm:px-6 sm:pt-20">
          <div className="max-w-2xl">
            <h1 className="font-display text-3xl font-semibold leading-tight sm:text-5xl">
              Get your resume past the ATS and ace the interview.
            </h1>
            <p className="mt-4 text-base leading-relaxed text-slate-600 dark:text-slate-400 sm:text-lg">
              CareerPilot AI scores your resume, matches it to the jobs you want, and coaches you
              through mock interviews. Built for job seekers in India. Free to start, no card
              required.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link to="/signup" className={btnPrimary}>
                Get started free
              </Link>
              <Link to="/login" className={btnSecondary}>
                Log in
              </Link>
            </div>
          </div>
        </section>

        {/* Modules */}
        <section aria-labelledby="modules-heading" className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
          <h2 id="modules-heading" className="font-display text-2xl font-semibold sm:text-3xl">
            Four tools for every step of the job hunt
          </h2>
          <ul className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {modules.map(({ title, description, icon: Icon }) => (
              <li key={title}>
                <Card className="h-full">
                  <CardBody className="pt-5">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-signal-500/10 text-signal-600 dark:text-signal-400">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <h3 className="mt-4 font-display text-lg font-semibold">{title}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                      {description}
                    </p>
                  </CardBody>
                </Card>
              </li>
            ))}
          </ul>
        </section>

        {/* How it works */}
        <section aria-labelledby="how-heading" className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
          <h2 id="how-heading" className="font-display text-2xl font-semibold sm:text-3xl">
            How it works
          </h2>
          <ol className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
            {steps.map((s, i) => (
              <li key={s.title} className="flex gap-4">
                <span
                  className="data-figure flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-signal-500 text-sm font-semibold text-white"
                  aria-hidden="true"
                >
                  {i + 1}
                </span>
                <div>
                  <h3 className="font-display text-base font-semibold">{s.title}</h3>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{s.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* Pricing */}
        <section aria-labelledby="pricing-heading" className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
          <h2 id="pricing-heading" className="font-display text-2xl font-semibold sm:text-3xl">
            Simple pricing
          </h2>
          <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <h3 className="font-display text-lg font-semibold">Free</h3>
                <p className="mt-1 font-display text-3xl font-semibold">₹0</p>
              </CardHeader>
              <CardBody className="pt-4">
                <p className="text-sm text-slate-600 dark:text-slate-400">Every month:</p>
                <ul className="mt-2 space-y-2 text-sm">
                  {freeLimits.map(([label, n]) => (
                    <li key={label} className="flex items-start gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-signal-500" aria-hidden="true" />
                      <span>
                        <span className="data-figure font-medium">{n}</span> {label.toLowerCase()}
                      </span>
                    </li>
                  ))}
                </ul>
                <Link to="/signup" className={`${btnSecondary} mt-6 w-full`}>
                  Get started free
                </Link>
              </CardBody>
            </Card>
            <Card className="border-signal-500 dark:border-signal-500">
              <CardHeader>
                <h3 className="font-display text-lg font-semibold">Pro</h3>
                <p className="mt-1 font-display text-3xl font-semibold">
                  ₹499{" "}
                  <span className="text-sm font-normal text-slate-500 dark:text-slate-400">
                    for 3 months
                  </span>
                </p>
              </CardHeader>
              <CardBody className="pt-4">
                <ul className="space-y-2 text-sm">
                  {[
                    "Unlimited use of every module",
                    "One-time payment, no auto-renew",
                    "No monthly limits to plan around",
                  ].map((t) => (
                    <li key={t} className="flex items-start gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-signal-500" aria-hidden="true" />
                      <span>{t}</span>
                    </li>
                  ))}
                </ul>
                <Link to="/signup" className={`${btnPrimary} mt-6 w-full`}>
                  Sign up, then upgrade
                </Link>
              </CardBody>
            </Card>
          </div>
        </section>

        {/* FAQ */}
        <section aria-labelledby="faq-heading" className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
          <h2 id="faq-heading" className="font-display text-2xl font-semibold sm:text-3xl">
            Frequently asked questions
          </h2>
          <div className="mt-6 divide-y divide-line-light dark:divide-line-dark">
            {faqs.map((f) => (
              <details key={f.q} className="group py-4">
                <summary className="cursor-pointer list-none rounded font-display text-base font-semibold marker:hidden [&::-webkit-details-marker]:hidden">
                  {f.q}
                </summary>
                <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                  {f.a}
                </p>
              </details>
            ))}
          </div>
        </section>

        {/* Final CTA */}
        <section className="mx-auto max-w-6xl px-4 pb-16 pt-8 text-center sm:px-6">
          <Link to="/signup" className={btnPrimary}>
            Get started free
          </Link>
        </section>
      </main>

      <footer className="border-t border-line-light dark:border-line-dark">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-6 text-sm text-slate-500 dark:text-slate-400 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>© Operix</p>
          <nav aria-label="Footer" className="flex flex-wrap gap-x-5 gap-y-2">
            <Link to="/terms" className="hover:underline">
              Terms
            </Link>
            <Link to="/privacy" className="hover:underline">
              Privacy
            </Link>
            <a href="mailto:hello@operix.co.in" className="hover:underline">
              hello@operix.co.in
            </a>
          </nav>
        </div>
      </footer>

      <ConsentBanner />
    </div>
  );
}
