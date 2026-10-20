import { toast } from "sonner";
import { supabase } from "@/shared/lib/supabaseClient";

/** Thrown by invokeFunction; carries the HTTP status of the failed call. */
export class FunctionCallError extends Error {
  status: number;
  /** True when an upgrade toast was already shown, so callers skip their own. */
  upgradePrompted = false;

  constructor(message: string, status: number) {
    super(message);
    this.name = "FunctionCallError";
    this.status = status;
  }
}

// Registered by AppProviders so this module doesn't depend on the router.
let goToBilling: () => void = () => window.location.assign("/dashboard/billing");
export function setBillingNavigator(fn: () => void) {
  goToBilling = fn;
}

// Only the monthly free-plan cap should offer an upgrade; the per-question
// attempt cap is also a 429 but upgrading wouldn't help.
function isFreePlanLimit(err: FunctionCallError) {
  return err.status === 429 && err.message.startsWith("Free plan limit reached");
}

/**
 * supabase-js throws a FunctionsHttpError on any non-2xx response, where
 * `error.context` is the RAW Response, not parsed JSON, so the server's
 * `{ error }` message has to be read with `await .json()`. This is the one
 * place that does it; every feature's api.ts calls this instead of
 * supabase.functions.invoke directly.
 */
export async function invokeFunction<T>(name: string, body?: Record<string, unknown>): Promise<T> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) throw new Error("Not signed in.");

  const { data, error } = await supabase.functions.invoke(name, {
    headers: { Authorization: `Bearer ${token}` },
    ...(body ? { body } : {}),
  });

  if (error) {
    let message = error.message ?? "Something went wrong.";
    const res = (error as { context?: Response }).context;
    try {
      if (res && typeof res.json === "function") {
        const parsed = await res.json();
        if (parsed?.error) message = parsed.error;
      }
    } catch {
      // Body wasn't valid JSON (or was already consumed); keep the fallback.
    }
    const err = new FunctionCallError(message, res?.status ?? 0);
    if (isFreePlanLimit(err)) {
      err.upgradePrompted = true;
      toast.error(err.message, {
        action: { label: "Upgrade to Pro", onClick: () => goToBilling() },
      });
    }
    throw err;
  }
  if (data?.error) throw new FunctionCallError(data.error, 200);
  return data as T;
}

/** Shows an error toast unless invokeFunction already showed the upgrade prompt. */
export function toastApiError(err: any, fallback = "Something went wrong.") {
  if (err?.upgradePrompted) return;
  toast.error(err?.message ?? fallback);
}
