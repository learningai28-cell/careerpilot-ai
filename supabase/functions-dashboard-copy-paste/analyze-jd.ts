// PASTE THIS ENTIRE FILE into the Supabase Dashboard's Edge Function editor.
// Name the function exactly: analyze-jd

import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const MODULE = "jd_analyzer";
const FREE_TIER_LIMITS: Record<string, number> = {
  resume_analyzer: 2,
  jd_analyzer: 2,
  interview_coach: 1,
  career_roadmap: 1,
  resume_builder_extract: 2,
};
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;
const MODEL = "claude-sonnet-4-6";

const JD_ANALYSIS_SYSTEM_PROMPT = `You are an expert technical recruiter and career coach. You will be given a job description's raw text AND a candidate's resume text. Analyze the JD, then evaluate how well the resume matches it.

Respond with ONLY a JSON object matching this exact shape:

{
  "required_skills": [<string>, ...],
  "preferred_skills": [<string>, ...],
  "responsibilities": [<string>, ...],
  "experience_required": <string, e.g. "5-8 years in procurement or supply chain leadership">,
  "soft_skills": [<string>, ...],
  "technical_skills": [<string>, ...],
  "match_score": <integer 0-100, how well this specific resume matches this specific JD>,
  "missing_keywords": [<string>, ... — required/preferred skills or terms from the JD that are absent from the resume>],
  "skills_gap": [
    { "skill": <string>, "present": <boolean> }
  ] (6-10 entries pulled from required_skills and preferred_skills, marking which the resume demonstrates),
  "recommendations": [<3-5 specific strings — concrete changes to the resume that would improve the match, each citing a specific gap>]
}

Be specific and concrete throughout — cite actual terms from the JD and actual (or missing) evidence from the resume. Do not wrap the JSON in markdown fences. Do not include any text outside the JSON object.`;

function buildUserPrompt(jdText: string, resumeText: string): string {
  return `Job description:\n---\n${jdText}\n---\n\nCandidate resume:\n---\n${resumeText}\n---\n\nAnalyze the JD and evaluate the match now per the instructions.`;
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

    const gate = await checkUsageLimit(supabase, user.id, MODULE);
    if (!gate.allowed) return cors({ error: gate.reason }, 429);

    const { data: resume } = await supabase
      .from("resumes")
      .select("raw_text")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!resume?.raw_text) {
      return cors({ error: "Upload and analyze a resume first — matching needs it." }, 422);
    }

    const { data: jd, error: jdError } = await supabase
      .from("job_descriptions")
      .upsert(
        { user_id: user.id, title, company, raw_text: jdText, updated_at: new Date().toISOString() },
        { onConflict: "user_id" }
      )
      .select()
      .single();

    if (jdError || !jd) return cors({ error: "Failed to save job description." }, 500);

    const { data: analysis, tokensUsed } = await callClaudeJSON<any>(
      JD_ANALYSIS_SYSTEM_PROMPT,
      buildUserPrompt(jdText, resume.raw_text)
    );

    const { data: savedRow, error: insertError } = await supabase
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

    if (insertError) return cors({ error: "Failed to save analysis." }, 500);

    await logUsageEvent(supabase, user.id, MODULE, tokensUsed);

    return cors({ jd, analysis: savedRow });
  } catch (err) {
    console.error(err);
    return cors({ error: "Unexpected error analyzing job description." }, 500);
  }
});
