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
        .select("plan")
        .eq("id", user!.id)
        .single();

      const plan = (profile?.plan as "free" | "pro") ?? "free";

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

      return { plan, perModule };
    },
  });
}
