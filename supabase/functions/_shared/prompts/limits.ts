// supabase/functions/_shared/prompts/limits.ts
//
// Input-size caps for user-pasted text. Without these, one huge paste (or a
// scanned PDF that extracts to megabytes of text) turns into an enormous
// token bill and can push a request past the Edge Function time limit. The
// caps are far above any real resume / JD / spoken answer, so legitimate
// input is never affected. Kept in one place so every prompt builder agrees.

export const MAX_RESUME_CHARS = 25_000;
export const MAX_JD_CHARS = 15_000;
export const MAX_ANSWER_CHARS = 6_000;

const TRUNCATION_MARKER = "\n\n[truncated]";

/**
 * Returns `text` unchanged if within `max` chars; otherwise cuts it to `max`
 * and appends a clear "[truncated]" marker so the model knows the input was
 * clipped rather than silently ending mid-sentence.
 */
export function capText(text: string, max: number): string {
  if (typeof text !== "string" || text.length <= max) return text;
  return text.slice(0, max) + TRUNCATION_MARKER;
}
