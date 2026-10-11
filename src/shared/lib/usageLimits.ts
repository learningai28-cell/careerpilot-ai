/**
 * Free-tier monthly usage caps, keyed by module.
 *
 * DISPLAY ONLY — the client reads this to show "2/3 used" style badges.
 * The limits that actually block requests live in the consume_usage SQL
 * function (supabase/migrations/0009_payments_and_usage_hardening.sql).
 * If you change a limit, change it in both places, or the badge and the
 * real limit will disagree (as they once did for resume_analyzer: 1 vs 2).
 */
export const FREE_TIER_LIMITS: Record<string, number> = {
  resume_analyzer: 1,
  jd_analyzer: 2,
  interview_coach: 1,
  career_roadmap: 1,
  resume_builder_extract: 2,
  interview_answer: 30,
};

export type ModuleKey = keyof typeof FREE_TIER_LIMITS;

export const MODULE_LABELS: Record<ModuleKey, string> = {
  resume_analyzer: "Resume analyses",
  jd_analyzer: "JD analyses",
  interview_coach: "Interview sessions",
  career_roadmap: "Roadmaps",
  resume_builder_extract: "Resume auto-fills",
  interview_answer: "Answer feedback",
};
