export interface ExperienceItem {
  company: string;
  title: string;
  location?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  bullets: string[];
}

export interface EducationItem {
  institution: string;
  degree: string;
  field?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  details?: string | null;
}

export interface ResumeProfileData {
  id?: string;
  user_id?: string;
  full_name: string;
  email?: string | null;
  phone?: string | null;
  location?: string | null;
  linkedin_url?: string | null;
  portfolio_url?: string | null;
  summary?: string | null;
  experience: ExperienceItem[];
  education: EducationItem[];
  skills: string[];
  certifications: string[];
  source?: "extracted" | "manual";
}

export const EMPTY_PROFILE: ResumeProfileData = {
  full_name: "",
  email: "",
  phone: "",
  location: "",
  linkedin_url: "",
  portfolio_url: "",
  summary: "",
  experience: [],
  education: [],
  skills: [],
  certifications: [],
};

export type TemplateLayout = "single-column" | "sidebar-left" | "sidebar-right" | "header-band";

export interface TemplateConfig {
  id: string;
  name: string;
  layout: TemplateLayout;
  accentColor: string;
  headingFont: string;
  bodyFont: string;
  density: "compact" | "spacious";
}
