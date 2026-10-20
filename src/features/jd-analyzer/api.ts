import { supabase } from "@/shared/lib/supabaseClient";
import { invokeFunction } from "@/shared/lib/invokeFunction";
import { JDAnalysis, JobDescription } from "./types";

export async function analyzeJD(params: {
  jdText: string;
  title?: string;
  company?: string;
}): Promise<{ jd: JobDescription; analysis: JDAnalysis }> {
  const data = await invokeFunction<{ jd: JobDescription; analysis: JDAnalysis }>("analyze-jd", params);
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
