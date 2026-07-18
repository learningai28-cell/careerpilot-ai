// supabase/functions/analyze-resume/index.ts
//
// Deploy: supabase functions deploy analyze-resume
// Requires env vars (set via `supabase secrets set`): ANTHROPIC_API_KEY
// SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are injected automatically by
// the platform for every Edge Function.

import { createClient } from "npm:@supabase/supabase-js@2.45.0";
import { checkUsageLimit, logUsageEvent } from "../_shared/checkUsage.ts";
import { extractResumeText } from "../_shared/extractText.ts";
import { callClaudeJSON } from "../_shared/claudeClient.ts";
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

    // 1. Usage cap check — before any parsing or Claude spend.
    const gate = await checkUsageLimit(supabase, user.id, MODULE);
    if (!gate.allowed) return cors({ error: gate.reason }, 429);

    // 2. Load the user's resume row (single active resume per user).
    const { data: resume, error: resumeError } = await supabase
      .from("resumes")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (resumeError || !resume) {
      return cors({ error: "No resume found. Upload one first." }, 404);
    }

    // 3. Extract text if not already cached from a previous run.
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

    // 4. Call Claude for structured analysis.
    const { data: analysis, tokensUsed } = await callClaudeJSON<ResumeAnalysisJSON>(
      RESUME_ANALYSIS_SYSTEM_PROMPT,
      buildResumeAnalysisUserPrompt(resumeText)
    );

    // 5. Persist.
    const { data: savedRow, error: insertError } = await supabase
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
        model_version: "claude-sonnet-4-6",
      })
      .select()
      .single();

    if (insertError) return cors({ error: "Failed to save analysis." }, 500);

    // 6. Log usage.
    await logUsageEvent(supabase, user.id, MODULE, tokensUsed);

    return cors({ analysis: savedRow });
  } catch (err) {
    console.error(err);
    return cors({ error: "Unexpected error analyzing resume." }, 500);
  }
});
