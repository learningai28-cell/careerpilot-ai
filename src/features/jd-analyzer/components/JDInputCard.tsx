import { useState } from "react";
import { toast } from "sonner";
import { Card, CardBody } from "@/shared/components/Card";
import { Input } from "@/shared/components/Input";
import { Textarea } from "@/shared/components/Textarea";
import { Button } from "@/shared/components/Button";
import { useAnalyzeJD } from "../hooks";

export function JDInputCard({ onAnalyzed }: { onAnalyzed?: () => void }) {
  const [jdText, setJdText] = useState("");
  const [title, setTitle] = useState("");
  const [company, setCompany] = useState("");
  const analyze = useAnalyzeJD();

  const handleSubmit = async () => {
    if (jdText.trim().length < 50) {
      toast.error("Paste the full job description first.");
      return;
    }
    try {
      const result = await analyze.mutateAsync({
        jdText: jdText.trim(),
        title: title.trim() || undefined,
        company: company.trim() || undefined,
      });
      toast.success(`Match score: ${result.analysis.match_score}`);
      onAnalyzed?.();
    } catch (err: any) {
      toast.error(err.message ?? "Something went wrong.");
    }
  };

  return (
    <Card className="p-6">
      <div className="mb-3 flex gap-3">
        <Input placeholder="Job title (optional)" value={title} onChange={(e) => setTitle(e.target.value)} />
        <Input placeholder="Company (optional)" value={company} onChange={(e) => setCompany(e.target.value)} />
      </div>
      <Textarea
        rows={8}
        placeholder="Paste the full job description here…"
        value={jdText}
        onChange={(e) => setJdText(e.target.value)}
      />
      <Button
        className="mt-3 w-full sm:w-auto sm:px-6"
        onClick={handleSubmit}
        disabled={analyze.isPending}
      >
        {analyze.isPending ? "Analyzing…" : "Analyze against my resume"}
      </Button>
    </Card>
  );
}
