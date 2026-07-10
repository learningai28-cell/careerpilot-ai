// supabase/functions/_shared/checkUsage.ts
//
// Every AI-calling Edge Function (analyze-resume, analyze-jd,
// generate-interview, generate-roadmap, ...) must call this FIRST, before
// spending any tokens on Claude. It is the server-side enforcement half of
// the usage-cap system; src/shared/lib/usageLimits.ts is the client-side
// display half. Keep the numbers in both files in sync.
//
// Usage in a function's index.ts:
//
//   const gate = await checkUsageLimit(supabaseAdmin, userId, "resume_analyzer");
//   if (!gate.allowed) {
//     return new Response(JSON.stringify({ error: gate.reason }), { status: 429 });
//   }
//   ... call Claude ...
//   await logUsageEvent(supabaseAdmin, userId, "resume_analyzer", tokensUsed);

import type { SupabaseClient } from "npm:@supabase/supabase-js@2.45.0";

const FREE_TIER_LIMITS: Record<string, number> = {
  resume_analyzer: 3,
  jd_analyzer: 3,
  interview_coach: 5,
  career_roadmap: 1,
};

export async function checkUsageLimit(
  supabase: SupabaseClient,
  userId: string,
  module: string
): Promise<{ allowed: boolean; reason?: string }> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("plan")
    .eq("id", userId)
    .single();

  if (profile?.plan === "pro") return { allowed: true };

  const limit = FREE_TIER_LIMITS[module];
  if (limit === undefined) return { allowed: true }; // ungated module

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const { count } = await supabase
    .from("usage_events")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("module", module)
    .gte("created_at", startOfMonth.toISOString());

  if ((count ?? 0) >= limit) {
    return {
      allowed: false,
      reason: `Free plan limit reached (${limit}/month for this module). Upgrade to Pro for unlimited use.`,
    };
  }

  return { allowed: true };
}

export async function logUsageEvent(
  supabase: SupabaseClient,
  userId: string,
  module: string,
  tokensUsed?: number
) {
  await supabase.from("usage_events").insert({ user_id: userId, module, tokens_used: tokensUsed });
}
