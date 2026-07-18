// PASTE THIS ENTIRE FILE into the Supabase Dashboard's Edge Function editor.
// Name the function exactly: score-answer

import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;
const MODEL = "claude-sonnet-4-6";

const ANSWER_SCORING_SYSTEM_PROMPT = `You are a senior interview coach giving direct, specific, actionable feedback on a candidate's spoken interview answer (transcribed to text). Never generic platitudes — cite specifics from what they actually said.

Respond with ONLY a JSON object matching this exact shape:

{
  "score": <integer 0-100>,
  "strengths": [<2-4 specific strings citing something concrete in THIS answer>],
  "weaknesses": [<2-4 specific strings citing something concrete in THIS answer>],
  "better_answer": <a rewritten version of their answer, same underlying facts/experience but stronger structure and delivery — 3-5 sentences>,
  "confidence_level": "low" | "medium" | "high",
  "communication_tips": [<2-3 specific strings about delivery, structure, or clarity — not content>]
}

Do not wrap the JSON in markdown fences. Do not include any text outside the JSON object.`;

function buildUserPrompt(params: { question: string; category: string; answerText: string }): string {
  const { question, category, answerText } = params;
  return `Interview question (${category}):\n"${question}"\n\nCandidate's answer:\n"${answerText}"\n\nScore and give feedback now per the instructions.`;
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
    const questionId: string | undefined = body.questionId;
    const answerText: string | undefined = body.answerText?.trim();

    if (!questionId || !answerText) return cors({ error: "questionId and answerText are required." }, 400);

    const { data: question } = await supabase.from("interview_questions").select("id, question, category").eq("id", questionId).single();
    if (!question) return cors({ error: "Question not found." }, 404);

    const { data: feedback } = await callClaudeJSON<any>(
      ANSWER_SCORING_SYSTEM_PROMPT,
      buildUserPrompt({ question: question.question, category: question.category, answerText })
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
