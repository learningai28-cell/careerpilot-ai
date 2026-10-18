import { supabase } from "@/shared/lib/supabaseClient";
import { invokeFunction } from "@/shared/lib/invokeFunction";
import { InterviewAnswer, InterviewQuestion, InterviewSession, Difficulty } from "./types";

export async function generateInterview(params: {
  targetRole?: string;
  experienceYears: number | null;
  difficulty: Difficulty;
  useJD?: boolean;
}): Promise<{ session: InterviewSession; questions: InterviewQuestion[] }> {
  const data = await invokeFunction<{ session: InterviewSession; questions: InterviewQuestion[] }>(
    "generate-interview",
    params
  );
  return { session: data.session, questions: data.questions };
}

export async function scoreAnswer(params: {
  questionId: string;
  answerText: string;
}): Promise<InterviewAnswer> {
  const data = await invokeFunction<{ answer: InterviewAnswer }>("score-answer", {
    questionId: params.questionId,
    answerText: params.answerText,
  });
  return data.answer;
}

export async function fetchLatestSession(
  userId: string
): Promise<{ session: InterviewSession; questions: InterviewQuestion[] } | null> {
  const { data: session } = await supabase
    .from("interview_sessions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!session) return null;

  const { data: questions } = await supabase
    .from("interview_questions")
    .select("*")
    .eq("session_id", session.id)
    .order("order_index", { ascending: true });

  return { session, questions: questions ?? [] };
}

export async function fetchAnswersForSession(
  questionIds: string[]
): Promise<Record<string, InterviewAnswer>> {
  if (questionIds.length === 0) return {};
  const { data } = await supabase
    .from("interview_answers")
    .select("*")
    .in("question_id", questionIds)
    .order("created_at", { ascending: false });

  const byQuestion: Record<string, InterviewAnswer> = {};
  for (const answer of data ?? []) {
    // keep only the most recent answer per question
    if (!byQuestion[answer.question_id]) byQuestion[answer.question_id] = answer;
  }
  return byQuestion;
}
