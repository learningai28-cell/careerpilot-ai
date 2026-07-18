import { supabase } from "@/shared/lib/supabaseClient";
import { JDAnalysis, JobDescription } from "./types";

async function authHeader() {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Not signed in.");
  return { Authorization: `Bearer ${token}` };
}

function unwrapFunctionError(error: any): never {
  const message = error?.context?.error ?? error?.message ?? "Something went wrong.";
  throw new Error(message);
}

export async function analyzeJD(params: {
  jdText: string;
  title?: string;
  company?: string;
}): Promise<{ jd: JobDescription; analysis: JDAnalysis }> {
  const { data, error } = await supabase.functions.invoke("analyze-jd", {
    headers: await authHeader(),
    body: params,
  });
  if (error) unwrapFunctionError(error);
  if (data?.error) throw new Error(data.error);
  return { jd: data.jd, analysis: data.analysis };
}

export async function fetchLatestJD(userId: string): Promise<JobDescription | null> {
  const { data } = await supabase
    .from("job_descriptions")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  return data as JobDescription | null;
}

export async function fetchLatestJDAnalysis(userId: string): Promise<JDAnalysis | null> {
  const { data } = await supabase
    .from("jd_analyses")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data as JDAnalysis | null;
}
