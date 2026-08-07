import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/shared/lib/supabaseClient";
import { useAuth } from "@/features/auth/AuthContext";
import { FREE_TIER_LIMITS, ModuleKey } from "@/shared/lib/usageLimits";

export interface ModuleUsage {
  module: ModuleKey;
  used: number;
  limit: number;
  remaining: number;
  atLimit: boolean;
}

export interface UsageSummary {
  plan: "free" | "pro";
  /** Only meaningful when plan === "pro". Null means it was never set (pre-3.0 rows). */
  proExpiresAt: string | null;
  perModule: ModuleUsage[];
}

function startOfMonthISO() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
}

export function useUsage() {
  const { user } = useAuth();

  return useQuery<UsageSummary>({
    queryKey: ["usage", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("plan, pro_expires_at")
        .eq("id", user!.id)
        .single();

      // Pro renews every 3 months, not a lifetime purchase — profiles.plan
      // staying 'pro' doesn't mean the paid period hasn't lapsed. Nothing
      // in the database auto-flips this back to 'free' (see
      // migrations/0009_pro_expiry.sql), so it's checked here at read time.
      const isProActive =
        profile?.plan === "pro" &&
        (!profile.pro_expires_at || new Date(profile.pro_expires_at) > new Date());
      const plan: "free" | "pro" = isProActive ? "pro" : "free";

      const { data: events } = await supabase
        .from("usage_events")
        .select("module")
        .eq("user_id", user!.id)
        .gte("created_at", startOfMonthISO());

      const counts = (events ?? []).reduce<Record<string, number>>((acc, e) => {
        acc[e.module] = (acc[e.module] ?? 0) + 1;
        return acc;
      }, {});

      const perModule: ModuleUsage[] = Object.entries(FREE_TIER_LIMITS).map(
        ([module, limit]) => {
          const used = counts[module] ?? 0;
          return {
            module: module as ModuleKey,
            used,
            limit,
            remaining: Math.max(0, limit - used),
            atLimit: plan === "free" && used >= limit,
          };
        }
      );

      return { plan, proExpiresAt: profile?.pro_expires_at ?? null, perModule };
    },
  });
}
