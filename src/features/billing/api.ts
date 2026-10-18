import { invokeFunction } from "@/shared/lib/invokeFunction";

export interface CreateOrderResponse {
  orderId: string;
  amount: number;
  currency: string;
  keyId: string;
}

export async function createProUpgradeOrder(): Promise<CreateOrderResponse> {
  return invokeFunction<CreateOrderResponse>("create-razorpay-order");
}

export interface VerifyPaymentPayload {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

export interface VerifyPaymentResponse {
  success: boolean;
  /** True when Razorpay hasn't captured the payment yet — the
   *  razorpay-webhook function will finish the upgrade within moments. */
  pending?: boolean;
  plan?: string;
  proExpiresAt?: string;
}

export async function verifyProUpgradePayment(
  payload: VerifyPaymentPayload
): Promise<VerifyPaymentResponse> {
  return invokeFunction<VerifyPaymentResponse>(
    "verify-razorpay-payment",
    payload as unknown as Record<string, unknown>
  );
}
