import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "./AuthContext";
import { AuthLayout } from "./AuthLayout";
import { Input } from "@/shared/components/Input";
import { Button } from "@/shared/components/Button";

export function LoginPage() {
  const { signInWithPassword, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await signInWithPassword(email, password);
    setLoading(false);
    if (error) {
      toast.error(error);
      return;
    }
    navigate("/dashboard");
  };

  return (
    <AuthLayout>
      <h2 className="font-display text-xl font-semibold">Sign in</h2>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Pick up where you left off.
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
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
        </div>
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "Signing in…" : "Sign in"}
        </Button>
      </form>

      <div className="my-5 flex items-center gap-3 text-xs text-slate-400">
        <div className="h-px flex-1 bg-line-light dark:bg-line-dark" />
        or
        <div className="h-px flex-1 bg-line-light dark:bg-line-dark" />
      </div>

      <Button variant="secondary" className="w-full" onClick={signInWithGoogle}>
        Continue with Google
      </Button>

      <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
        New here?{" "}
        <Link to="/signup" className="font-medium text-signal-600 dark:text-signal-400">
          Create an account
        </Link>
      </p>
    </AuthLayout>
  );
}
