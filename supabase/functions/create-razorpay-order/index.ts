// supabase/functions/create-razorpay-order/index.ts
//
// Deploy: supabase functions deploy create-razorpay-order (CI does this on
// merge to main; see docs/DEPLOYMENT.md). Don't use the Dashboard editor.
//
// Requires these Edge Function secrets:
//   RAZORPAY_KEY_ID           - Test Mode key to start (Razorpay Dashboard -> Settings -> API Keys)
//   RAZORPAY_KEY_SECRET       - matching secret
//   RAZORPAY_PRO_PLAN_AMOUNT  - price in paise, e.g. 49900 for INR 499.00 (placeholder until pricing is final)

import { cors, handleOptions, requireUser } from "../_shared/http.ts";

const RAZORPAY_KEY_ID = Deno.env.get("RAZORPAY_KEY_ID")!;
const RAZORPAY_KEY_SECRET = Deno.env.get("RAZORPAY_KEY_SECRET")!;
const PRO_PLAN_AMOUNT = Deno.env.get("RAZORPAY_PRO_PLAN_AMOUNT") ?? "49900"; // paise, placeholder

Deno.serve(async (req) => {
  const preflight = handleOptions(req);
  if (preflight) return preflight;

  try {
    const auth = await requireUser(req);
    if (auth instanceof Response) return auth;
    const { user } = auth;

    const orderRes = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: "Basic " + btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`),
      },
      body: JSON.stringify({
        amount: Number(PRO_PLAN_AMOUNT),
        currency: "INR",
        // Razorpay rejects receipts longer than 40 chars; the user id is
        // already in notes, so keep this short: "pro_" + 8 + "_" + 13 = 26.
        receipt: `pro_${user.id.slice(0, 8)}_${Date.now()}`,
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
