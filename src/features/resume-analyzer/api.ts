import { supabase } from "@/shared/lib/supabaseClient";
import { Resume, ResumeAnalysis } from "./types";

const ALLOWED_TYPES: Record<string, "pdf" | "docx"> = {
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
};

export function validateResumeFile(file: File): { valid: boolean; error?: string } {
  const fileType = ALLOWED_TYPES[file.type];
  if (!fileType) return { valid: false, error: "Only PDF or DOCX files are supported." };
  if (file.size > 8 * 1024 * 1024) return { valid: false, error: "File must be under 8MB." };
  return { valid: true };
}

/**
 * Uploads the file to Storage and upserts the single resumes row for this
 * user (product decision: one active resume, replaced on upload — not a
 * library). Clears any cached raw_text from a prior file so the next
 * analyze call re-extracts fresh text.
 */
export async function uploadResume(file: File, userId: string): Promise<Resume> {
  const fileType = ALLOWED_TYPES[file.type];
  const path = `${userId}/${Date.now()}-${file.name}`;

  const { error: uploadError } = await supabase.storage
    .from("resumes")
    .upload(path, file, { upsert: true });
  if (uploadError) throw uploadError;

  // Best-effort cleanup of the previous file so storage doesn't accumulate
  // orphaned uploads every time someone replaces their resume.
  const { data: existing } = await supabase
    .from("resumes")
    .select("file_path")
    .eq("user_id", userId)
    .maybeSingle();
  if (existing && existing.file_path !== path) {
    await supabase.storage.from("resumes").remove([existing.file_path]);
  }

  const { data, error } = await supabase
    .from("resumes")
    .upsert(
      {
        user_id: userId,
        file_name: file.name,
        file_path: path,
        file_type: fileType,
        raw_text: null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    )
    .select()
    .single();

  if (error) throw error;
  return data as Resume;
}

export async function analyzeResume(): Promise<ResumeAnalysis> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) throw new Error("Not signed in.");

  const { data, error } = await supabase.functions.invoke("analyze-resume", {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (error) {
    // supabase-js surfaces non-2xx as a generic error; unwrap the body if present
    const message = (error as any)?.context?.error ?? error.message;
    throw new Error(message);
  }
  if (data?.error) throw new Error(data.error);

  return data.analysis as ResumeAnalysis;
}

export async function fetchLatestResume(userId: string): Promise<Resume | null> {
  const { data } = await supabase
    .from("resumes")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  return data as Resume | null;
}

export async function fetchLatestAnalysis(userId: string): Promise<ResumeAnalysis | null> {
  const { data } = await supabase
    .from("resume_analyses")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data as ResumeAnalysis | null;
}
