// supabase/functions/_shared/usage.ts
//
// Server-side enforcement of usage caps. Replaces the old checkUsage.ts,
// which checked the cap before the Claude call but only logged usage after
// it — so several requests fired at once all passed the check.
//
// Now every AI-calling Edge Function does:
//
//   const usage = await consumeUsage(supabase, "resume_analyzer");
//   if (!usage.allowed) return cors({ error: usage.reason }, 429);  // _shared/http.ts
//   try {
//     ... call Claude, save results ...
//   } catch (err) {
//     await releaseUsage(usage.eventId);   // don't charge for failures
//     throw err;
//   }
//   await recordUsageTokens(usage.eventId, tokensUsed);
//
// consume_usage (migration 0009) checks the limit and records the event in
// one locked transaction, and holds the actual limit numbers.
// src/shared/lib/usageLimits.ts is the display-only copy.

import type { SupabaseClient } from "npm:@supabase/supabase-js@2.45.0";
import { serviceClient } from "./http.ts";

export type UsageGate =
  | { allowed: true; eventId: string }
  | { allowed: false; reason: string };

/** `supabase` must be the caller-JWT client: consume_usage reads auth.uid(). */
export async function consumeUsage(
  supabase: SupabaseClient,
  module: string,
  refId?: string
): Promise<UsageGate> {
  const { data, error } = await supabase.rpc("consume_usage", {
    p_module: module,
    p_ref_id: refId ?? null,
  });
  if (error) throw new Error(`consume_usage failed: ${error.message}`);
  if (!data?.allowed) return { allowed: false, reason: data?.reason ?? "Usage limit reached." };
  return { allowed: true, eventId: data.event_id };
}

// Refund and token logging are service-role only (see migration 0009) —
// a user who could call release_usage could refund every successful use.
export async function releaseUsage(eventId: string) {
  const { error } = await serviceClient().rpc("release_usage", { p_event_id: eventId });
  if (error) console.error("release_usage failed", eventId, error.message);
}

export async function recordUsageTokens(eventId: string, tokensUsed: number) {
  const { error } = await serviceClient().rpc("record_usage_tokens", {
    p_event_id: eventId,
    p_tokens: tokensUsed,
  });
  if (error) console.error("record_usage_tokens failed", eventId, error.message);
}
