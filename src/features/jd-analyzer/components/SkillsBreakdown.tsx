import { Card, CardBody, CardHeader } from "@/shared/components/Card";

function ChipRow({ items, tone }: { items: string[]; tone: "signal" | "amber" }) {
  const cls =
    tone === "signal"
      ? "bg-signal-500/10 text-signal-600 dark:text-signal-400"
      : "bg-amber-500/10 text-amber-500";
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <span key={item} className={`rounded-full px-2.5 py-1 text-xs font-medium ${cls}`}>
          {item}
        </span>
      ))}
    </div>
  );
}

export function SkillsBreakdown({
  requiredSkills,
  preferredSkills,
}: {
  requiredSkills: string[];
  preferredSkills: string[];
}) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <h3 className="font-display text-sm font-semibold">Required skills</h3>
        </CardHeader>
        <CardBody>
          <ChipRow items={requiredSkills} tone="signal" />
        </CardBody>
      </Card>
      <Card>
        <CardHeader>
          <h3 className="font-display text-sm font-semibold">Preferred skills</h3>
        </CardHeader>
        <CardBody>
          <ChipRow items={preferredSkills} tone="amber" />
        </CardBody>
      </Card>
    </div>
  );
}
