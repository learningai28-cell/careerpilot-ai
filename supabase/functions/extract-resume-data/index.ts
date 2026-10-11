// supabase/functions/extract-resume-data/index.ts
//
// Deploy: supabase functions deploy extract-resume-data
// Requires ANTHROPIC_API_KEY as an Edge Function secret.

import { createClient } from "npm:@supabase/supabase-js@2.45.0";
import { consumeUsage, recordUsageTokens, releaseUsage } from "../_shared/usage.ts";
import { CLAUDE_TASKS, callClaudeJSON, isClaudeBusyError } from "../_shared/claudeClient.ts";
import {
  RESUME_DATA_EXTRACTION_SYSTEM_PROMPT,
  buildResumeDataExtractionUserPrompt,
} from "../_shared/prompts/resumeDataExtraction.ts";

const MODULE = "resume_builder_extract";

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

    const { data: resume } = await supabase
      .from("resumes")
      .select("raw_text")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!resume?.raw_text) {
      return cors({ error: "Upload and analyze a resume first — extraction reads from it." }, 422);
    }

    // Usage cap — checked and recorded atomically right before the Claude
    // spend, and refunded below if anything after it fails.
    const usage = await consumeUsage(supabase, MODULE);
    if (!usage.allowed) return cors({ error: usage.reason }, 429);

    let tokensUsed: number;
    let savedRow: unknown;
    try {
      const result = await callClaudeJSON<any>(
        RESUME_DATA_EXTRACTION_SYSTEM_PROMPT,
        buildResumeDataExtractionUserPrompt(resume.raw_text),
        CLAUDE_TASKS.resumeDataExtraction
      );
      const extracted = result.data;
      tokensUsed = result.tokensUsed;

      const { data, error: upsertError } = await supabase
        .from("resume_profile_data")
        .upsert(
          {
            user_id: user.id,
            full_name: extracted.full_name,
            email: extracted.email,
            phone: extracted.phone,
            location: extracted.location,
            linkedin_url: extracted.linkedin_url,
            portfolio_url: extracted.portfolio_url,
            summary: extracted.summary,
            experience: extracted.experience,
            education: extracted.education,
            skills: extracted.skills,
            certifications: extracted.certifications,
            source: "extracted",
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" }
        )
        .select()
        .single();

      if (upsertError || !data) throw new Error(`Failed to save extracted data: ${upsertError?.message}`);
      savedRow = data;
    } catch (err) {
      await releaseUsage(usage.eventId);
      throw err;
    }

    await recordUsageTokens(usage.eventId, tokensUsed);

    return cors({ profile: savedRow });
  } catch (err) {
    console.error(err);
    // Claude overloaded/timing out after retries: usage was already refunded,
    // so tell the user to retry rather than showing a generic error.
    if (isClaudeBusyError(err)) return cors({ error: err.message }, 503);
    return cors({ error: "Unexpected error extracting resume data." }, 500);
  }
});
