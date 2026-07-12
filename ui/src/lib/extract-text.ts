// Shared PDF/DOC/DOCX -> plain text extraction, used by /api/parse-resume
// and /api/cover-letter (uploading your own letter).
export async function extractText(buffer: Buffer, filename: string): Promise<string> {
  const ext = filename.split(".").pop()?.toLowerCase() ?? ""

  if (ext === "pdf") {
    const { PDFParse } = require("pdf-parse")
    const parser = new PDFParse({ data: new Uint8Array(buffer) })
    const result = await parser.getText({ cellSeparator: "\n" })
    // Normalize middle-dot separators and collapse excessive blank lines
    return result.text
      .replace(/ [·•‧] /g, "\n")   // · • ‧ used as cell separators
      .replace(/\t/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
  }

  if (ext === "doc" || ext === "docx") {
    const mammoth = await import("mammoth")
    const result = await mammoth.extractRawText({ buffer })
    return result.value
  }

  if (ext === "txt") {
    return buffer.toString("utf-8")
  }

  throw new Error("Unsupported file type")
}
