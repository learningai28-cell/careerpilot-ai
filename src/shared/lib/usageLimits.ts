/**
 * Free-tier monthly usage caps, keyed by module.
 *
 * This is intentionally the ONLY place these numbers live. The client
 * reads it to show "2/3 used" style badges; Edge Functions read the same
 * shape (duplicated server-side in supabase/functions/_shared/usageLimits.ts
 * since Edge Functions can't import from src/) to actually block a request
 * once a free user is over their cap. If you change a limit, change it in
 * both places.
 */
export const FREE_TIER_LIMITS: Record<string, number> = {
  resume_analyzer: 3,
  jd_analyzer: 3,
  interview_coach: 5,
  career_roadmap: 1,
};

export type ModuleKey = keyof typeof FREE_TIER_LIMITS;

export const MODULE_LABELS: Record<ModuleKey, string> = {
  resume_analyzer: "Resume analyses",
  jd_analyzer: "JD analyses",
  interview_coach: "Interview sessions",
  career_roadmap: "Roadmaps",
};
