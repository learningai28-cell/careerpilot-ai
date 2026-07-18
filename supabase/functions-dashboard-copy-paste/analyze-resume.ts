// PASTE THIS ENTIRE FILE into the Supabase Dashboard's Edge Function editor.
// Name the function exactly: analyze-resume
//
// Everything this function needs is self-contained below (no separate
// shared files) so it works with the Dashboard's single-file editor.

import { createClient } from "npm:@supabase/supabase-js@2.45.0";
import pdfParse from "npm:pdf-parse@1.1.1";
import mammoth from "npm:mammoth@1.7.2";

const MODULE = "resume_analyzer";
const FREE_TIER_LIMITS: Record<string, number> = {
  resume_analyzer: 2,
  jd_analyzer: 2,
  interview_coach: 1,
  career_roadmap: 1,
  resume_builder_extract: 2,
};
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;
const MODEL = "claude-sonnet-4-6";

const RESUME_ANALYSIS_SYSTEM_PROMPT = `You are an expert ATS (Applicant Tracking System) analyst and senior technical recruiter with 15 years of experience reviewing resumes across industries. You give direct, specific, actionable feedback — never generic platitudes like "add more action verbs" without saying which bullet and what verb.

You will be given the raw extracted text of a resume. Analyze it and respond with ONLY a JSON object matching this exact shape:

{
  "ats_score": <integer 0-100, how well this resume would parse and rank in a typical ATS>,
  "strengths": [<3-6 specific strings, each citing something concrete in THIS resume>],
  "weaknesses": [<3-6 specific strings, each citing something concrete in THIS resume>],
  "missing_keywords": [<5-12 strings — industry-standard skills/tools/certifications this resume's field would expect but doesn't mention>],
  "formatting_issues": [<0-6 strings — concrete formatting/structure problems that hurt ATS parsing or readability; empty array if none found>],
  "skills_gap": [
    { "skill": <string>, "importance": "high"|"medium"|"low", "present": <boolean> }
  ] (6-10 entries, mix of present and missing skills relevant to this resume's apparent target role),
  "section_feedback": [
    { "section": <string, e.g. "Experience", "Summary", "Education">, "feedback": <specific string>, "score": <integer 0-100> }
  ] (one entry per section actually present in the resume),
  "improved_summary": <a rewritten 2-3 sentence professional summary in the resume owner's voice, based on their actual experience — not generic>
}

Do not wrap the JSON in markdown fences. Do not include any text outside the JSON object.`;

function buildUserPrompt(resumeText: string): string {
  return `Here is the resume text extracted from the uploaded file:\n\n---\n${resumeText}\n---\n\nAnalyze it now per the instructions.`;
}

async function callClaudeJSON<T>(systemPrompt: string, userPrompt: string) {
  const call = async (strict: boolean) => {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 4096,
        system:
          systemPrompt +
          (strict
            ? "\n\nCRITICAL: Your entire response must be a single valid JSON object. No markdown fences, no preamble, no trailing commentary."
            : ""),
        messages: [{ role: "user", content: userPrompt }],
      }),
    });
    if (!response.ok) throw new Error(`Claude API error (${response.status}): ${await response.text()}`);
    const json = await response.json();
    const textBlock = json.content.find((b: any) => b.type === "text");
    const tokensUsed = (json.usage?.input_tokens ?? 0) + (json.usage?.output_tokens ?? 0);
    const raw = (textBlock?.text ?? "").trim();
    const cleaned = raw.replace(/^```json\s*/i, "").replace(/```\s*$/, "");
    return { cleaned, tokensUsed };
  };

  let { cleaned, tokensUsed } = await call(false);
  try {
    return { data: JSON.parse(cleaned) as T, tokensUsed };
  } catch {
    const retry = await call(true);
    tokensUsed += retry.tokensUsed;
    return { data: JSON.parse(retry.cleaned) as T, tokensUsed };
  }
}

async function checkUsageLimit(supabase: any, userId: string, moduleName: string) {
  const { data: profile } = await supabase.from("profiles").select("plan").eq("id", userId).single();
  if (profile?.plan === "pro") return { allowed: true };
  const limit = FREE_TIER_LIMITS[moduleName];
  if (limit === undefined) return { allowed: true };
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  const { count } = await supabase
    .from("usage_events")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("module", moduleName)
    .gte("created_at", startOfMonth.toISOString());
  if ((count ?? 0) >= limit) {
    return { allowed: false, reason: `Free plan limit reached (${limit}/month for this module). Upgrade to Pro for unlimited use.` };
  }
  return { allowed: true };
}

async function logUsageEvent(supabase: any, userId: string, moduleName: string, tokensUsed?: number) {
  await supabase.from("usage_events").insert({ user_id: userId, module: moduleName, tokens_used: tokensUsed });
}

async function extractResumeText(fileBytes: ArrayBuffer, fileType: "pdf" | "docx"): Promise<string> {
  if (fileType === "pdf") {
    const result = await pdfParse(new Uint8Array(fileBytes));
    return result.text.trim();
  }
  const result = await mammoth.extractRawText({ buffer: new Uint8Array(fileBytes) });
  return result.value.trim();
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

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return cors({ error: "Invalid session" }, 401);

    const gate = await checkUsageLimit(supabase, user.id, MODULE);
    if (!gate.allowed) return cors({ error: gate.reason }, 429);

    const { data: resume, error: resumeError } = await supabase
      .from("resumes").select("*").eq("user_id", user.id).single();
    if (resumeError || !resume) return cors({ error: "No resume found. Upload one first." }, 404);

    let resumeText = resume.raw_text as string | null;
    if (!resumeText) {
      const { data: fileBlob, error: downloadError } = await supabase.storage.from("resumes").download(resume.file_path);
      if (downloadError || !fileBlob) return cors({ error: "Could not read the uploaded resume file." }, 500);
      const bytes = await fileBlob.arrayBuffer();
      resumeText = await extractResumeText(bytes, resume.file_type as "pdf" | "docx");
      await supabase.from("resumes").update({ raw_text: resumeText }).eq("id", resume.id);
    }

    if (!resumeText || resumeText.length < 50) {
      return cors({ error: "Couldn't extract enough text from this file. Try a different export." }, 422);
    }

    const { data: analysis, tokensUsed } = await callClaudeJSON<any>(
      RESUME_ANALYSIS_SYSTEM_PROMPT,
      buildUserPrompt(resumeText)
    );

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

    await logUsageEvent(supabase, user.id, MODULE, tokensUsed);

    return cors({ analysis: savedRow });
  } catch (err) {
    console.error(err);
    return cors({ error: "Unexpected error analyzing resume." }, 500);
  }
});
