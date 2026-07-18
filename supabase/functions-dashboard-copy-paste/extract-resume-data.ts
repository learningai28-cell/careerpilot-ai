// PASTE THIS ENTIRE FILE into the Supabase Dashboard's Edge Function editor.
// Name the function exactly: extract-resume-data

import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const MODULE = "resume_builder_extract";
const FREE_TIER_LIMITS: Record<string, number> = {
  resume_analyzer: 2,
  jd_analyzer: 2,
  interview_coach: 1,
  career_roadmap: 1,
  resume_builder_extract: 2,
};
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;
const MODEL = "claude-sonnet-4-6";

const RESUME_DATA_EXTRACTION_SYSTEM_PROMPT = `You are an expert resume parser. Given the raw extracted text of a resume, restructure it into clean, normalized fields. Preserve the person's actual wording in bullets and summary where reasonable — you're organizing, not rewriting from scratch.

Respond with ONLY a JSON object matching this exact shape:

{
  "full_name": <string>,
  "email": <string or null>,
  "phone": <string or null>,
  "location": <string or null, e.g. "Mumbai, India">,
  "linkedin_url": <string or null>,
  "portfolio_url": <string or null>,
  "summary": <string — a 2-3 sentence professional summary. If the resume has one, clean it up; if not, write one grounded in the actual experience below>,
  "experience": [
    { "company": <string>, "title": <string>, "location": <string or null>, "start_date": <string, e.g. "Jan 2021">, "end_date": <string, e.g. "Present">, "bullets": [<string>, ...] }
  ],
  "education": [
    { "institution": <string>, "degree": <string>, "field": <string or null>, "start_date": <string or null>, "end_date": <string or null>, "details": <string or null> }
  ],
  "skills": [<string>, ...],
  "certifications": [<string>, ...]
}

Order experience and education most-recent-first. If a field genuinely isn't present in the resume, use null (for strings) or an empty array (for lists) — do not invent information.

Do not wrap the JSON in markdown fences. Do not include any text outside the JSON object.`;

function buildUserPrompt(resumeText: string): string {
  return `Here is the resume text to restructure:\n\n---\n${resumeText}\n---\n\nExtract and structure it now per the instructions.`;
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
      buildUserPrompt(resume.raw_text)
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
