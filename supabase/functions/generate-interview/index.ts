// supabase/functions/generate-interview/index.ts
//
// Deploy: supabase functions deploy generate-interview
// Requires ANTHROPIC_API_KEY as an Edge Function secret.

import { createClient } from "npm:@supabase/supabase-js@2.45.0";
import { checkUsageLimit, logUsageEvent } from "../_shared/checkUsage.ts";
import { callClaudeJSON } from "../_shared/claudeClient.ts";
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
      "access-control-allow-headers": "authorization, content-type",
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
    const targetRole: string | undefined = body.targetRole?.trim();
    const experienceYears: number | null = body.experienceYears ?? null;
    const difficulty: string = body.difficulty ?? "medium";

    if (!targetRole) return cors({ error: "targetRole is required." }, 400);
    if (!["easy", "medium", "hard"].includes(difficulty)) {
      return cors({ error: "difficulty must be easy, medium, or hard." }, 400);
    }

    // 1. Usage cap — one generation call = one "session" against the free cap.
    const gate = await checkUsageLimit(supabase, user.id, MODULE);
    if (!gate.allowed) return cors({ error: gate.reason }, 429);

    // 2. Pull cached resume text (from Module 1). Required — questions are
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

    // 3. Generate questions.
    const { data: generated, tokensUsed } = await callClaudeJSON<{
      questions: GeneratedQuestion[];
    }>(
      INTERVIEW_GENERATION_SYSTEM_PROMPT,
      buildInterviewGenerationUserPrompt({
        resumeText: resume.raw_text,
        targetRole,
        experienceYears,
        difficulty,
      })
    );

    // 4. Persist session + questions.
    const { data: session, error: sessionError } = await supabase
      .from("interview_sessions")
      .insert({
        user_id: user.id,
        resume_id: resume.id,
        target_role: targetRole,
        experience_years: experienceYears,
        difficulty,
        status: "active",
      })
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

    const { data: questions, error: questionsError } = await supabase
      .from("interview_questions")
      .insert(rows)
      .select();

    if (questionsError) return cors({ error: "Failed to save questions." }, 500);

    // 5. Log usage.
    await logUsageEvent(supabase, user.id, MODULE, tokensUsed);

    return cors({ session, questions });
  } catch (err) {
    console.error(err);
    return cors({ error: "Unexpected error generating interview questions." }, 500);
  }
});
