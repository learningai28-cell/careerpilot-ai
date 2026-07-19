import { supabase } from "@/shared/lib/supabaseClient";
import { unwrapFunctionError } from "@/shared/lib/edgeFunctionError";
import { ResumeProfileData } from "./types";

async function authHeader() {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Not signed in.");
  return { Authorization: `Bearer ${token}` };
}

export async function extractResumeData(): Promise<ResumeProfileData> {
  const { data, error } = await supabase.functions.invoke("extract-resume-data", {
    headers: await authHeader(),
  });
  if (error) await unwrapFunctionError(error);
  if (data?.error) throw new Error(data.error);
  return data.profile as ResumeProfileData;
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
