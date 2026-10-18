// supabase/functions/_shared/razorpay.ts
//
// Shared by verify-razorpay-payment (browser callback) and razorpay-webhook
// (server-to-server from Razorpay). Both end in grantProForPayment(), which
// calls the grant_pro SQL function — idempotent, so whichever arrives first
// upgrades the user and the other is a no-op.

import { serviceClient } from "./http.ts";

const RAZORPAY_KEY_ID = Deno.env.get("RAZORPAY_KEY_ID")!;
const RAZORPAY_KEY_SECRET = Deno.env.get("RAZORPAY_KEY_SECRET")!;

export const PRO_PLAN_AMOUNT = Number(Deno.env.get("RAZORPAY_PRO_PLAN_AMOUNT") ?? "49900"); // paise

export async function hmacSha256Hex(secret: string, message: string): Promise<string> {
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

/** Constant-time string comparison, so signature checks don't leak timing. */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function razorpayGet(path: string) {
  const res = await fetch(`https://api.razorpay.com/v1/${path}`, {
    headers: {
      authorization: "Basic " + btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`),
    },
  });
  const body = await res.json();
  if (!res.ok) {
    throw new Error(`Razorpay GET ${path} failed (${res.status}): ${body?.error?.description ?? ""}`);
  }
  return body;
}

export interface RazorpayOrder {
  id: string;
  amount: number;
  currency: string;
  status: string;
  notes?: { user_id?: string; plan?: string };
}

export interface RazorpayPayment {
  id: string;
  order_id: string;
  amount: number;
  currency: string;
  status: string; // created | authorized | captured | refunded | failed
}

export const fetchOrder = (orderId: string): Promise<RazorpayOrder> =>
  razorpayGet(`orders/${encodeURIComponent(orderId)}`);

export const fetchPayment = (paymentId: string): Promise<RazorpayPayment> =>
  razorpayGet(`payments/${encodeURIComponent(paymentId)}`);

/**
 * Checks that an order was created by create-razorpay-order for this user
 * and for the full Pro price. Returns an error message, or null if valid.
 */
export function checkOrderForUser(order: RazorpayOrder, userId: string): string | null {
  if (order.notes?.user_id !== userId) return "This payment belongs to a different account.";
  if (order.notes?.plan !== "pro") return "This payment isn't for the Pro plan.";
  if (order.currency !== "INR" || order.amount < PRO_PLAN_AMOUNT) {
    return "Payment amount doesn't match the Pro plan price.";
  }
  return null;
}

/**
 * Upgrades the user. Returns the new expiry date. Throws "payment_already_used"
 * if this payment was already applied to a different account.
 */
export async function grantProForPayment(params: {
  userId: string;
  orderId: string;
  paymentId: string;
  amount: number;
  currency: string;
  source: "checkout" | "webhook";
}): Promise<string> {
  const { data, error } = await serviceClient().rpc("grant_pro", {
    p_user_id: params.userId,
    p_order_id: params.orderId,
    p_payment_id: params.paymentId,
    p_amount: params.amount,
    p_currency: params.currency,
    p_source: params.source,
  });
  if (error) throw new Error(error.message);
  return data as string;
}
