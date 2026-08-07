import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "./AuthContext";
import { AuthLayout } from "./AuthLayout";
import { Input } from "@/shared/components/Input";
import { Button } from "@/shared/components/Button";

export function ForgotPasswordPage() {
  const { sendPasswordResetEmail } = useAuth();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await sendPasswordResetEmail(email);
    setLoading(false);
    if (error) {
      toast.error(error);
      return;
    }
    setSent(true);
  };

  if (sent) {
    return (
      <AuthLayout>
        <h2 className="font-display text-xl font-semibold">Check your inbox</h2>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          If an account exists for <span className="font-medium">{email}</span>, we've sent a
          link to reset your password. It expires after a while, so use it soon.
        </p>
        <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
          <Link to="/login" className="font-medium text-signal-600 dark:text-signal-400">
            Back to sign in
          </Link>
        </p>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <h2 className="font-display text-xl font-semibold">Reset your password</h2>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Enter the email you signed up with and we'll send you a reset link.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-3">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-slate-500">Email</label>
          <Input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
        </div>
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "Sending…" : "Send reset link"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
        <Link to="/login" className="font-medium text-signal-600 dark:text-signal-400">
          Back to sign in
        </Link>
      </p>
    </AuthLayout>
  );
}
