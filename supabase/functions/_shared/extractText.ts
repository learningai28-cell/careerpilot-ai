// supabase/functions/_shared/extractText.ts
//
// Deno's npm: specifier support lets Edge Functions use ordinary npm
// packages for parsing. Kept isolated here so swapping the parsing
// library later doesn't touch analyze-resume/index.ts.

import pdfParse from "npm:pdf-parse@1.1.1";
import mammoth from "npm:mammoth@1.7.2";
import { Buffer } from "node:buffer";

export async function extractResumeText(
  fileBytes: ArrayBuffer,
  fileType: "pdf" | "docx"
): Promise<string> {
  if (fileType === "pdf") {
    const result = await pdfParse(new Uint8Array(fileBytes));
    return result.text.trim();
  }

  // docx
  // mammoth's types want a Node Buffer, not a plain Uint8Array.
  const result = await mammoth.extractRawText({
    buffer: Buffer.from(fileBytes),
  });
  return result.value.trim();
}
