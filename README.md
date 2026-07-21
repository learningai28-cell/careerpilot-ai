# CareerPilot AI — Module 0: Scaffold, Auth, Dashboard Shell, Theme

This is the foundation every future module mounts into. It includes: project
scaffold, Supabase-backed email + Google auth, protected routing, the
dashboard shell (sidebar + topbar), dark/light theme system, and the shared
component/design-token library (including the signature `ScoreGauge`
component every module will reuse).

**Presentation Coach is descoped for now** — removed from nav, routing, and
the dashboard grid per product decision. Its DB tables were never created,
so reviving it later is additive, not a migration to undo.

## What's included

- **Auth** — email/password + Google OAuth via Supabase, session-aware routing
- **Dashboard shell** — sidebar nav (3 active modules wired as routes with
  placeholder empty states), topbar with theme toggle, usage badge, and sign-out
- **Usage caps** — free-tier monthly limits per module (resume analyses: 3,
  JD analyses: 3, interview sessions: 5, roadmaps: 1). Enforced two places:
  - Client: `useUsage()` hook + `UsageBadge` component show "2/3 used" in
    the topbar, reading `src/shared/lib/usageLimits.ts`
  - Server: `supabase/functions/_shared/checkUsage.ts` — every future
    AI-calling Edge Function calls `checkUsageLimit()` before spending any
    tokens, and `logUsageEvent()` after a successful call. This is the real
    enforcement; the client badge is just a mirror of it for UX.
  - `profiles.plan` (`'free' | 'pro'`) gates this — Pro is unlimited.
    Nothing wires up billing yet; that's a later module.
- **Theme system** — light/dark/system, persisted, CSS-variable driven
- **Design tokens** — `tailwind.config.ts` + `src/styles/globals.css`
- **Shared component library** — `Button`, `Card`, `Input`, `EmptyState`,
  `Skeleton`, `UsageBadge`, and the signature `ScoreGauge` (altimeter-style
  arc used for every score across every module — ATS score, match %,
  interview score — so the whole product speaks one visual language)
- **DB migrations** — `0001_init_profiles.sql` (profiles + usage ledger +
  auto-provision trigger), `0002_usage_plans.sql` (plan tier + usage index)

## Module 1: Resume Analyzer (new)

**Product decision baked in:** one active resume per user, replaced on
upload — not a resume library. Simplifies both the schema (`unique(user_id)`
on `resumes`) and every query to "the" resume.

**Flow:** drag-and-drop upload → file goes to the private `resumes` storage
bucket → `resumes` row upserted → `analyze-resume` Edge Function is invoked →
that function checks the usage cap first, extracts text (PDF via `pdf-parse`,
DOCX via `mammoth`, both via Deno's `npm:` specifier support), calls Claude
for structured JSON, persists a `resume_analyses` row, logs the usage event,
and returns the result. The page renders it as: ATS score in the `ScoreGauge`,
strengths/weaknesses cards, missing-keyword chips, formatting issues, a
skills-gap bar chart, section-by-section feedback, and a copyable improved
summary.

**New migration:** `0003_resume_analyzer.sql` — `resumes`, `resume_analyses`,
and the `resumes` storage bucket with folder-scoped RLS.

**New Edge Function:** `supabase/functions/analyze-resume/` — deploy with
`supabase functions deploy analyze-resume`, and set the Anthropic key first:
```bash
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
```

## Module 3: Interview Coach (new)

**Product decision baked in:** JD Analyzer isn't real yet, so sessions are
generated from the resume + a manually-entered target role, experience
years, and difficulty — not a linked job description. `interview_sessions`
has no `jd_id` column yet; one gets added via a later migration when JD
Analyzer ships for real, without reworking this table.

**Flow:** setup form → `generate-interview` Edge Function checks the usage
cap (5 sessions/month free), pulls the cached resume text, and asks Claude
for 8 questions (2 each: HR, technical, behavioural, case study), each with
a STAR-framework sample answer and follow-ups, persisted to
`interview_questions`. The page groups them by category. Each question has
a "Practice this answer" flow — typed answer goes to the `score-answer`
Edge Function (not usage-capped itself; capping happens once at generation),
which returns a score (shown in the `ScoreGauge`), strengths, weaknesses, a
rewritten stronger answer, a confidence read, and communication tips,
persisted to `interview_answers`.

**New migration:** `0004_interview_coach.sql` — `interview_sessions`,
`interview_questions`, `interview_answers`, RLS scoped through the session
owner.

**New Edge Functions:** `generate-interview/` and `score-answer/` — deploy
both:
```bash
supabase functions deploy generate-interview
supabase functions deploy score-answer
```

## Module: Resume Builder (new)

**Two ways to start:** auto-extract structured fields from your existing
Resume Analyzer upload via AI, or fill in a blank form manually — both feed
the same editable data, and you choose per-session.

**Cost-aware by design:** only the auto-extract action calls Claude (and is
usage-capped at `resume_builder_extract`, 2/month free). Manual entry,
editing, switching templates, and downloading are all free and unlimited —
there's no AI cost on those paths, so no reason to gate them.

**10 templates**, implemented as configurable variations (layout + accent
color + font pairing + density) on one shared rendering engine
(`ResumeTemplateRenderer`) rather than 10 separate components — easier to
maintain, and adding an 11th template later is just one more config entry,
not a new component.

**PDF export** uses the browser's native print-to-PDF (via a print-scoped
CSS rule that hides the rest of the app) rather than a client-side
rasterizing library. This produces a sharp, real-text PDF — which matters
here specifically, since ATS parsers read actual text far better than a
rasterized image of one.

