// PASTE THIS ENTIRE FILE into the Supabase Dashboard's Edge Function editor.
// Name the function exactly: verify-razorpay-payment
//
// Requires these Edge Function secrets:
//   RAZORPAY_KEY_SECRET         - same as create-razorpay-order
//   SUPABASE_SERVICE_ROLE_KEY   - Project Settings -> API -> service_role key
//
// Run migrations/0008_lock_profile_plan_updates.sql BEFORE deploying this —
// it's what makes this the only path that can set profiles.plan.

import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const RAZORPAY_KEY_SECRET = Deno.env.get("RAZORPAY_KEY_SECRET")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function cors(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json",
      "access-control-allow-origin": "*",
      "access-control-allow-headers": "authorization, x-client-info, apikey, content-type",
    },
  });
}

async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return cors({}, 200);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return cors({ error: "Missing authorization header" }, 401);

    const authedClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
      error: authError,
    } = await authedClient.auth.getUser();
    if (authError || !user) return cors({ error: "Invalid session" }, 401);

    const body = await req.json().catch(() => ({}));
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body ?? {};
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return cors({ error: "Missing payment verification fields" }, 400);
    }

    const expectedSignature = await hmacSha256Hex(
      RAZORPAY_KEY_SECRET,
      `${razorpay_order_id}|${razorpay_payment_id}`
    );

    if (expectedSignature !== razorpay_signature) {
      return cors({ error: "Payment signature verification failed" }, 400);
    }

    const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { error: updateError } = await serviceClient
      .from("profiles")
      .update({
        plan: "pro",
        plan_renewed_at: new Date().toISOString(),
        razorpay_order_id,
        razorpay_payment_id,
        pro_since: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (updateError) return cors({ error: updateError.message }, 500);

    return cors({ success: true, plan: "pro" });
  } catch (err) {
    console.error(err);
    return cors({ error: "Unexpected error verifying the payment." }, 500);
  }
});
