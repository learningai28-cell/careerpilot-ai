import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "./AuthContext";
import { AuthLayout } from "./AuthLayout";
import { Input } from "@/shared/components/Input";
import { Button } from "@/shared/components/Button";

export function SignupPage() {
  const { signUpWithPassword, signInWithGoogle } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await signUpWithPassword(email, password);
    setLoading(false);
    if (error) {
      toast.error(error);
      return;
    }
    setDone(true);
  };

  if (done) {
    return (
      <AuthLayout>
        <h2 className="font-display text-xl font-semibold">Check your inbox</h2>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          We sent a confirmation link to <span className="font-medium">{email}</span>. Verify
          your email to activate your account.
        </p>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <h2 className="font-display text-xl font-semibold">Create your account</h2>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Free to start. No card required.
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
        <div>
          <label className="mb-1.5 block text-xs font-medium text-slate-500">Password</label>
          <Input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 8 characters"
          />
        </div>
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "Creating account…" : "Create account"}
        </Button>
      </form>

      <p className="mt-3 text-center text-xs text-slate-400">
        By creating an account, you agree to our{" "}
        <Link to="/terms" className="font-medium text-slate-500 underline dark:text-slate-400">
          Terms of Service
        </Link>{" "}
        and{" "}
        <Link to="/privacy" className="font-medium text-slate-500 underline dark:text-slate-400">
          Privacy Policy
        </Link>
        .
      </p>

      <div className="my-5 flex items-center gap-3 text-xs text-slate-400">
        <div className="h-px flex-1 bg-line-light dark:bg-line-dark" />
        or
        <div className="h-px flex-1 bg-line-light dark:bg-line-dark" />
      </div>

      <Button variant="secondary" className="w-full" onClick={signInWithGoogle}>
        Continue with Google
      </Button>

      <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
        Already have an account?{" "}
        <Link to="/login" className="font-medium text-signal-600 dark:text-signal-400">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
}
