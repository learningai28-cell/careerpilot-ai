import { Card, CardBody, CardHeader } from "@/shared/components/Card";
import { SkillGapItem } from "../types";

const importanceColor: Record<string, string> = {
  high: "#17B890",
  medium: "#F5A623",
  low: "#94A3B8",
};

export function SkillsGap({ items }: { items: SkillGapItem[] }) {
  return (
    <Card>
      <CardHeader>
        <h3 className="font-display text-sm font-semibold">Skills gap</h3>
      </CardHeader>
      <CardBody>
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.skill} className="flex items-center gap-3">
              <span className="w-32 shrink-0 truncate text-sm text-slate-600 dark:text-slate-300">
                {item.skill}
              </span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-paper-100 dark:bg-ink-800">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: item.present ? "100%" : "18%",
                    backgroundColor: item.present
                      ? "#17B890"
                      : importanceColor[item.importance],
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
