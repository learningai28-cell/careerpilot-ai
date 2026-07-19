/**
 * Extracts the actual friendly error message from a failed Edge Function
 * call. supabase-js throws a FunctionsHttpError on any non-2xx response,
 * where `error.context` is the RAW Response object — not already-parsed
 * JSON. Every api.ts in this app previously read `.context.error`
 * directly (skipping the required `await .json()` step), which always
 * came back undefined and silently fell back to Supabase's generic
 * "Edge Function returned a non-2xx status code" — hiding every specific,
 * useful error message the backend actually sent (usage limits, missing
 * resume, etc.). This is the one correct implementation; every feature's
 * api.ts should import and use this instead of its own copy.
 */
export async function unwrapFunctionError(error: any): Promise<never> {
  let message = error?.message ?? "Something went wrong.";
  try {
    if (error?.context && typeof error.context.json === "function") {
      const body = await error.context.json();
      if (body?.error) message = body.error;
    }
  } catch {
    // Response body wasn't valid JSON (or already consumed) — fall back
    // to whatever message we already have rather than throwing here.
  }
  throw new Error(message);
}
