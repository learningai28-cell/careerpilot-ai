import { useEffect, useState } from "react";
import { toast } from "sonner";
import { FileEdit } from "lucide-react";
import { Skeleton } from "@/shared/components/Skeleton";
import { Button } from "@/shared/components/Button";
import { useResume } from "@/features/resume-analyzer/hooks";
import { useProfileData, useExtractResumeData, useSaveProfileData } from "./hooks";
import { EMPTY_PROFILE, ResumeProfileData } from "./types";
import { TEMPLATES } from "./templates";
import { ChoiceScreen } from "./components/ChoiceScreen";
import { ProfileForm } from "./components/ProfileForm";
import { TemplateGallery } from "./components/TemplateGallery";
import { ResumePreview } from "./components/ResumePreview";
import { SuggestionsPanel } from "./components/SuggestionsPanel";

type Step = "choice" | "edit" | "template";

export function ResumeBuilderPage() {
  const { data: resume, isLoading: resumeLoading } = useResume();
  const { data: savedProfile, isLoading: profileLoading } = useProfileData();
  const extract = useExtractResumeData();
  const save = useSaveProfileData();

  const [step, setStep] = useState<Step>("choice");
  const [draft, setDraft] = useState<ResumeProfileData>(EMPTY_PROFILE);
  const [templateId, setTemplateId] = useState(TEMPLATES[0].id);

  // If a profile already exists (from a prior session), skip straight to editing it.
  useEffect(() => {
    if (savedProfile && step === "choice") {
      setDraft(savedProfile);
      setStep("edit");
    }
  }, [savedProfile]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleExtract = async () => {
    try {
      const profile = await extract.mutateAsync();
      setDraft(profile);
      setStep("edit");
      toast.success("Resume read successfully — review and edit below.");
    } catch (err: any) {
      toast.error(err.message ?? "Something went wrong.");
    }
  };

  const handleManual = () => {
    setDraft({ ...EMPTY_PROFILE, source: "manual" });
    setStep("edit");
  };

  const handleSaveAndContinue = async () => {
    try {
      await save.mutateAsync(draft);
      setStep("template");
    } catch (err: any) {
      toast.error(err.message ?? "Failed to save.");
    }
  };

  const loading = resumeLoading || profileLoading;
  const selectedConfig = TEMPLATES.find((t) => t.id === templateId) ?? TEMPLATES[0];

  return (
    <div className="mx-auto max-w-5xl animate-fade-up">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold">Resume Builder</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Pick a template, fill in your details, download a polished resume.
          </p>
        </div>
        {step !== "choice" && (
          <div className="flex gap-1.5 text-xs font-medium text-slate-400">
            <span className={step === "edit" ? "text-signal-600 dark:text-signal-400" : ""}>Edit</span>
            <span>→</span>
            <span className={step === "template" ? "text-signal-600 dark:text-signal-400" : ""}>
              Template & Download
            </span>
          </div>
        )}
      </div>

      {loading ? (
        <Skeleton className="h-64 w-full" />
      ) : step === "choice" ? (
        <ChoiceScreen
          hasResume={!!resume}
          extracting={extract.isPending}
          onChooseExtract={handleExtract}
          onChooseManual={handleManual}
        />
      ) : step === "edit" ? (
        <div>
          {draft.source === "extracted" && (
            <SuggestionsPanel draft={draft} onChange={setDraft} />
          )}
          <ProfileForm value={draft} onChange={setDraft} />
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setStep("choice")}>
              Back
            </Button>
            <Button onClick={handleSaveAndContinue} disabled={save.isPending}>
              {save.isPending ? "Saving…" : "Continue to templates"}
            </Button>
          </div>
        </div>
      ) : (
        <div>
          <div className="mb-6">
            <h2 className="mb-3 font-display text-base font-semibold">Choose a template</h2>
            <TemplateGallery selectedId={templateId} onSelect={setTemplateId} />
          </div>
          <ResumePreview data={draft} config={selectedConfig} />
          <div className="mt-4 flex justify-start">
            <Button variant="ghost" onClick={() => setStep("edit")}>
              <FileEdit size={14} /> Edit details
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
