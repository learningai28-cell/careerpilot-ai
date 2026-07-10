import { useRef, useState, DragEvent } from "react";
import { toast } from "sonner";
import { UploadCloud, FileText, RefreshCw } from "lucide-react";
import { Card } from "@/shared/components/Card";
import { Button } from "@/shared/components/Button";
import { useResume, useUploadResume, useAnalyzeResume } from "../hooks";

export function UploadCard({ onAnalyzed }: { onAnalyzed?: () => void }) {
  const { data: resume } = useResume();
  const upload = useUploadResume();
  const analyze = useAnalyzeResume();
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    try {
      await upload.mutateAsync(file);
      toast.success("Resume uploaded. Analyzing…");
      const result = await analyze.mutateAsync();
      toast.success(`ATS score: ${result.ats_score}`);
      onAnalyzed?.();
    } catch (err: any) {
      toast.error(err.message ?? "Something went wrong.");
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const busy = upload.isPending || analyze.isPending;

  return (
    <Card className="p-6">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => !busy && inputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors ${
          dragOver
            ? "border-signal-500 bg-signal-500/5"
            : "border-line-light dark:border-line-dark"
        } ${busy ? "pointer-events-none opacity-60" : ""}`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.docx"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />

        {busy ? (
          <>
            <RefreshCw className="mb-3 animate-spin text-signal-500" size={28} />
            <p className="text-sm font-medium">
              {upload.isPending ? "Uploading…" : "Analyzing your resume…"}
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              This usually takes 10-20 seconds.
            </p>
          </>
        ) : resume ? (
          <>
            <FileText className="mb-3 text-signal-500" size={28} />
            <p className="text-sm font-medium">{resume.file_name}</p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Drop a new file to replace it, or click to browse.
            </p>
          </>
        ) : (
          <>
            <UploadCloud className="mb-3 text-slate-400" size={28} />
            <p className="text-sm font-medium">Drag and drop your resume</p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              PDF or DOCX, up to 8MB
            </p>
          </>
        )}
      </div>

      {resume && !busy && (
        <Button
          variant="secondary"
          className="mt-4 w-full"
          onClick={() => inputRef.current?.click()}
        >
          Replace resume
        </Button>
      )}
    </Card>
  );
}
