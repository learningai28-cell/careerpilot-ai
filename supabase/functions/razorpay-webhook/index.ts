// supabase/functions/razorpay-webhook/index.ts
//
// Server-to-server confirmation from Razorpay. This is what guarantees a
// paying user gets Pro even if they close the tab, lose network, or the
// browser callback (verify-razorpay-payment) fails after they were charged.
//
// Deploy with JWT verification OFF — Razorpay can't send a Supabase JWT;
// the request is authenticated by its X-Razorpay-Signature header instead:
//   supabase functions deploy razorpay-webhook --no-verify-jwt
//   (Dashboard: turn off "Enforce JWT Verification" for this function.)
//
// Requires these Edge Function secrets:
//   RAZORPAY_WEBHOOK_SECRET   - the secret you type when creating the webhook
//                               in Razorpay Dashboard -> Settings -> Webhooks
//   RAZORPAY_PRO_PLAN_AMOUNT  - same as create-razorpay-order
//   SUPABASE_SERVICE_ROLE_KEY - injected automatically
//
// Razorpay webhook setup: URL = https://<project>.supabase.co/functions/v1/razorpay-webhook,
// active event = "order.paid" only.
//
// Response codes matter: Razorpay retries on non-2xx for ~24h, so only
// transient failures (our DB down) return 500. Requests we will never
// accept (bad signature, foreign order) return 2xx/4xx so they aren't
// retried forever.

import { json } from "../_shared/http.ts";
import { checkOrderForUser, grantProForPayment, hmacSha256Hex, safeEqual } from "../_shared/razorpay.ts";

const RAZORPAY_WEBHOOK_SECRET = Deno.env.get("RAZORPAY_WEBHOOK_SECRET")!;

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  // Signature is over the exact raw body, so read it as text first.
  const rawBody = await req.text();
  const signature = req.headers.get("x-razorpay-signature") ?? "";
  const expected = await hmacSha256Hex(RAZORPAY_WEBHOOK_SECRET, rawBody);
  if (!signature || !safeEqual(expected, signature)) {
    console.warn("razorpay-webhook: bad signature");
    return json({ error: "Invalid signature" }, 401);
  }

  let event: any;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  if (event?.event !== "order.paid") return json({ ignored: event?.event ?? "unknown" });

  const order = event.payload?.order?.entity;
  const payment = event.payload?.payment?.entity;
  if (!order?.id || !payment?.id || payment.order_id !== order.id) {
    return json({ error: "Malformed order.paid payload" }, 400);
  }

  const userId: string | undefined = order.notes?.user_id;
  if (!userId) return json({ ignored: "order has no user_id note" });

  const orderProblem = checkOrderForUser(order, userId);
  if (orderProblem) {
    console.warn("razorpay-webhook: rejected order", order.id, orderProblem);
    return json({ ignored: orderProblem });
  }

  try {
    const proExpiresAt = await grantProForPayment({
      userId,
      orderId: order.id,
      paymentId: payment.id,
      amount: payment.amount,
      currency: payment.currency,
      source: "webhook",
    });
    return json({ success: true, proExpiresAt });
  } catch (err) {
    const message = String((err as Error).message);
    if (message.includes("payment_already_used") || message.includes("profile_not_found")) {
      console.error("razorpay-webhook: not applied", order.id, payment.id, message);
      return json({ ignored: message });
    }
    console.error("razorpay-webhook: transient failure", order.id, payment.id, message);
    return json({ error: "Temporary failure, please retry" }, 500);
  }
});
