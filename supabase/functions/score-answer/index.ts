// supabase/functions/score-answer/index.ts
//
// Deploy: supabase functions deploy score-answer
// Not gated by the usage cap — that's enforced once at session generation
// in generate-interview; practicing individual answers within an already
// generated session shouldn't burn additional quota.

import { createClient } from "npm:@supabase/supabase-js@2.45.0";
import { callClaudeJSON } from "../_shared/claudeClient.ts";
import {
  ANSWER_SCORING_SYSTEM_PROMPT,
  buildAnswerScoringUserPrompt,
} from "../_shared/prompts/answerScoring.ts";

interface AnswerScoreJSON {
  score: number;
  strengths: string[];
  weaknesses: string[];
  better_answer: string;
  confidence_level: "low" | "medium" | "high";
  communication_tips: string[];
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
    const questionId: string | undefined = body.questionId;
    const answerText: string | undefined = body.answerText?.trim();

    if (!questionId || !answerText) {
      return cors({ error: "questionId and answerText are required." }, 400);
    }

    // Load the question, and confirm (via the session RLS join) it belongs
    // to this user — this select will simply return null if not, since RLS
    // scopes interview_questions through interview_sessions.user_id.
    const { data: question } = await supabase
      .from("interview_questions")
      .select("id, question, category")
      .eq("id", questionId)
      .single();

    if (!question) return cors({ error: "Question not found." }, 404);

    const { data: feedback } = await callClaudeJSON<AnswerScoreJSON>(
      ANSWER_SCORING_SYSTEM_PROMPT,
      buildAnswerScoringUserPrompt({
        question: question.question,
        category: question.category,
        answerText,
      })
    );

    const { data: savedAnswer, error: insertError } = await supabase
      .from("interview_answers")
      .insert({
        question_id: questionId,
        user_id: user.id,
        answer_text: answerText,
        score: feedback.score,
        strengths: feedback.strengths,
        weaknesses: feedback.weaknesses,
        better_answer: feedback.better_answer,
        confidence_level: feedback.confidence_level,
        communication_tips: feedback.communication_tips,
      })
      .select()
      .single();

    if (insertError) return cors({ error: "Failed to save answer feedback." }, 500);

    return cors({ answer: savedAnswer });
  } catch (err) {
    console.error(err);
    return cors({ error: "Unexpected error scoring answer." }, 500);
  }
});
