import { getDocumentProxy } from "unpdf";
import { HttpError } from "../lib/http-error";

export const MAX_PDF_FILES = 3;
export const MAX_PDF_FILE_BYTES = 5 * 1024 * 1024;
export const MAX_PDF_TEXT_LENGTH = 60_000;
const MAX_MULTIPART_BYTES = MAX_PDF_FILES * MAX_PDF_FILE_BYTES + 512 * 1024;
const MAX_PAGES_PER_PDF = 30;
const MAX_TOTAL_PAGES = 60;
const MAX_IMAGE_PIXELS = 16_777_216;
const EXTRACTION_TIMEOUT_MS = 15_000;

export interface PdfReferenceDocument {
  label: string;
  text: string;
}

export interface PdfExtractionResult {
  documents: PdfReferenceDocument[];
  pageCount: number;
  textLength: number;
  truncated: boolean;
}

async function readBodyWithLimit(request: Request): Promise<ArrayBuffer> {
  const declaredLength = request.headers.get("content-length");
  if (declaredLength) {
    const parsedLength = Number(declaredLength);
    if (!Number.isSafeInteger(parsedLength) || parsedLength < 0) throw new HttpError(422, "INVALID_CONTENT_LENGTH", "O tamanho do upload é inválido.");
    if (parsedLength > MAX_MULTIPART_BYTES) throw new HttpError(413, "PDF_UPLOAD_TOO_LARGE", "O upload ultrapassa o limite permitido para os PDFs.");
  }
  if (!request.body) throw new HttpError(422, "PDF_UPLOAD_EMPTY", "Adicione pelo menos um arquivo PDF.");

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  try {
    while (true) {
      const item = await reader.read();
      if (item.done) break;
      totalBytes += item.value.byteLength;
      if (totalBytes > MAX_MULTIPART_BYTES) {
        await reader.cancel();
        throw new HttpError(413, "PDF_UPLOAD_TOO_LARGE", "O upload ultrapassa o limite permitido para os PDFs.");
      }
      chunks.push(item.value);
    }
  } finally {
    reader.releaseLock();
  }

  const bodyBuffer = new ArrayBuffer(totalBytes);
  const body = new Uint8Array(bodyBuffer);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bodyBuffer;
}

export async function readBoundedMultipartFormData(request: Request): Promise<FormData> {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLocaleLowerCase("en-US").startsWith("multipart/form-data;")) {
    throw new HttpError(422, "INVALID_UPLOAD_TYPE", "Envie os PDFs usando um formulário de upload.");
  }
  const body = await readBodyWithLimit(request);
  try {
    return await new Response(body, { headers: { "Content-Type": contentType } }).formData();
  } catch {
    throw new HttpError(422, "INVALID_MULTIPART", "Não foi possível ler os arquivos enviados.");
  }
}

function hasPdfSignature(bytes: Uint8Array): boolean {
  return bytes.length >= 5 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46 && bytes[4] === 0x2d;
}

function sanitizeExtractedText(value: string): string {
  let sanitized = "";
  for (const character of value) {
    const codePoint = character.codePointAt(0) ?? 0;
    if (codePoint === 9 || codePoint === 10 || codePoint === 13 || codePoint >= 32) sanitized += character;
  }
  return sanitized.trim();
}

async function withinDeadline<T>(promise: Promise<T>, deadline: number): Promise<T> {
  const remaining = deadline - Date.now();
  if (remaining <= 0) throw new HttpError(422, "PDF_EXTRACTION_TIMEOUT", "Os PDFs demoraram demais para serem processados.");
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => reject(new HttpError(422, "PDF_EXTRACTION_TIMEOUT", "Os PDFs demoraram demais para serem processados.")), remaining);
      }),
    ]);
  } finally {
    if (timeoutId !== undefined) clearTimeout(timeoutId);
  }
}

