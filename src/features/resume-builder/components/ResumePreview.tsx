import { Printer } from "lucide-react";
import { Button } from "@/shared/components/Button";
import { ResumeProfileData, TemplateConfig } from "../types";
import { ResumeTemplateRenderer } from "./ResumeTemplateRenderer";

export function ResumePreview({
  data,
  config,
}: {
  data: ResumeProfileData;
  config: TemplateConfig;
}) {
  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Preview — this is exactly what prints.
        </p>
        <Button onClick={() => window.print()}>
          <Printer size={15} /> Download / Print as PDF
        </Button>
      </div>

      <div className="flex justify-center overflow-auto rounded-2xl border border-line-light bg-paper-100 p-8 dark:border-line-dark dark:bg-ink-950">
        <div id="resume-print-area" className="shadow-card" style={{ transform: "scale(0.85)", transformOrigin: "top center" }}>
          <ResumeTemplateRenderer data={data} config={config} />
        </div>
      </div>

      <p className="mt-3 text-center text-xs text-slate-400">
        In the print dialog that opens, choose <strong>"Save as PDF"</strong> as the destination.
      </p>
    </div>
  );
}
