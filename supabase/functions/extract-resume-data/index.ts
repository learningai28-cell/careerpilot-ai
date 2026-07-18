// supabase/functions/extract-resume-data/index.ts
//
// Deploy: supabase functions deploy extract-resume-data
// Requires ANTHROPIC_API_KEY as an Edge Function secret.

import { createClient } from "npm:@supabase/supabase-js@2.45.0";
import { checkUsageLimit, logUsageEvent } from "../_shared/checkUsage.ts";
import { callClaudeJSON } from "../_shared/claudeClient.ts";
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

    const gate = await checkUsageLimit(supabase, user.id, MODULE);
    if (!gate.allowed) return cors({ error: gate.reason }, 429);

    const { data: resume } = await supabase
      .from("resumes")
      .select("raw_text")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!resume?.raw_text) {
      return cors({ error: "Upload and analyze a resume first — extraction reads from it." }, 422);
    }

    const { data: extracted, tokensUsed } = await callClaudeJSON<any>(
      RESUME_DATA_EXTRACTION_SYSTEM_PROMPT,
      buildResumeDataExtractionUserPrompt(resume.raw_text)
    );

    const { data: savedRow, error: upsertError } = await supabase
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

    if (upsertError) return cors({ error: "Failed to save extracted data." }, 500);

    await logUsageEvent(supabase, user.id, MODULE, tokensUsed);

    return cors({ profile: savedRow });
  } catch (err) {
    console.error(err);
    return cors({ error: "Unexpected error extracting resume data." }, 500);
  }
});
