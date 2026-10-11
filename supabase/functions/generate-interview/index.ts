// supabase/functions/generate-interview/index.ts
//
// Deploy: supabase functions deploy generate-interview
// Requires ANTHROPIC_API_KEY as an Edge Function secret.

import { createClient } from "npm:@supabase/supabase-js@2.45.0";
import { consumeUsage, recordUsageTokens, releaseUsage } from "../_shared/usage.ts";
import { CLAUDE_TASKS, callClaudeJSON, isClaudeBusyError } from "../_shared/claudeClient.ts";
import {
  INTERVIEW_GENERATION_SYSTEM_PROMPT,
  buildInterviewGenerationUserPrompt,
} from "../_shared/prompts/interviewGeneration.ts";

const MODULE = "interview_coach";

interface GeneratedQuestion {
  category: "hr" | "technical" | "behavioural" | "case_study";
  question: string;
  star_sample_answer: string;
  follow_up_questions: string[];
  difficulty: "easy" | "medium" | "hard";
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

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) return cors({ error: "Invalid session" }, 401);

    const body = await req.json().catch(() => ({}));
    const useJD: boolean = body.useJD === true;
    let targetRole: string | undefined = body.targetRole?.trim();
    const experienceYears: number | null = body.experienceYears ?? null;
    const difficulty: string = body.difficulty ?? "medium";

    let jdText: string | null = null;
    let jdId: string | null = null;

    if (useJD) {
      const { data: jd } = await supabase
        .from("job_descriptions")
        .select("id, title, raw_text")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!jd?.raw_text) {
        return cors(
          { error: "No analyzed job description found. Analyze one in JD Analyzer first, or switch to manual role entry." },
          422
        );
      }
      jdText = jd.raw_text;
      jdId = jd.id;
      if (!targetRole) targetRole = jd.title ?? "the role described in the job posting";
    }

    if (!targetRole) return cors({ error: "targetRole is required." }, 400);
    if (!["easy", "medium", "hard"].includes(difficulty)) {
      return cors({ error: "difficulty must be easy, medium, or hard." }, 400);
    }

    // 1. Pull cached resume text (from Module 1). Required — questions are
    // grounded in it, not generic.
    const { data: resume } = await supabase
      .from("resumes")
      .select("id, raw_text")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!resume?.raw_text) {
      return cors(
        { error: "Upload and analyze a resume first — interview questions are built from it." },
        422
      );
    }

    // 2. Usage cap — one generation call = one "session" against the free
    // cap. Checked and recorded atomically right before the Claude spend,
    // and refunded below if anything after it fails.
    const usage = await consumeUsage(supabase, MODULE);
    if (!usage.allowed) return cors({ error: usage.reason }, 429);

    let tokensUsed: number;
    let session: any;
    let questions: unknown;
    try {
      // 3. Generate questions.
      const result = await callClaudeJSON<{ questions: GeneratedQuestion[] }>(
        INTERVIEW_GENERATION_SYSTEM_PROMPT,
        buildInterviewGenerationUserPrompt({
          resumeText: resume.raw_text,
          targetRole,
          experienceYears,
          difficulty,
          jdText,
        }),
        CLAUDE_TASKS.interviewGeneration
      );
      const generated = result.data;
      tokensUsed = result.tokensUsed;

      // 4. Persist session + questions.
      const { data: sessionRow, error: sessionError } = await supabase
        .from("interview_sessions")
        .insert({
          user_id: user.id,
          resume_id: resume.id,
          jd_id: jdId,
          target_role: targetRole,
          experience_years: experienceYears,
          difficulty,
          status: "active",
        })
        .select()
        .single();

      if (sessionError || !sessionRow) throw new Error(`Failed to create session: ${sessionError?.message}`);
      session = sessionRow;

      const rows = generated.questions.map((q, i) => ({
        session_id: session.id,
        category: q.category,
        question: q.question,
        star_sample_answer: q.star_sample_answer,
        follow_up_questions: q.follow_up_questions,
        difficulty: q.difficulty,
        order_index: i,
      }));

      const { data: questionRows, error: questionsError } = await supabase
        .from("interview_questions")
        .insert(rows)
        .select();

      if (questionsError) {
        // Don't leave an empty session behind for a generation we refunded.
        await supabase.from("interview_sessions").delete().eq("id", session.id);
        throw new Error(`Failed to save questions: ${questionsError.message}`);
      }
      questions = questionRows;
    } catch (err) {
      await releaseUsage(usage.eventId);
      throw err;
    }

    // 5. Record token spend for cost reporting.
    await recordUsageTokens(usage.eventId, tokensUsed);

    return cors({ session, questions });
  } catch (err) {
    console.error(err);
    // Claude overloaded/timing out after retries: usage was already refunded,
    // so tell the user to retry rather than showing a generic error.
    if (isClaudeBusyError(err)) return cors({ error: err.message }, 503);
    return cors({ error: "Unexpected error generating interview questions." }, 500);
  }
});