**New migration:** `0005_resume_builder.sql` — `resume_profile_data`
(one record per user, same single-active-record pattern as `resumes`).

**New Edge Function:** `extract-resume-data` — deploy via the Supabase
Dashboard using `supabase/functions-dashboard-copy-paste/extract-resume-data.ts`
(same copy-paste pattern as the other three functions).

## Module: JD Analyzer (new — closes a long-open gap)

**Product decision:** one active JD per user, replaced on new paste — same
pattern as `resumes`. Breakdown (required/preferred skills, responsibilities,
etc.) and the resume match (score, missing keywords, gap, recommendations)
are combined into one Claude call and one `jd_analyses` row, since there's
only ever one active resume — "match" is never ambiguous about what it's
matching against.

**Also included:** `interview_sessions` gains a nullable `jd_id` column —
the long-planned link flagged back in the Interview Coach migration's
comments. The column exists now; wiring the Interview Coach UI to actually
use it (let someone generate questions grounded in a specific JD, not just
resume + manually-typed role) is the next follow-up, not done in this pass.

**New migration:** `0006_jd_analyzer.sql`

**New Edge Function:** `analyze-jd` — deploy via
`supabase/functions-dashboard-copy-paste/analyze-jd.ts`, same copy-paste
pattern as the other four functions.

## Interview Coach ↔ JD Analyzer link (new — closes the last long-open gap)

If a JD has been analyzed, the Interview Coach setup form shows an extra
option: **"Base questions on my analyzed JD"** instead of a manually typed
role. When selected, `generate-interview` pulls the actual JD text and
grounds technical/case-study questions in its real requirements — not just
the role title. Falls back to manual entry seamlessly if no JD exists yet;
nothing about the existing manual flow changed.

`interview_sessions.jd_id` (added in the JD Analyzer migration) now
actually gets populated when this option is used.

## Interview Coach audio (new — free, browser-native, no new backend)

Two independent features, both using the browser's built-in Web Speech
API rather than any paid transcription/TTS service:

- **Listen to a question** — a speaker icon next to each question reads it
  (plus its follow-ups) aloud via `SpeechSynthesis`. Widely supported;
  the button only renders if the browser actually supports it.
- **Speak your answer** — a mic icon in the practice textarea transcribes
  speech to text live via `SpeechRecognition` (Chrome/Edge — prefixed as
  `webkitSpeechRecognition`). **Not supported in Firefox or most Safari
  versions** — the mic button simply doesn't render there, and typing
  keeps working exactly as before. No degraded/broken state, just a
  narrower feature surface on unsupported browsers.

New reusable hooks: `src/shared/hooks/useSpeechSynthesis.ts` and
`useSpeechRecognition.ts` — written generically enough to reuse in any
future module that wants audio, not Interview-Coach-specific.

**No Edge Function or database changes** — this is 100% client-side.

## Resume Builder Suggestions panel (new — free, reuses existing AI output)

Shown only on the edit screen when the current draft came from **auto-fill**
(not manual entry) — surfaces already-generated results from Resume
Analyzer (improved summary, missing keywords) and, if run, JD Analyzer
(missing keywords) as review-and-apply suggestions:

- **Suggested summary** — one click to swap it in, never auto-applied
- **Missing keywords** — click a chip to add it to Skills; never touches
  experience bullets

No new AI calls, no new cost — this is purely reusing data that already
exists in `resume_analyses` / `jd_analyses`. No Edge Function or database
changes either.

## Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Create a Supabase project** at supabase.com, then copy `.env.example` to
   `.env` and fill in your project URL and anon key:
   ```bash
   cp .env.example .env
   ```

3. **Run the migrations, in order** — in the Supabase SQL editor, run
   `0001_init_profiles.sql`, `0002_usage_plans.sql`,
   `0003_resume_analyzer.sql`, `0004_interview_coach.sql`,
   `0005_resume_builder.sql`, then `0006_jd_analyzer.sql`.

4. **Enable Google OAuth (optional)** — Supabase Dashboard → Authentication →
   Providers → Google, add your OAuth client ID/secret.

5. **Run the dev server**
   ```bash
   npm run dev
   ```

6. Sign up at `/signup` — a profile row is auto-created via the DB trigger —
   then you'll land on `/dashboard` with all 5 module tiles visible
   (placeholders for now).

## Design system notes

- **Palette**: deep ink navy (`#0B1220`) / cool paper white (`#F7F8FA`) base,
  emerald "signal" green (`#17B890`) as the single primary accent, amber for
  attention states. No cream/terracotta, no pure black+neon — deliberately
  avoided the current AI-generated-design defaults.
- **Type**: Space Grotesk (display, headings only), Inter (body), JetBrains
  Mono (every numeric score/metric in the product — gives the dashboard an
  "instrument panel" feel that quietly reinforces the "Pilot" name).
- **Signature element**: the `ScoreGauge` — a semicircular altimeter-style
  arc with a waypoint marker. This is the one recurring visual motif tying
  the product name to the UI, and it will be reused, not reinvented, in
  every module that produces a score.

## Next

Active scope is now Modules 0-3 (scaffold, Resume Analyzer, and Interview
Coach are real; JD Analyzer exists only as a design mockup in the standalone
preview page). Both **Career Roadmap** and **Presentation Coach** are
descoped — product decision to keep the build tight rather than wide.
Their schemas are preserved in the architecture doc's backlog section if
either gets revived later.

The natural next step is building JD Analyzer for real, closing the gap
between the approved preview and the live codebase.
