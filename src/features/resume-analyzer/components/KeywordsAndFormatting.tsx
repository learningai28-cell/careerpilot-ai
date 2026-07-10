import { Card, CardBody, CardHeader } from "@/shared/components/Card";

export function KeywordsAndFormatting({
  missingKeywords,
  formattingIssues,
}: {
  missingKeywords: string[];
  formattingIssues: string[];
}) {
  return (
    <Card>
      <CardHeader>
        <h3 className="font-display text-sm font-semibold">Missing keywords</h3>
      </CardHeader>
      <CardBody>
        {missingKeywords.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            No obvious keyword gaps found.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
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

        {formattingIssues.length > 0 && (
          <>
            <h4 className="mb-2 mt-5 font-display text-sm font-semibold">
              Formatting issues
            </h4>
            <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
              {formattingIssues.map((f, i) => (
                <li key={i} className="flex gap-2">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-slate-400" />
                  {f}
                </li>
              ))}
            </ul>
          </>
        )}
      </CardBody>
    </Card>
  );
}
