// supabase/functions/analyze-jd/index.ts
//
// Deploy: supabase functions deploy analyze-jd
// Requires ANTHROPIC_API_KEY as an Edge Function secret.

import { createClient } from "npm:@supabase/supabase-js@2.45.0";
import { consumeUsage, recordUsageTokens, releaseUsage } from "../_shared/usage.ts";
import { CLAUDE_TASKS, callClaudeJSON, isClaudeBusyError } from "../_shared/claudeClient.ts";
import { JD_ANALYSIS_SYSTEM_PROMPT, buildJDAnalysisUserPrompt } from "../_shared/prompts/jdAnalysis.ts";

const MODULE = "jd_analyzer";

function cors(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json",
      "access-control-allow-origin": "*",
      "access-control-allow-headers": "authorization, x-client-info, apikey, content-type",
    },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return cors({}, 200);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return cors({ error: "Missing authorization header" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return cors({ error: "Invalid session" }, 401);

    const body = await req.json().catch(() => ({}));
    const jdText: string | undefined = body.jdText?.trim();
    const title: string | null = body.title ?? null;
    const company: string | null = body.company ?? null;

    if (!jdText || jdText.length < 50) {
      return cors({ error: "Paste the full job description text first." }, 400);
    }

    const { data: resume } = await supabase
      .from("resumes")
      .select("raw_text")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!resume?.raw_text) {
      return cors({ error: "Upload and analyze a resume first — matching needs it." }, 422);
    }

    // Usage cap — checked and recorded atomically before the JD is saved
    // or Claude is called, and refunded below if anything after it fails.
    const usage = await consumeUsage(supabase, MODULE);
    if (!usage.allowed) return cors({ error: usage.reason }, 429);

    let tokensUsed: number;
    let jd: any;
    let savedRow: unknown;
    try {
      const { data: jdRow, error: jdError } = await supabase
        .from("job_descriptions")
        .upsert(
          { user_id: user.id, title, company, raw_text: jdText, updated_at: new Date().toISOString() },
          { onConflict: "user_id" }
        )
        .select()
        .single();

      if (jdError || !jdRow) throw new Error(`Failed to save job description: ${jdError?.message}`);
      jd = jdRow;

      const result = await callClaudeJSON<any>(
        JD_ANALYSIS_SYSTEM_PROMPT,
        buildJDAnalysisUserPrompt(jdText, resume.raw_text),
        CLAUDE_TASKS.jdAnalysis
      );
      const analysis = result.data;
      tokensUsed = result.tokensUsed;

      const { data, error: insertError } = await supabase
        .from("jd_analyses")
        .insert({
          jd_id: jd.id,
          user_id: user.id,
          required_skills: analysis.required_skills,
          preferred_skills: analysis.preferred_skills,
          responsibilities: analysis.responsibilities,
          experience_required: analysis.experience_required,
          soft_skills: analysis.soft_skills,
          technical_skills: analysis.technical_skills,
          match_score: analysis.match_score,
          missing_keywords: analysis.missing_keywords,
          skills_gap: analysis.skills_gap,
          recommendations: analysis.recommendations,
        })
        .select()
        .single();

      if (insertError || !data) throw new Error(`Failed to save analysis: ${insertError?.message}`);
      savedRow = data;
    } catch (err) {
      await releaseUsage(usage.eventId);
      throw err;
    }

    await recordUsageTokens(usage.eventId, tokensUsed);

    return cors({ jd, analysis: savedRow });
  } catch (err) {
    console.error(err);
    // Claude overloaded/timing out after retries: usage was already refunded,
    // so tell the user to retry rather than showing a generic error.
    if (isClaudeBusyError(err)) return cors({ error: err.message }, 503);
    return cors({ error: "Unexpected error analyzing job description." }, 500);
  }
});
