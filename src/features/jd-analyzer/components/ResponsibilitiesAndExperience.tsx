import { Card, CardBody, CardHeader } from "@/shared/components/Card";

export function ResponsibilitiesAndExperience({
  responsibilities,
  experienceRequired,
  softSkills,
  technicalSkills,
}: {
  responsibilities: string[];
  experienceRequired: string | null;
  softSkills: string[];
  technicalSkills: string[];
}) {
  return (
    <Card>
      <CardHeader>
        <h3 className="font-display text-sm font-semibold">Responsibilities &amp; requirements</h3>
      </CardHeader>
      <CardBody>
        <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
          {responsibilities.map((r, i) => (
            <li key={i} className="flex gap-2">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-slate-400" />
              {r}
            </li>
          ))}
        </ul>
        {experienceRequired && (
          <p className="mt-4 text-sm">
            <span className="font-medium">Experience required:</span>{" "}
            <span className="text-slate-600 dark:text-slate-300">{experienceRequired}</span>
          </p>
        )}
        {(softSkills.length > 0 || technicalSkills.length > 0) && (
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {softSkills.length > 0 && (
              <div>
                <h4 className="mb-1 text-xs font-semibold text-slate-500">Soft skills</h4>
                <p className="text-sm text-slate-600 dark:text-slate-300">{softSkills.join(", ")}</p>
              </div>
            )}
            {technicalSkills.length > 0 && (
              <div>
                <h4 className="mb-1 text-xs font-semibold text-slate-500">Technical skills</h4>
                <p className="text-sm text-slate-600 dark:text-slate-300">{technicalSkills.join(", ")}</p>
              </div>
            )}
          </div>
        )}
      </CardBody>
    </Card>
  );
}
