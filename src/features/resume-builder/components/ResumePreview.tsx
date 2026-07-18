import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Printer, FileDown } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/shared/components/Button";
import { ResumeProfileData, TemplateConfig } from "../types";
import { ResumeTemplateRenderer } from "./ResumeTemplateRenderer";
import { downloadBlob, generateResumeDocx } from "../docxExport";

const PORTAL_ID = "resume-print-portal";

/** Finds (or creates) the body-level element that print output renders into. */
function usePrintPortalTarget() {
  const [target, setTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    let el = document.getElementById(PORTAL_ID);
    if (!el) {
      el = document.createElement("div");
      el.id = PORTAL_ID;
      document.body.appendChild(el);
    }
    setTarget(el);
    // Deliberately not removing the portal node on unmount — it's a
    // singleton the whole app can reuse, cheap to leave in the DOM.
  }, []);

  return target;
}

export function ResumePreview({
  data,
  config,
}: {
  data: ResumeProfileData;
  config: TemplateConfig;
}) {
  const [generatingDocx, setGeneratingDocx] = useState(false);
  const portalTarget = usePrintPortalTarget();

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
          Preview — this is what prints (multi-page resumes will print across multiple pages).
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

      {/* On-screen preview only — purely visual, never what actually prints. */}
      <div className="flex justify-center overflow-auto rounded-2xl border border-line-light bg-paper-100 p-8 dark:border-line-dark dark:bg-ink-950">
        <div style={{ transform: "scale(0.85)", transformOrigin: "top center" }} className="shadow-card">
          <ResumeTemplateRenderer data={data} config={config} />
        </div>
      </div>

      {/* The actual print source: rendered into a portal at the very top
          of <body>, completely outside the app's layout/scroll/flex
          containers, so the browser can paginate it normally across
          multiple physical pages when the content is long. */}
      {portalTarget &&
        createPortal(<ResumeTemplateRenderer data={data} config={config} />, portalTarget)}

      <p className="mt-3 text-center text-xs text-slate-400">
        For PDF: in the print dialog that opens, choose <strong>"Save as PDF"</strong> as the
        destination. The Word download is fully editable but uses plain formatting rather than
        the chosen template's design — best for when you need to make further changes yourself.
      </p>
    </div>
  );
}
