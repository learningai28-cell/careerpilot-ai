import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/shared/lib/supabaseClient";
import { identifyUser, resetAnalyticsIdentity } from "@/shared/lib/analytics";

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signInWithPassword: (email: string, password: string) => Promise<{ error: string | null }>;
  signUpWithPassword: (email: string, password: string) => Promise<{ error: string | null }>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  sendPasswordResetEmail: (email: string) => Promise<{ error: string | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: string | null }>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
      if (data.session?.user) {
        identifyUser(data.session.user.id, data.session.user.email ?? undefined);
      }
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (newSession?.user) {
        identifyUser(newSession.user.id, newSession.user.email ?? undefined);
      } else {
        resetAnalyticsIdentity();
      }
    });

    return () => subscription.subscription.unsubscribe();
  }, []);

  const signInWithPassword = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  };

  const signUpWithPassword = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password });
    return { error: error?.message ?? null };
  };

  const signInWithGoogle = async () => {
    // Same problem the router basename fix addressed: this app can be
    // deployed under GitHub Pages' subpath (/careerpilot-ai/...) or at a
    // custom domain's root (/...) later. Hardcoding "/dashboard" here
    // silently dropped the subpath, sending Google's OAuth callback to a
    // URL that doesn't exist. Detected at runtime so it keeps working
    // after the domain switch without touching this again.
    const base = window.location.pathname.startsWith("/careerpilot-ai") ? "/careerpilot-ai" : "";
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin + base + "/dashboard" },
    });
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const sendPasswordResetEmail = async (email: string) => {
    // Same subpath problem the router basename fix and Google OAuth redirect
    // both had to account for: this app can be deployed under GitHub
    // Pages' subpath (/careerpilot-ai/...) or a custom domain's root (/...).
    // Detected at runtime so the emailed link keeps working after a domain
    // switch without touching this again.
    const base = window.location.pathname.startsWith("/careerpilot-ai") ? "/careerpilot-ai" : "";
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + base + "/reset-password",
    });
    return { error: error?.message ?? null };
  };

  const updatePassword = async (newPassword: string) => {
    // Valid only when called from the reset-password page after the user
    // has followed the emailed link — Supabase establishes a temporary
    // "recovery" session from that link's token, which is what authorizes
    // this call. Calling it without that context fails with no session.
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    return { error: error?.message ?? null };
  };

  return (
    <AuthContext.Provider
      value={{
        user: session?.user ?? null,
        session,
        loading,
        signInWithPassword,
        signUpWithPassword,
        signInWithGoogle,
        signOut,
        sendPasswordResetEmail,
        updatePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
