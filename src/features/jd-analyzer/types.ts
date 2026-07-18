export interface JobDescription {
  id: string;
  user_id: string;
  title: string | null;
  company: string | null;
  raw_text: string;
  updated_at: string;
  created_at: string;
}

export interface SkillGapEntry {
  skill: string;
  present: boolean;
}

export interface JDAnalysis {
  id: string;
  jd_id: string;
  user_id: string;
  required_skills: string[];
  preferred_skills: string[];
  responsibilities: string[];
  experience_required: string | null;
  soft_skills: string[];
  technical_skills: string[];
  match_score: number;
  missing_keywords: string[];
  skills_gap: SkillGapEntry[];
  recommendations: string[];
  created_at: string;
}
