// supabase/functions/_shared/extractText.ts
//
// Deno's npm: specifier support lets Edge Functions use ordinary npm
// packages for parsing. Kept isolated here so swapping the parsing
// library later doesn't touch analyze-resume/index.ts.

import pdfParse from "npm:pdf-parse@1.1.1";
import mammoth from "npm:mammoth@1.7.2";

export async function extractResumeText(
  fileBytes: ArrayBuffer,
  fileType: "pdf" | "docx"
): Promise<string> {
  if (fileType === "pdf") {
    const result = await pdfParse(new Uint8Array(fileBytes));
    return result.text.trim();
  }

  // docx
  const result = await mammoth.extractRawText({
    buffer: new Uint8Array(fileBytes),
  });
  return result.value.trim();
}
