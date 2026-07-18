// PASTE THIS ENTIRE FILE into the Supabase Dashboard's Edge Function editor.
// Name the function exactly: generate-interview

import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const MODULE = "interview_coach";
const FREE_TIER_LIMITS: Record<string, number> = {
  resume_analyzer: 2,
  jd_analyzer: 2,
  interview_coach: 1,
  career_roadmap: 1,
  resume_builder_extract: 2,
};
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;
const MODEL = "claude-sonnet-4-6";

const INTERVIEW_GENERATION_SYSTEM_PROMPT = `You are a senior interview coach and hiring manager with experience across HR, technical, and case-based interviewing. Given a candidate's resume text, their target role, years of experience, and a difficulty level, generate a realistic interview question set.

Respond with ONLY a JSON object matching this exact shape:

{
  "questions": [
    {
      "category": "hr" | "technical" | "behavioural" | "case_study",
      "question": <string, specific to this candidate's background and target role>,
      "star_sample_answer": <a realistic STAR-framework (Situation, Task, Action, Result) sample answer written AS IF spoken by this candidate, grounded in details from their actual resume — 3-5 sentences. For technical questions where STAR doesn't fit naturally, give a strong model answer instead.>,
      "follow_up_questions": [<1-3 strings, natural follow-ups an interviewer would ask after this answer>],
      "difficulty": "easy" | "medium" | "hard"
    }
  ]
}

Generate exactly 8 questions total: 2 HR, 2 technical, 2 behavioural, 2 case_study. Calibrate difficulty and depth to the stated experience level and requested difficulty. Questions must reference specifics from the resume where relevant (a past role, a named skill, a metric) — never generic questions that could apply to anyone.

Do not wrap the JSON in markdown fences. Do not include any text outside the JSON object.`;

function buildUserPrompt(params: { resumeText: string; targetRole: string; experienceYears: number | null; difficulty: string }): string {
  const { resumeText, targetRole, experienceYears, difficulty } = params;
  return `Candidate resume text:\n---\n${resumeText}\n---\n\nTarget role: ${targetRole}\nExperience: ${experienceYears ?? "not specified"} years\nRequested difficulty: ${difficulty}\n\nGenerate the question set now per the instructions.`;
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
    const targetRole: string | undefined = body.targetRole?.trim();
    const experienceYears: number | null = body.experienceYears ?? null;
    const difficulty: string = body.difficulty ?? "medium";

    if (!targetRole) return cors({ error: "targetRole is required." }, 400);
    if (!["easy", "medium", "hard"].includes(difficulty)) {
      return cors({ error: "difficulty must be easy, medium, or hard." }, 400);
    }

    const gate = await checkUsageLimit(supabase, user.id, MODULE);
    if (!gate.allowed) return cors({ error: gate.reason }, 429);

    const { data: resume } = await supabase.from("resumes").select("id, raw_text").eq("user_id", user.id).maybeSingle();
    if (!resume?.raw_text) {
      return cors({ error: "Upload and analyze a resume first — interview questions are built from it." }, 422);
    }

    const { data: generated, tokensUsed } = await callClaudeJSON<{ questions: any[] }>(
      INTERVIEW_GENERATION_SYSTEM_PROMPT,
      buildUserPrompt({ resumeText: resume.raw_text, targetRole, experienceYears, difficulty })
    );

    const { data: session, error: sessionError } = await supabase
      .from("interview_sessions")
      .insert({ user_id: user.id, resume_id: resume.id, target_role: targetRole, experience_years: experienceYears, difficulty, status: "active" })
      .select()
      .single();

    if (sessionError || !session) return cors({ error: "Failed to create session." }, 500);

    const rows = generated.questions.map((q, i) => ({
      session_id: session.id,
      category: q.category,
      question: q.question,
      star_sample_answer: q.star_sample_answer,
      follow_up_questions: q.follow_up_questions,
      difficulty: q.difficulty,
      order_index: i,
    }));

    const { data: questions, error: questionsError } = await supabase.from("interview_questions").insert(rows).select();
    if (questionsError) return cors({ error: "Failed to save questions." }, 500);

    await logUsageEvent(supabase, user.id, MODULE, tokensUsed);

    return cors({ session, questions });
  } catch (err) {
    console.error(err);
    return cors({ error: "Unexpected error generating interview questions." }, 500);
  }
});
