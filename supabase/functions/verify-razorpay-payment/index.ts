// supabase/functions/verify-razorpay-payment/index.ts
//
// Called from the frontend after Razorpay's checkout modal succeeds. This
// is the fast path; razorpay-webhook is the reliable path that still
// upgrades the user if their browser closes before this call is made.
//
// Requires these Edge Function secrets:
//   RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET  - same as create-razorpay-order
//   RAZORPAY_PRO_PLAN_AMOUNT              - same as create-razorpay-order
//   SUPABASE_SERVICE_ROLE_KEY             - injected automatically
//
// A valid signature only proves the payment is real, not who it belongs
// to — anyone holding another buyer's three checkout values could replay
// them on their own account. So on top of the signature this function:
//   - fetches the order from Razorpay and checks it was created for THIS
//     user (create-razorpay-order puts user_id in the order notes),
//   - checks the payment is actually captured, and
//   - records the payment in the `payments` ledger (via grant_pro), which
//     rejects a payment id that was already used by another account.

import { cors, handleOptions, requireUser } from "../_shared/http.ts";
import {
  checkOrderForUser,
  fetchOrder,
  fetchPayment,
  grantProForPayment,
  hmacSha256Hex,
  safeEqual,
} from "../_shared/razorpay.ts";

const RAZORPAY_KEY_SECRET = Deno.env.get("RAZORPAY_KEY_SECRET")!;

Deno.serve(async (req) => {
  const preflight = handleOptions(req);
  if (preflight) return preflight;

  try {
    const auth = await requireUser(req);
    if (auth instanceof Response) return auth;
    const { supabase, user } = auth;

    const body = await req.json().catch(() => ({}));
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body ?? {};
    if (
      typeof razorpay_order_id !== "string" ||
      typeof razorpay_payment_id !== "string" ||
      typeof razorpay_signature !== "string"
    ) {
      return cors({ error: "Missing payment verification fields" }, 400);
    }

    // 1. Signature: HMAC_SHA256(order_id + "|" + payment_id, key_secret)
    const expectedSignature = await hmacSha256Hex(
      RAZORPAY_KEY_SECRET,
      `${razorpay_order_id}|${razorpay_payment_id}`
    );
    if (!safeEqual(expectedSignature, razorpay_signature)) {
      return cors({ error: "Payment signature verification failed" }, 400);
    }

    // 2. Ownership + amount, from Razorpay itself rather than the browser.
    const [order, payment] = await Promise.all([
      fetchOrder(razorpay_order_id),
      fetchPayment(razorpay_payment_id),
    ]);
    const orderProblem = checkOrderForUser(order, user.id);
    if (orderProblem) return cors({ error: orderProblem }, 403);
    if (payment.order_id !== order.id) {
      return cors({ error: "Payment does not match this order." }, 400);
    }

    // 3. Only captured money upgrades. An authorized-but-not-yet-captured
    // payment is normal for a few seconds; the webhook (order.paid) will
    // finish the upgrade once Razorpay captures it.
    if (payment.status === "authorized") {
      return cors({ success: true, pending: true });
    }
    if (payment.status !== "captured") {
      return cors({ error: `Payment is ${payment.status}, not completed.` }, 402);
    }

    // 4. Record + upgrade (idempotent; rejects reuse by another account).
    let proExpiresAt: string;
    try {
      proExpiresAt = await grantProForPayment({
        userId: user.id,
        orderId: order.id,
        paymentId: payment.id,
        amount: payment.amount,
        currency: payment.currency,
        source: "checkout",
      });
    } catch (err) {
      if (String((err as Error).message).includes("payment_already_used")) {
        return cors({ error: "This payment has already been used on another account." }, 409);
      }
      throw err;
    }

    return cors({ success: true, plan: "pro", proExpiresAt });
  } catch (err) {
    console.error(err);
    return cors({ error: "Unexpected error verifying the payment." }, 500);
  }
});
