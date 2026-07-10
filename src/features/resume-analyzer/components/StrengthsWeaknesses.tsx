import { CheckCircle2, AlertTriangle } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/shared/components/Card";

export function StrengthsWeaknesses({
  strengths,
  weaknesses,
}: {
  strengths: string[];
  weaknesses: string[];
}) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <Card>
        <CardHeader className="flex items-center gap-2">
          <CheckCircle2 size={16} className="text-signal-500" />
          <h3 className="font-display text-sm font-semibold">Strengths</h3>
        </CardHeader>
        <CardBody>
          <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
            {strengths.map((s, i) => (
              <li key={i} className="flex gap-2">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-signal-500" />
                {s}
              </li>
            ))}
          </ul>
        </CardBody>
      </Card>

      <Card>
        <CardHeader className="flex items-center gap-2">
          <AlertTriangle size={16} className="text-amber-500" />
          <h3 className="font-display text-sm font-semibold">Weaknesses</h3>
        </CardHeader>
        <CardBody>
          <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
            {weaknesses.map((w, i) => (
              <li key={i} className="flex gap-2">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-amber-500" />
                {w}
              </li>
            ))}
          </ul>
        </CardBody>
      </Card>
    </div>
  );
}
