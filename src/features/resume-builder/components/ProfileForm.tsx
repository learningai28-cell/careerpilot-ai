import { Plus, Trash2 } from "lucide-react";
import { Input } from "@/shared/components/Input";
import { Textarea } from "@/shared/components/Textarea";
import { Button } from "@/shared/components/Button";
import { Card, CardBody, CardHeader } from "@/shared/components/Card";
import { EducationItem, ExperienceItem, ResumeProfileData } from "../types";

interface ProfileFormProps {
  value: ResumeProfileData;
  onChange: (next: ResumeProfileData) => void;
}

function ChipList({
  items,
  onChange,
  placeholder,
}: {
  items: string[];
  onChange: (next: string[]) => void;
  placeholder: string;
}) {
  const addChip = (raw: string) => {
    const value = raw.trim();
    if (!value) return;
    onChange([...items, value]);
  };

  return (
    <div>
      <div className="mb-2 flex flex-wrap gap-2">
        {items.map((item, i) => (
          <span
            key={i}
            className="flex items-center gap-1.5 rounded-full bg-paper-100 px-2.5 py-1 text-xs font-medium dark:bg-ink-800"
          >
            {item}
            <button onClick={() => onChange(items.filter((_, idx) => idx !== i))}>
              <Trash2 size={11} className="text-slate-400 hover:text-rose-500" />
            </button>
          </span>
        ))}
      </div>
      <Input
        placeholder={placeholder}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            addChip((e.target as HTMLInputElement).value);
            (e.target as HTMLInputElement).value = "";
          }
        }}
      />
    </div>
  );
}

