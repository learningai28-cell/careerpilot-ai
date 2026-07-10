import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { Card, CardBody, CardHeader } from "@/shared/components/Card";

export function ImprovedSummary({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <h3 className="font-display text-sm font-semibold">Improved professional summary</h3>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-signal-600 dark:hover:text-signal-400"
        >
          {copied ? <Check size={13} /> : <Copy size={13} />}
          {copied ? "Copied" : "Copy"}
        </button>
      </CardHeader>
      <CardBody>
        <p className="rounded-xl bg-paper-100 p-4 text-sm leading-relaxed text-ink-950 dark:bg-ink-800 dark:text-paper-50">
          {text}
        </p>
      </CardBody>
    </Card>
  );
}
