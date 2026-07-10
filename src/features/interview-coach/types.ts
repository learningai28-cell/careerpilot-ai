export type QuestionCategory = "hr" | "technical" | "behavioural" | "case_study";
export type Difficulty = "easy" | "medium" | "hard";
export type ConfidenceLevel = "low" | "medium" | "high";

export interface InterviewSession {
  id: string;
  user_id: string;
  resume_id: string | null;
  target_role: string;
  experience_years: number | null;
  difficulty: Difficulty;
  status: "active" | "completed";
  overall_score: number | null;
  created_at: string;
}

export interface InterviewQuestion {
  id: string;
  session_id: string;
  category: QuestionCategory;
  question: string;
  star_sample_answer: string | null;
  follow_up_questions: string[];
  difficulty: Difficulty | null;
  order_index: number;
}

export interface InterviewAnswer {
  id: string;
  question_id: string;
  user_id: string;
  answer_text: string;
  score: number | null;
  strengths: string[];
  weaknesses: string[];
  better_answer: string | null;
  confidence_level: ConfidenceLevel | null;
  communication_tips: string[];
  created_at: string;
}