export async function extractPdfDocuments(entries: FormDataEntryValue[]): Promise<PdfExtractionResult> {
  if (entries.length < 1) throw new HttpError(422, "PDF_REQUIRED", "Adicione pelo menos um arquivo PDF.");
  if (entries.length > MAX_PDF_FILES) throw new HttpError(422, "PDF_FILE_LIMIT", "Adicione no máximo 3 arquivos PDF.");
  if (entries.some((entry) => !(entry instanceof File))) throw new HttpError(422, "INVALID_PDF_FILE", "Todos os conteúdos adicionados devem ser arquivos PDF.");

  const files = entries as File[];
  const perDocumentTextLimit = Math.floor(MAX_PDF_TEXT_LENGTH / files.length);
  const deadline = Date.now() + EXTRACTION_TIMEOUT_MS;
  const documents: PdfReferenceDocument[] = [];
  let pageCount = 0;
  let textLength = 0;
  let truncated = false;

  for (const [index, file] of files.entries()) {
    if (file.size < 1) throw new HttpError(422, "PDF_EMPTY", `O PDF ${index + 1} está vazio.`);
    if (file.size > MAX_PDF_FILE_BYTES) throw new HttpError(413, "PDF_FILE_TOO_LARGE", `O PDF ${index + 1} ultrapassa 5 MB.`);
    if (!file.name.toLocaleLowerCase("pt-BR").endsWith(".pdf")) throw new HttpError(422, "INVALID_PDF_FILE", `O arquivo ${index + 1} precisa ter extensão .pdf.`);

    const bytes = new Uint8Array(await file.arrayBuffer());
    if (!hasPdfSignature(bytes)) throw new HttpError(422, "INVALID_PDF_FILE", `O arquivo ${index + 1} não é um PDF válido.`);

    let pdf: Awaited<ReturnType<typeof getDocumentProxy>> | null = null;
    try {
      pdf = await withinDeadline(getDocumentProxy(bytes, { maxImageSize: MAX_IMAGE_PIXELS, stopAtErrors: true }), deadline);
      if (pdf.numPages > MAX_PAGES_PER_PDF) throw new HttpError(422, "PDF_PAGE_LIMIT", `O PDF ${index + 1} ultrapassa 30 páginas.`);
      pageCount += pdf.numPages;
      if (pageCount > MAX_TOTAL_PAGES) throw new HttpError(422, "PDF_TOTAL_PAGE_LIMIT", "Os PDFs ultrapassam o limite total de 60 páginas.");

      let extracted = "";
      for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
        const page = await withinDeadline(pdf.getPage(pageNumber), deadline);
        try {
          const content = await withinDeadline(page.getTextContent(), deadline);
          const parts: string[] = [];
          for (const item of content.items) {
            if ("str" in item && typeof item.str === "string" && item.str.trim()) parts.push(item.str.trim());
          }
          const currentPageText = parts.join(" ").replace(/\s+/g, " ").trim();
          if (!currentPageText) continue;
          const separator = extracted ? "\n" : "";
          const available = perDocumentTextLimit - extracted.length - separator.length;
          if (available <= 0) {
            truncated = true;
            break;
          }
          extracted += separator + currentPageText.slice(0, available);
          if (currentPageText.length > available || pageNumber < pdf.numPages && extracted.length >= perDocumentTextLimit) {
            truncated = true;
            break;
          }
        } finally {
          page.cleanup();
        }
      }

      const normalized = sanitizeExtractedText(extracted);
      if (!normalized) throw new HttpError(422, "PDF_WITHOUT_TEXT", `Não foi encontrado texto no PDF ${index + 1}. PDFs somente com imagens precisam de OCR antes do envio.`);
      documents.push({ label: `Documento ${index + 1}`, text: normalized });
      textLength += normalized.length;
    } catch (error) {
      if (error instanceof HttpError) throw error;
      throw new HttpError(422, "PDF_EXTRACTION_FAILED", `Não foi possível extrair o texto do PDF ${index + 1}.`);
    } finally {
      if (pdf) {
        try { await pdf.loadingTask.destroy(); } catch { /* best-effort cleanup after malformed PDFs */ }
      }
    }
  }

  return { documents, pageCount, textLength, truncated };
}
