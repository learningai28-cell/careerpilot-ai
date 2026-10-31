import { useQuery } from "@tanstack/react-query";
import { ShareButtons } from "@/shared/components/ShareButtons";
import { fetchReferralStats, inviteLink, SITE_URL } from "@/shared/lib/referral";

/** "Share your score" under the ATS gauge; uses the user's invite link so shares count as referrals. */
export function ShareScore({ score }: { score: number }) {
  const { data } = useQuery({ queryKey: ["referrals"], queryFn: fetchReferralStats });
  const url = data?.code ? inviteLink(data.code, "score_share") : `${SITE_URL}/?utm_source=share&utm_campaign=score_share`;
  return (
    <div>
      <p className="mb-2 text-sm font-medium">Share your score and invite friends (2 active friends = 1 week of Pro free)</p>
      <ShareButtons
        source="analyzer_score"
        url={url}
        text={`My resume scored ${score}/100 on CareerPilot AI's ATS check. Check yours free:`}
      />
    </div>
  );
}