export function ProfileForm({ value, onChange }: ProfileFormProps) {
  const set = <K extends keyof ResumeProfileData>(key: K, v: ResumeProfileData[K]) =>
    onChange({ ...value, [key]: v });

  const updateExperience = (index: number, item: ExperienceItem) => {
    const next = [...value.experience];
    next[index] = item;
    set("experience", next);
  };

  const updateEducation = (index: number, item: EducationItem) => {
    const next = [...value.education];
    next[index] = item;
    set("education", next);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <h3 className="font-display text-sm font-semibold">Basic info</h3>
        </CardHeader>
        <CardBody className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input
            placeholder="Full name"
            value={value.full_name}
            onChange={(e) => set("full_name", e.target.value)}
          />
          <Input
            placeholder="Email"
            value={value.email ?? ""}
            onChange={(e) => set("email", e.target.value)}
          />
          <Input
            placeholder="Phone"
            value={value.phone ?? ""}
            onChange={(e) => set("phone", e.target.value)}
          />
          <Input
            placeholder="Location"
            value={value.location ?? ""}
            onChange={(e) => set("location", e.target.value)}
          />
          <Input
            placeholder="LinkedIn URL"
            value={value.linkedin_url ?? ""}
            onChange={(e) => set("linkedin_url", e.target.value)}
          />
          <Input
            placeholder="Portfolio URL"
            value={value.portfolio_url ?? ""}
            onChange={(e) => set("portfolio_url", e.target.value)}
          />
          <Textarea
            className="sm:col-span-2"
            rows={3}
            placeholder="Professional summary"
            value={value.summary ?? ""}
            onChange={(e) => set("summary", e.target.value)}
          />
        </CardBody>
      </Card>

      <Card>
        <CardHeader className="flex items-center justify-between">
          <h3 className="font-display text-sm font-semibold">Experience</h3>
          <Button
            size="sm"
            variant="secondary"
            onClick={() =>
              set("experience", [
                ...value.experience,
                { company: "", title: "", location: "", start_date: "", end_date: "", bullets: [""] },
              ])
            }
          >
            <Plus size={13} /> Add role
          </Button>
        </CardHeader>
        <CardBody className="space-y-5">
          {value.experience.map((exp, i) => (
            <div key={i} className="rounded-xl border border-line-light p-3 dark:border-line-dark">
              <div className="mb-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                <Input
                  placeholder="Company"
                  value={exp.company}
                  onChange={(e) => updateExperience(i, { ...exp, company: e.target.value })}
                />
                <Input
                  placeholder="Title"
                  value={exp.title}
                  onChange={(e) => updateExperience(i, { ...exp, title: e.target.value })}
                />
                <Input
                  placeholder="Start date"
                  value={exp.start_date ?? ""}
                  onChange={(e) => updateExperience(i, { ...exp, start_date: e.target.value })}
                />
                <Input
                  placeholder="End date (or Present)"
                  value={exp.end_date ?? ""}
                  onChange={(e) => updateExperience(i, { ...exp, end_date: e.target.value })}
                />
              </div>
              {exp.bullets.map((b, bi) => (
                <div key={bi} className="mb-1.5 flex gap-2">
                  <Input
                    value={b}
                    placeholder="Achievement bullet"
                    onChange={(e) => {
                      const bullets = [...exp.bullets];
                      bullets[bi] = e.target.value;
                      updateExperience(i, { ...exp, bullets });
                    }}
                  />
                  <button
                    onClick={() =>
                      updateExperience(i, {
                        ...exp,
                        bullets: exp.bullets.filter((_, idx) => idx !== bi),
                      })
                    }
                  >
                    <Trash2 size={14} className="text-slate-400 hover:text-rose-500" />
                  </button>
                </div>
              ))}
              <div className="mt-2 flex justify-between">
                <button
                  onClick={() => updateExperience(i, { ...exp, bullets: [...exp.bullets, ""] })}
                  className="text-xs font-medium text-signal-600 dark:text-signal-400"
                >
                  + Add bullet
                </button>
                <button
                  onClick={() => set("experience", value.experience.filter((_, idx) => idx !== i))}
                  className="text-xs font-medium text-rose-500"
                >
                  Remove role
                </button>
              </div>
            </div>
          ))}
          {value.experience.length === 0 && (
            <p className="text-sm text-slate-500 dark:text-slate-400">No experience added yet.</p>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader className="flex items-center justify-between">
          <h3 className="font-display text-sm font-semibold">Education</h3>
          <Button
            size="sm"
            variant="secondary"
            onClick={() =>
              set("education", [
                ...value.education,
                { institution: "", degree: "", field: "", start_date: "", end_date: "", details: "" },
              ])
            }
          >
            <Plus size={13} /> Add
          </Button>
        </CardHeader>
        <CardBody className="space-y-4">
          {value.education.map((ed, i) => (
            <div key={i} className="rounded-xl border border-line-light p-3 dark:border-line-dark">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <Input
                  placeholder="Institution"
                  value={ed.institution}
                  onChange={(e) => updateEducation(i, { ...ed, institution: e.target.value })}
                />
                <Input
                  placeholder="Degree"
                  value={ed.degree}
                  onChange={(e) => updateEducation(i, { ...ed, degree: e.target.value })}
                />
                <Input
                  placeholder="Field of study"
                  value={ed.field ?? ""}
                  onChange={(e) => updateEducation(i, { ...ed, field: e.target.value })}
                />
                <Input
                  placeholder="Year"
                  value={ed.end_date ?? ""}
                  onChange={(e) => updateEducation(i, { ...ed, end_date: e.target.value })}
                />
              </div>
              <button
                onClick={() => set("education", value.education.filter((_, idx) => idx !== i))}
                className="mt-2 text-xs font-medium text-rose-500"
              >
                Remove
              </button>
            </div>
          ))}
          {value.education.length === 0 && (
            <p className="text-sm text-slate-500 dark:text-slate-400">No education added yet.</p>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h3 className="font-display text-sm font-semibold">Skills</h3>
        </CardHeader>
        <CardBody>
          <ChipList
            items={value.skills}
            onChange={(next) => set("skills", next)}
            placeholder="Type a skill and press Enter"
          />
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h3 className="font-display text-sm font-semibold">Certifications</h3>
        </CardHeader>
        <CardBody>
          <ChipList
            items={value.certifications}
            onChange={(next) => set("certifications", next)}
            placeholder="Type a certification and press Enter"
          />
        </CardBody>
      </Card>
    </div>
  );
}
