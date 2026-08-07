import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "./AuthContext";
import { AuthLayout } from "./AuthLayout";
import { Input } from "@/shared/components/Input";
import { Button } from "@/shared/components/Button";
import { supabase } from "@/shared/lib/supabaseClient";

export function ResetPasswordPage() {
  const { updatePassword } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  // supabase-js reads the recovery token out of the URL on load and
  // exchanges it for a temporary session automatically (detectSessionInUrl,
  // on by default) — that exchange is what PASSWORD_RECOVERY signals.
  // Without a valid emailed link, no such session/event ever arrives, so
  // this starts "unready" rather than assuming the link worked.
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const { data: subscription } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setReady(true);
    });
    // Covers the case where the event already fired before this component
    // mounted (e.g. a fast redirect) — if a session already exists, allow
    // the form rather than getting stuck on "invalid link".
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => subscription.subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error("Passwords don't match.");
      return;
    }
    setLoading(true);
    const { error } = await updatePassword(password);
    setLoading(false);
    if (error) {
      toast.error(error);
      return;
    }
    toast.success("Password updated. You're signed in.");
    navigate("/dashboard");
  };

  if (!ready) {
    return (
      <AuthLayout>
        <h2 className="font-display text-xl font-semibold">Reset link not found</h2>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          This page only works when opened from the password reset email. If your link expired
          or you opened this directly, request a new one.
        </p>
        <Link to="/forgot-password">
          <Button className="mt-6 w-full">Request a new link</Button>
        </Link>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <h2 className="font-display text-xl font-semibold">Set a new password</h2>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Choose something you haven't used before.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-3">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-slate-500">
            New password
          </label>
          <Input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 8 characters"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-slate-500">
            Confirm password
          </label>
          <Input
            type="password"
            required
            minLength={8}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Type it again"
          />
        </div>
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "Updating…" : "Update password"}
        </Button>
      </form>
    </AuthLayout>
  );
}
