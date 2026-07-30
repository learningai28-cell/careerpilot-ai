import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/shared/components/Button";
import { useAuth } from "@/features/auth/AuthContext";
import { createProUpgradeOrder, verifyProUpgradePayment } from "./api";

declare global {
  interface Window {
    Razorpay: any;
  }
}

interface RazorpayCheckoutProps {
  /** Called after the payment is verified and the profile is confirmed Pro. */
  onUpgraded?: () => void;
}

export function RazorpayCheckout({ onUpgraded }: RazorpayCheckoutProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    if (typeof window.Razorpay === "undefined") {
      toast.error("Payment library failed to load. Refresh and try again.");
      return;
    }

    setLoading(true);
    try {
      const order = await createProUpgradeOrder();

      const rzp = new window.Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        order_id: order.orderId,
        name: "CareerPilot AI",
        description: "Pro Plan Upgrade",
        prefill: { email: user?.email ?? undefined },
        theme: { color: "#17B890" }, // signal-500, matches the app's brand color
        handler: async (response: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) => {
          try {
            await verifyProUpgradePayment(response);
            toast.success("You're on Pro now — unlimited access across every module.");
            onUpgraded?.();
          } catch (err: any) {
            toast.error(err.message ?? "Payment went through, but verification failed. Contact support.");
          }
        },
        modal: {
          ondismiss: () => setLoading(false),
        },
      });

      rzp.on("payment.failed", (resp: any) => {
        toast.error(resp?.error?.description ?? "Payment failed.");
        setLoading(false);
      });

      rzp.open();
    } catch (err: any) {
      toast.error(err.message ?? "Could not start checkout.");
      setLoading(false);
    }
  }

  return (
    <Button onClick={handleClick} disabled={loading}>
      {loading ? "Starting checkout…" : "Upgrade to Pro"}
    </Button>
  );
}
