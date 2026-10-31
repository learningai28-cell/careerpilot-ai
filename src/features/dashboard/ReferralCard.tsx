import { useQuery } from "@tanstack/react-query";
import { Gift } from "lucide-react";
import { Card, CardBody } from "@/shared/components/Card";
import { ShareButtons } from "@/shared/components/ShareButtons";
import { fetchReferralStats, inviteLink } from "@/shared/lib/referral";

const MAX_WEEKS = 8;

/** "Invite 2 friends, get a week of Pro" card on the dashboard. */
export function ReferralCard() {
  const { data } = useQuery({ queryKey: ["referrals"], queryFn: fetchReferralStats });
  if (!data?.code) return null;

  const link = inviteLink(data.code);
  const towardNext = data.active % 2; // 0 or 1 friend toward the next reward
  const capped = data.weeks_earned >= MAX_WEEKS;

  return (
    <Card className="mb-8">
      <CardBody>
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-signal-500/10 p-2 text-signal-600 dark:text-signal-400">
            <Gift size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-base font-semibold">Invite friends, get Pro free</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              For every 2 friends who sign up with your link and try a feature, you get{" "}
              <strong>1 week of Pro</strong> (up to {MAX_WEEKS} weeks).
            </p>

            <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm">
              <span>
                <strong>{data.joined}</strong> joined
              </span>
              <span>
                <strong>{data.active}</strong> active
              </span>
              <span>
                <strong>{data.weeks_earned}</strong> week{data.weeks_earned === 1 ? "" : "s"} of Pro earned
              </span>
            </div>
            {!capped && (
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {towardNext === 1
                  ? "1 more active friend for your next free week."
                  : "2 more active friends for your next free week."}
              </p>
            )}

            <p className="mt-3 truncate rounded-lg bg-paper-100 px-3 py-2 font-mono text-xs dark:bg-ink-800">{link}</p>
            <div className="mt-3">
              <ShareButtons
                source="invite_card"
                url={link}
                text="I'm using CareerPilot AI for placement prep: free ATS resume score + AI mock interviews. Try it:"
              />
            </div>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
