import { Check } from "lucide-react";
import { TEMPLATES } from "../templates";
import { ResumeProfileData } from "../types";
import { ResumeTemplateRenderer } from "./ResumeTemplateRenderer";

const SAMPLE_DATA: ResumeProfileData = {
  full_name: "Jordan Lee",
  email: "jordan@email.com",
  phone: "+1 555 0100",
  location: "Remote",
  summary: "Product-minded engineer with 6 years building consumer apps.",
  experience: [
    {
      company: "Acme Corp",
      title: "Senior Engineer",
      start_date: "2021",
      end_date: "Present",
      bullets: ["Led migration to microservices", "Grew team from 3 to 9"],
    },
    {
      company: "Beta Inc",
      title: "Engineer",
      start_date: "2018",
      end_date: "2021",
      bullets: ["Shipped core checkout flow"],
    },
  ],
  education: [{ institution: "State University", degree: "B.S. Computer Science", end_date: "2018" }],
  skills: ["React", "TypeScript", "Postgres"],
  certifications: ["AWS Certified"],
};

export function TemplateGallery({
  selectedId,
  onSelect,
}: {
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
      {TEMPLATES.map((tpl) => (
        <button
          key={tpl.id}
          onClick={() => onSelect(tpl.id)}
          className={`group relative overflow-hidden rounded-xl border-2 text-left transition-colors ${
            selectedId === tpl.id
              ? "border-signal-500"
              : "border-line-light hover:border-slate-300 dark:border-line-dark"
          }`}
        >
          <div
            style={{
              width: "100%",
              aspectRatio: "210 / 297",
              overflow: "hidden",
              position: "relative",
              background: "#F7F8FA",
            }}
          >
            <div
              style={{
                transform: "scale(0.19)",
                transformOrigin: "top left",
                width: "210mm",
                pointerEvents: "none",
              }}
            >
              <ResumeTemplateRenderer data={SAMPLE_DATA} config={tpl} />
            </div>
          </div>
          {selectedId === tpl.id && (
            <div className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-signal-500 text-white">
              <Check size={12} />
            </div>
          )}
          <div className="border-t border-line-light bg-white px-2 py-1.5 text-center text-xs font-medium dark:border-line-dark dark:bg-ink-900">
            {tpl.name}
          </div>
        </button>
      ))}
    </div>
  );
}
