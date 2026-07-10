import { Card, CardBody, CardHeader } from "@/shared/components/Card";
import { SectionFeedbackItem } from "../types";

export function SectionFeedback({ items }: { items: SectionFeedbackItem[] }) {
  return (
    <Card>
      <CardHeader>
        <h3 className="font-display text-sm font-semibold">Section-by-section</h3>
      </CardHeader>
      <CardBody className="space-y-4">
        {items.map((item) => (
          <div key={item.section}>
            <div className="mb-1 flex items-center justify-between">
              <span className="text-sm font-medium">{item.section}</span>
              <span className="data-figure text-xs text-slate-500 dark:text-slate-400">
                {item.score}/100
              </span>
            </div>
            <div className="mb-1.5 h-1.5 overflow-hidden rounded-full bg-paper-100 dark:bg-ink-800">
              <div
                className="h-full rounded-full bg-signal-500"
                style={{ width: `${item.score}%` }}
              />
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300">{item.feedback}</p>
          </div>
        ))}
      </CardBody>
    </Card>
  );
}
