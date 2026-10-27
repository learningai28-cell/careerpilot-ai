// supabase/functions/public-ats-check/index.ts
//
// Try-before-signup: a quick ATS score for visitors on the landing page,
// no account needed. Deployed with JWT verification OFF (see config.toml),
// so it protects itself instead:
//   - per-IP and site-wide daily caps (claim_anon_ats_check, migration 0013),
//     with the IP stored only as a salted hash,
//   - a 3 MB upload cap and the usual resume text cap,
//   - the cheapest model (Haiku) and a short answer.
// The resume itself is never stored; only the score and token count are.
//
// Body: { "fileBase64": "...", "fileType": "pdf" | "docx" }  or  { "text": "..." }

import { CLAUDE_TASKS, callClaudeJSON, isClaudeBusyError } from "../_shared/claudeClient.ts";
import { extractResumeText } from "../_shared/extractText.ts";
import { cors, handleOptions, serviceClient } from "../_shared/http.ts";
import { hmacSha256Hex } from "../_shared/razorpay.ts";
import { QUICK_ATS_SYSTEM_PROMPT, buildQuickAtsUserPrompt } from "../_shared/prompts/quickAtsCheck.ts";

const PER_IP_PER_DAY = 3;
const SITE_WIDE_PER_DAY = 300; // ≈ USD 0.5/day worst case on Haiku
const MAX_FILE_BYTES = 3 * 1024 * 1024;

interface QuickAtsJSON {
  ats_score: number;
  verdict: string;
  top_issues: string[];
  more_issues_count: number;
  missing_keywords: string[];
}

function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for") ?? "";
  return fwd.split(",")[0].trim() || req.headers.get("cf-connecting-ip") || "unknown";
}

function decodeBase64(b64: string): Uint8Array {
  const bin = atob(b64.replace(/^data:[^,]*,/, ""));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

Deno.serve(async (req) => {
  const preflight = handleOptions(req);
  if (preflight) return preflight;
  if (req.method !== "POST") return cors({ error: "Method not allowed" }, 405);

  const service = serviceClient();
  let claimId: number | null = null;

  try {
    const body = await req.json().catch(() => ({}));

    // 1. Get the resume text before spending a check on it.
    let resumeText = "";
    if (typeof body.text === "string" && body.text.trim()) {
      resumeText = body.text.trim();
    } else if (typeof body.fileBase64 === "string" && (body.fileType === "pdf" || body.fileType === "docx")) {
      // base64 is ~4/3 of the file size
      if (body.fileBase64.length > MAX_FILE_BYTES * 1.4) {
        return cors({ error: "File is too large for the quick check (max 3 MB)." }, 413);
      }
      const bytes = decodeBase64(body.fileBase64);
      try {
        resumeText = await extractResumeText(bytes.buffer as ArrayBuffer, body.fileType);
      } catch {
        return cors({ error: "Couldn't read this file. Try another PDF or DOCX export." }, 422);
      }
    } else {
      return cors({ error: "Upload a PDF or DOCX resume." }, 400);
    }
    if (resumeText.length < 200) {
      return cors({ error: "Couldn't find enough text in this resume. Try a different export." }, 422);
    }

    // 2. Daily caps (per hashed IP and site-wide), claimed atomically.
    const ipHash = await hmacSha256Hex(
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!.slice(-24),
      clientIp(req)
    );
    const { data: claimed, error: claimError } = await service.rpc("claim_anon_ats_check", {
      p_ip_hash: ipHash,
      p_per_ip: PER_IP_PER_DAY,
      p_global: SITE_WIDE_PER_DAY,
    });
    if (claimError) throw new Error(`claim_anon_ats_check failed: ${claimError.message}`);
    if (claimed === null) {
      return cors(
        { error: "You've used today's free quick checks. Sign up free to get your full resume report.", limit: true },
        429
      );
    }
    claimId = claimed as number;

    // 3. Quick analysis.
    const { data, tokensUsed } = await callClaudeJSON<QuickAtsJSON>(
      QUICK_ATS_SYSTEM_PROMPT,
      buildQuickAtsUserPrompt(resumeText),
      CLAUDE_TASKS.quickAtsCheck
    );
    const result = {
      ats_score: Math.max(0, Math.min(100, Math.round(Number(data.ats_score) || 0))),
      verdict: String(data.verdict ?? ""),
      top_issues: (data.top_issues ?? []).slice(0, 3).map(String),
      more_issues_count: Math.max(0, Math.min(10, Math.round(Number(data.more_issues_count) || 0))),
      missing_keywords: (data.missing_keywords ?? []).slice(0, 3).map(String),
    };

    await service
      .from("anon_ats_checks")
      .update({ ats_score: result.ats_score, tokens_used: tokensUsed })
      .eq("id", claimId);

    return cors({ result });
  } catch (err) {
    console.error(err);
    // Don't use up a visitor's check when we failed them.
    if (claimId !== null) await service.from("anon_ats_checks").delete().eq("id", claimId);
    if (isClaudeBusyError(err)) return cors({ error: err.message }, 503);
    return cors({ error: "Something went wrong checking your resume. Please try again." }, 500);
  }
});
