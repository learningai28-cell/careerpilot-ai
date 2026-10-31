import { supabase } from "@/shared/lib/supabaseClient";

// Invite links look like https://careerpilot.operix.co.in/?ref=ab12cd34.
// The code is kept in localStorage until the visitor has an account, then
// claimed once (claim_referral, migration 0014). Works for email and Google
// sign-up alike, since it doesn't depend on sign-up metadata.

const REF_KEY = "careerpilot-ref";
export const SITE_URL = "https://careerpilot.operix.co.in";

/** Call once on app start: remembers ?ref=CODE from the current URL. */
export function captureReferralFromUrl() {
  try {
    const code = new URLSearchParams(window.location.search).get("ref");
    if (code && /^[a-z0-9]{6,12}$/i.test(code)) localStorage.setItem(REF_KEY, code.toLowerCase());
  } catch {
    /* storage unavailable: referral just isn't tracked */
  }
}

/** Call after sign-in: links a new account to its inviter, then forgets the code. */
export async function claimPendingReferral() {
  let code: string | null = null;
  try {
    code = localStorage.getItem(REF_KEY);
  } catch {
    return;
  }
  if (!code) return;
  const { error } = await supabase.rpc("claim_referral", { p_code: code });
  // Claimed, rejected (old account / own code) or unknown code: either way
  // there's nothing more to do with it. Keep it only on a network error.
  if (!error) {
    try {
      localStorage.removeItem(REF_KEY);
    } catch {
      /* ignore */
    }
  }
}

export function inviteLink(code: string, campaign = "invite") {
  return `${SITE_URL}/?ref=${encodeURIComponent(code)}&utm_source=referral&utm_campaign=${campaign}`;
}

export interface ReferralStats {
  code: string;
  joined: number;
  active: number;
  weeks_earned: number;
}

export async function fetchReferralStats(): Promise<ReferralStats | null> {
  const { data, error } = await supabase.rpc("get_my_referrals");
  if (error || !data) return null;
  return data as ReferralStats;
}
