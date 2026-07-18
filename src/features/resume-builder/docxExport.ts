import {
  AlignmentType,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  TextRun,
} from "docx";
import { ResumeProfileData } from "./types";

/**
 * Builds a Word document from the same ResumeProfileData used to render
 * the PDF templates. Deliberately plain/clean formatting rather than
 * trying to replicate a specific chosen template's visual design — the
 * whole point of a .docx export is that the person can freely restructure
 * it themselves afterward, so a heavily styled starting point would just
 * fight them.
 */
export async function generateResumeDocx(data: ResumeProfileData): Promise<Blob> {
  const children: Paragraph[] = [];

  children.push(
    new Paragraph({
      children: [new TextRun({ text: data.full_name || "Your Name", bold: true, size: 32 })],
    })
  );

  const contactParts = [data.email, data.phone, data.location, data.linkedin_url, data.portfolio_url].filter(
    Boolean
  );
  if (contactParts.length > 0) {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: contactParts.join("  |  "), size: 20, color: "666666" })],
        spacing: { after: 200 },
      })
    );
  }

  if (data.summary) {
    children.push(new Paragraph({ children: [new TextRun({ text: data.summary, size: 22 })], spacing: { after: 240 } }));
  }

  if (data.experience.length > 0) {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        text: "Experience",
        spacing: { before: 120, after: 120 },
      })
    );
    for (const exp of data.experience) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: `${exp.title} — ${exp.company}`, bold: true, size: 22 }),
            new TextRun({
              text: `   ${exp.start_date ?? ""} – ${exp.end_date ?? ""}`,
              italics: true,
              size: 20,
              color: "666666",
            }),
          ],
          spacing: { after: 60 },
        })
      );
      for (const bullet of exp.bullets.filter(Boolean)) {
        children.push(
          new Paragraph({
            text: bullet,
            bullet: { level: 0 },
            spacing: { after: 40 },
          })
        );
      }
    }
  }

  if (data.education.length > 0) {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        text: "Education",
        spacing: { before: 200, after: 120 },
      })
    );
    for (const ed of data.education) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: `${ed.degree}${ed.field ? `, ${ed.field}` : ""}`, bold: true, size: 22 }),
          ],
        })
      );
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `${ed.institution}${ed.end_date ? `  ·  ${ed.end_date}` : ""}`,
              size: 20,
              color: "666666",
            }),
          ],
          spacing: { after: 120 },
        })
      );
    }
  }

  if (data.skills.length > 0) {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        text: "Skills",
        spacing: { before: 200, after: 120 },
      })
    );
    children.push(new Paragraph({ text: data.skills.join(", "), spacing: { after: 120 } }));
  }

  if (data.certifications.length > 0) {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        text: "Certifications",
        spacing: { before: 200, after: 120 },
      })
    );
    children.push(new Paragraph({ text: data.certifications.join(", ") }));
  }

  const doc = new Document({
    sections: [
      {
        properties: {},
        children,
      },
    ],
  });

  return Packer.toBlob(doc);
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
