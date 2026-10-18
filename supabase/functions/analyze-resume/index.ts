// supabase/functions/analyze-resume/index.ts
//
// Deploy: supabase functions deploy analyze-resume
// Requires env vars (set via `supabase secrets set`): ANTHROPIC_API_KEY
// SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are injected automatically by
// the platform for every Edge Function.

import { createClient } from "npm:@supabase/supabase-js@2.45.0";
import { consumeUsage, recordUsageTokens, releaseUsage } from "../_shared/usage.ts";
import { extractResumeText } from "../_shared/extractText.ts";
import { CLAUDE_TASKS, callClaudeJSON, isClaudeBusyError } from "../_shared/claudeClient.ts";
import {
  RESUME_ANALYSIS_SYSTEM_PROMPT,
  buildResumeAnalysisUserPrompt,
} from "../_shared/prompts/resumeAnalysis.ts";

const MODULE = "resume_analyzer";

interface ResumeAnalysisJSON {
  ats_score: number;
  strengths: string[];
  weaknesses: string[];
  missing_keywords: string[];
  formatting_issues: string[];
  skills_gap: { skill: string; importance: string; present: boolean }[];
  section_feedback: { section: string; feedback: string; score: number }[];
  improved_summary: string;
}

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

    // Client bound to the caller's JWT so RLS applies to every query below.
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) return cors({ error: "Invalid session" }, 401);

    // 1. Load the user's resume row (single active resume per user).
    const { data: resume, error: resumeError } = await supabase
      .from("resumes")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (resumeError || !resume) {
      return cors({ error: "No resume found. Upload one first." }, 404);
    }

    // 2. Extract text if not already cached from a previous run.
    let resumeText = resume.raw_text as string | null;
    if (!resumeText) {
      const { data: fileBlob, error: downloadError } = await supabase.storage
        .from("resumes")
        .download(resume.file_path);
      if (downloadError || !fileBlob) {
        return cors({ error: "Could not read the uploaded resume file." }, 500);
      }
      const bytes = await fileBlob.arrayBuffer();
      resumeText = await extractResumeText(bytes, resume.file_type as "pdf" | "docx");

      await supabase.from("resumes").update({ raw_text: resumeText }).eq("id", resume.id);
    }

    if (!resumeText || resumeText.length < 50) {
      return cors(
        { error: "Couldn't extract enough text from this file. Try a different export." },
        422
      );
    }

    // 3. Usage cap — checked and recorded atomically right before the
    // Claude spend, and refunded below if anything after it fails.
    const usage = await consumeUsage(supabase, MODULE);
    if (!usage.allowed) return cors({ error: usage.reason }, 429);

    let tokensUsed: number;
    let savedRow: unknown;
    try {
      // 4. Call Claude for structured analysis.
      const result = await callClaudeJSON<ResumeAnalysisJSON>(
        RESUME_ANALYSIS_SYSTEM_PROMPT,
        buildResumeAnalysisUserPrompt(resumeText),
        CLAUDE_TASKS.resumeAnalysis
      );
      const analysis = result.data;
      tokensUsed = result.tokensUsed;

      // 5. Persist.
      const { data, error: insertError } = await supabase
        .from("resume_analyses")
        .insert({
          resume_id: resume.id,
          user_id: user.id,
          ats_score: analysis.ats_score,
          strengths: analysis.strengths,
          weaknesses: analysis.weaknesses,
          missing_keywords: analysis.missing_keywords,
          formatting_issues: analysis.formatting_issues,
          skills_gap: analysis.skills_gap,
          section_feedback: analysis.section_feedback,
          improved_summary: analysis.improved_summary,
          model_version: CLAUDE_TASKS.resumeAnalysis.model,
        })
        .select()
        .single();

      if (insertError || !data) throw new Error(`Failed to save analysis: ${insertError?.message}`);
      savedRow = data;
    } catch (err) {
      // Don't charge the user's quota for a failed analysis.
      await releaseUsage(usage.eventId);
      throw err;
    }

    // 6. Record token spend for cost reporting.
    await recordUsageTokens(usage.eventId, tokensUsed);

    return cors({ analysis: savedRow });
  } catch (err) {
    console.error(err);
    // Claude overloaded/timing out after retries: usage was already refunded,
    // so tell the user to retry rather than showing a generic error.
    if (isClaudeBusyError(err)) return cors({ error: err.message }, 503);
    return cors({ error: "Unexpected error analyzing resume." }, 500);
  }
});
