import { LucideIcon } from "lucide-react";
import { EmptyState } from "./EmptyState";

export function ModulePlaceholder({
  icon: Icon,
  title,
}: {
  icon: LucideIcon;
  title: string;
}) {
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-6 font-display text-2xl font-semibold">{title}</h1>
      <EmptyState
        icon={<Icon size={20} />}
        title="This module is next up"
        description="We'll build this together, module by module. Nothing to see here yet."
      />
    </div>
  );
}
