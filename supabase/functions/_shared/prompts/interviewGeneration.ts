// supabase/functions/_shared/prompts/interviewGeneration.ts

export const INTERVIEW_GENERATION_SYSTEM_PROMPT = `You are a senior interview coach and hiring manager with experience across HR, technical, and case-based interviewing. Given a candidate's resume text, a target role (either stated directly, or a specific job description below), years of experience, and a difficulty level, generate a realistic interview question set.

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

Generate exactly 8 questions total: 2 HR, 2 technical, 2 behavioural, 2 case_study. Calibrate difficulty and depth to the stated experience level and requested difficulty. Questions must reference specifics from the resume where relevant (a past role, a named skill, a metric) — never generic questions that could apply to anyone. If a specific job description is provided, ground technical and case-study questions in its actual stated requirements and responsibilities, not just the general role title.

Do not wrap the JSON in markdown fences. Do not include any text outside the JSON object.`;

export function buildInterviewGenerationUserPrompt(params: {
  resumeText: string;
  targetRole: string;
  experienceYears: number | null;
  difficulty: string;
  jdText?: string | null;
}): string {
  const { resumeText, targetRole, experienceYears, difficulty, jdText } = params;
  const jdBlock = jdText
    ? `\n\nThe candidate is preparing for this specific job posting — ground the questions in its actual requirements, not just the general role title:\n---\n${jdText}\n---`
    : "";
  return `Candidate resume text:\n---\n${resumeText}\n---\n\nTarget role: ${targetRole}\nExperience: ${
    experienceYears ?? "not specified"
  } years\nRequested difficulty: ${difficulty}${jdBlock}\n\nGenerate the question set now per the instructions.`;
}
