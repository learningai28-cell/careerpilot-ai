import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/shared/components/Button";
import { useAuth } from "@/features/auth/AuthContext";
import { trackAdsConversion } from "@/shared/lib/analytics";
import { createProUpgradeOrder, verifyProUpgradePayment } from "./api";

declare global {
  interface Window {
    Razorpay: any;
  }
}

interface RazorpayCheckoutProps {
  /** Called after the payment is verified and the profile is confirmed Pro. */
  onUpgraded?: () => void;
  /** Button label when idle. Defaults to "Upgrade to Pro". */
  label?: string;
}

export function RazorpayCheckout({ onUpgraded, label = "Upgrade to Pro" }: RazorpayCheckoutProps) {
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
        description: "Pro Plan — 3 Months",
        prefill: { email: user?.email ?? undefined },
        theme: { color: "#17B890" }, // signal-500, matches the app's brand color
        handler: async (response: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) => {
          try {
            const result = await verifyProUpgradePayment(response);
            // Payment id as transaction_id lets Google Ads de-duplicate.
            trackAdsConversion("purchase", {
              value: order.amount / 100,
              currency: order.currency,
              transactionId: response.razorpay_payment_id,
            });
            if (result.pending) {
              // Captured-but-not-yet-settled payments are finished by the
              // razorpay-webhook function; refresh a few times so the plan
              // flips without the user having to reload.
              toast.success("Payment received — your Pro plan will be active in a few seconds.");
              [5000, 15000, 30000].forEach((ms) => setTimeout(() => onUpgraded?.(), ms));
            } else {
              toast.success("You're on Pro now — unlimited access across every module.");
              onUpgraded?.();
            }
          } catch (err: any) {
            // Payment already succeeded on Razorpay's side at this point —
            // this catch means verification/upgrade failed AFTER the charge,
            // so the message must not suggest retrying the payment.
            // The razorpay-webhook function usually still completes the
            // upgrade server-side, so keep refreshing the plan too.
            toast.error(
              `${err.message ?? "We couldn't confirm your payment automatically."} Please don't pay again — if Pro isn't active within a few minutes, email hello@operix.co.in with payment ID ${response.razorpay_payment_id}.`,
              { duration: 15000 }
            );
            [5000, 30000].forEach((ms) => setTimeout(() => onUpgraded?.(), ms));
          } finally {
            setLoading(false);
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
      {loading ? "Starting checkout…" : label}
    </Button>
  );
}
