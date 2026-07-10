export interface Resume {
  id: string;
  user_id: string;
  file_name: string;
  file_path: string;
  file_type: "pdf" | "docx";
  raw_text: string | null;
  updated_at: string;
  created_at: string;
}

export interface SkillGapItem {
  skill: string;
  importance: "high" | "medium" | "low";
  present: boolean;
}

export interface SectionFeedbackItem {
  section: string;
  feedback: string;
  score: number;
}

export interface ResumeAnalysis {
  id: string;
  resume_id: string;
  user_id: string;
  ats_score: number;
  strengths: string[];
  weaknesses: string[];
  missing_keywords: string[];
  formatting_issues: string[];
  skills_gap: SkillGapItem[];
  section_feedback: SectionFeedbackItem[];
  improved_summary: string;
  model_version: string | null;
  created_at: string;
}
