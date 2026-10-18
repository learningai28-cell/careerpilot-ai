import { supabase } from "@/shared/lib/supabaseClient";
import { invokeFunction } from "@/shared/lib/invokeFunction";
import { ResumeProfileData } from "./types";

export async function extractResumeData(): Promise<ResumeProfileData> {
  const data = await invokeFunction<{ profile: ResumeProfileData }>("extract-resume-data");
  return data.profile;
}

export async function fetchProfileData(userId: string): Promise<ResumeProfileData | null> {
  const { data } = await supabase
    .from("resume_profile_data")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  return data as ResumeProfileData | null;
}

export async function saveProfileData(
  userId: string,
  profile: ResumeProfileData
): Promise<ResumeProfileData> {
  const { data, error } = await supabase
    .from("resume_profile_data")
    .upsert(
      {
        user_id: userId,
        full_name: profile.full_name,
        email: profile.email,
        phone: profile.phone,
        location: profile.location,
        linkedin_url: profile.linkedin_url,
        portfolio_url: profile.portfolio_url,
        summary: profile.summary,
        experience: profile.experience,
        education: profile.education,
        skills: profile.skills,
        certifications: profile.certifications,
        source: profile.source ?? "manual",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    )
    .select()
    .single();

  if (error) throw error;
  return data as ResumeProfileData;
}
