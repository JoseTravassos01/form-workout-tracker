import { describe, expect, it } from "vitest";
import { extractPdfDocuments, readBoundedMultipartFormData } from "../../worker/services/pdf-content-service";

function createTextPdf(text: string): ArrayBuffer {
  const escapedText = text.replace(/([\\()])/g, "\\$1");
  const stream = `BT\n/F1 12 Tf\n72 720 Td\n(${escapedText}) Tj\nET`;
  const objects = [
    "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n",
    "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n",
    "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>\nendobj\n",
    `4 0 obj\n<< /Length ${new TextEncoder().encode(stream).byteLength} >>\nstream\n${stream}\nendstream\nendobj\n`,
    "5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n",
  ];
  let source = "%PDF-1.4\n";
  const offsets: number[] = [];
  for (const object of objects) {
    offsets.push(new TextEncoder().encode(source).byteLength);
    source += object;
  }
  const xrefOffset = new TextEncoder().encode(source).byteLength;
  source += `xref\n0 6\n0000000000 65535 f \n${offsets.map((offset) => `${String(offset).padStart(10, "0")} 00000 n `).join("\n")}\n`;
  source += `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  const encoded = new TextEncoder().encode(source);
  const buffer = new ArrayBuffer(encoded.byteLength);
  new Uint8Array(buffer).set(encoded);
  return buffer;
}

describe("conteúdo de PDF para planejamento por IA", () => {
  it("lê multipart limitado e extrai texto de um PDF válido", async () => {
    const form = new FormData();
    form.set("prompt", "Use o conteúdo anexado para montar o treino.");
    form.set("durationWeeks", "4");
    form.set("startDate", "2026-08-17");
    form.append("pdfs", new File([createTextPdf("Treino Lower com Hip Thrust em tres series")], "treino.pdf", { type: "application/pdf" }));
    const request = new Request("http://gym.test/api/program/ai/generate-from-pdf", { method: "POST", body: form });

    const parsedForm = await readBoundedMultipartFormData(request);
    const result = await extractPdfDocuments(parsedForm.getAll("pdfs"));

    expect(result).toMatchObject({ pageCount: 1, truncated: false });
    expect(result.documents).toHaveLength(1);
    expect(result.documents[0]?.text).toContain("Hip Thrust");
  });

  it("rejeita mais de três arquivos e conteúdo que não é PDF", async () => {
    const valid = new File([createTextPdf("Treino valido")], "treino.pdf", { type: "application/pdf" });
    await expect(extractPdfDocuments([valid, valid, valid, valid])).rejects.toMatchObject({ code: "PDF_FILE_LIMIT" });
    await expect(extractPdfDocuments([new File(["nao e pdf"], "treino.pdf", { type: "application/pdf" })])).rejects.toMatchObject({ code: "INVALID_PDF_FILE" });
  });
});
