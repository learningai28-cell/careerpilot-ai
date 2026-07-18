import { useState } from "react";
import { Printer, FileDown } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/shared/components/Button";
import { ResumeProfileData, TemplateConfig } from "../types";
import { ResumeTemplateRenderer } from "./ResumeTemplateRenderer";
import { downloadBlob, generateResumeDocx } from "../docxExport";

export function ResumePreview({
  data,
  config,
}: {
  data: ResumeProfileData;
  config: TemplateConfig;
}) {
  const [generatingDocx, setGeneratingDocx] = useState(false);

  const handleDownloadWord = async () => {
    setGeneratingDocx(true);
    try {
      const blob = await generateResumeDocx(data);
      const filename = `${(data.full_name || "resume").replace(/\s+/g, "_")}.docx`;
      downloadBlob(blob, filename);
    } catch {
      toast.error("Couldn't generate the Word file. Try again.");
    } finally {
      setGeneratingDocx(false);
    }
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Preview — this is exactly what prints.
        </p>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={handleDownloadWord} disabled={generatingDocx}>
            <FileDown size={15} /> {generatingDocx ? "Generating…" : "Download as Word (.docx)"}
          </Button>
          <Button onClick={() => window.print()}>
            <Printer size={15} /> Download / Print as PDF
          </Button>
        </div>
      </div>

      <div className="flex justify-center overflow-auto rounded-2xl border border-line-light bg-paper-100 p-8 dark:border-line-dark dark:bg-ink-950">
        <div id="resume-print-area" className="resume-preview-scale shadow-card">
          <ResumeTemplateRenderer data={data} config={config} />
        </div>
      </div>

      <p className="mt-3 text-center text-xs text-slate-400">
        For PDF: in the print dialog that opens, choose <strong>"Save as PDF"</strong> as the
        destination. The Word download is fully editable but uses plain formatting rather than
        the chosen template's design — best for when you need to make further changes yourself.
      </p>
    </div>
  );
}
