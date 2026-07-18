import { Card, CardBody, CardHeader } from "@/shared/components/Card";
import { SkillGapEntry } from "../types";

export function MissingKeywordsAndGap({
  missingKeywords,
  skillsGap,
}: {
  missingKeywords: string[];
  skillsGap: SkillGapEntry[];
}) {
  return (
    <Card>
      <CardHeader>
        <h3 className="font-display text-sm font-semibold">Missing keywords &amp; skills gap</h3>
      </CardHeader>
      <CardBody>
        {missingKeywords.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-2">
            {missingKeywords.map((kw) => (
              <span
                key={kw}
                className="rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-500"
              >
                {kw}
              </span>
            ))}
          </div>
        )}
        <div className="space-y-3">
          {skillsGap.map((item) => (
            <div key={item.skill} className="flex items-center gap-3">
              <span className="w-36 shrink-0 truncate text-sm text-slate-600 dark:text-slate-300">
                {item.skill}
              </span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-paper-100 dark:bg-ink-800">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: item.present ? "100%" : "18%",
                    backgroundColor: item.present ? "#17B890" : "#F5A623",
                  }}
                />
              </div>
              <span className="w-16 shrink-0 text-right text-xs font-medium text-slate-500 dark:text-slate-400">
                {item.present ? "Present" : "Missing"}
              </span>
            </div>
          ))}
        </div>
      </CardBody>
    </Card>
  );
}
