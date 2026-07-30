import { supabase } from "@/shared/lib/supabaseClient";
import { unwrapFunctionError } from "@/shared/lib/edgeFunctionError";

async function authHeader() {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Not signed in.");
  return { Authorization: `Bearer ${token}` };
}

export interface CreateOrderResponse {
  orderId: string;
  amount: number;
  currency: string;
  keyId: string;
}

export async function createProUpgradeOrder(): Promise<CreateOrderResponse> {
  const { data, error } = await supabase.functions.invoke("create-razorpay-order", {
    headers: await authHeader(),
  });
  if (error) await unwrapFunctionError(error);
  if (data?.error) throw new Error(data.error);
  return data as CreateOrderResponse;
}

export interface VerifyPaymentPayload {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

export async function verifyProUpgradePayment(
  payload: VerifyPaymentPayload
): Promise<{ success: boolean; plan: string }> {
  const { data, error } = await supabase.functions.invoke("verify-razorpay-payment", {
    headers: await authHeader(),
    body: payload,
  });
  if (error) await unwrapFunctionError(error);
  if (data?.error) throw new Error(data.error);
  return data as { success: boolean; plan: string };
}
