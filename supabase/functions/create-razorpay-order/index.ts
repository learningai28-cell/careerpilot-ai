// supabase/functions/create-razorpay-order/index.ts
//
// Deploy: paste into Supabase Dashboard -> Edge Functions -> create-razorpay-order
// (same copy-paste workflow as analyze-jd, analyze-resume, etc.)
//
// Requires these Edge Function secrets:
//   RAZORPAY_KEY_ID           - Test Mode key to start (Razorpay Dashboard -> Settings -> API Keys)
//   RAZORPAY_KEY_SECRET       - matching secret
//   RAZORPAY_PRO_PLAN_AMOUNT  - price in paise, e.g. 49900 for INR 499.00 (placeholder until pricing is final)

import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const RAZORPAY_KEY_ID = Deno.env.get("RAZORPAY_KEY_ID")!;
const RAZORPAY_KEY_SECRET = Deno.env.get("RAZORPAY_KEY_SECRET")!;
const PRO_PLAN_AMOUNT = Deno.env.get("RAZORPAY_PRO_PLAN_AMOUNT") ?? "49900"; // paise, placeholder

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return cors({}, 200);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return cors({ error: "Missing authorization header" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) return cors({ error: "Invalid session" }, 401);

    const orderRes = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: "Basic " + btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`),
      },
      body: JSON.stringify({
        amount: Number(PRO_PLAN_AMOUNT),
        currency: "INR",
        receipt: `pro_upgrade_${user.id}_${Date.now()}`,
        notes: { user_id: user.id, plan: "pro" },
      }),
    });

    const orderData = await orderRes.json();
    if (!orderRes.ok) {
      return cors(
        { error: orderData?.error?.description ?? "Razorpay order creation failed" },
        502
      );
    }

    // Only the public key ID goes back to the client — never the secret.
    return cors({
      orderId: orderData.id,
      amount: orderData.amount,
      currency: orderData.currency,
      keyId: RAZORPAY_KEY_ID,
    });
  } catch (err) {
    console.error(err);
    return cors({ error: "Unexpected error creating the order." }, 500);
  }
});
