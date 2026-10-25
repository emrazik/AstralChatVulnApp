import { NextResponse } from "next/server";
import { PDFParse } from "pdf-parse";
import { getPath as getPdfWorkerPath } from "pdf-parse/worker";
import { getAuthenticatedUserId } from "@/lib/auth";
import { isRateLimited } from "@/lib/rate-limit";
import { scanDocumentForInjection } from "@/lib/bedrock";
import { signPdfContext } from "@/lib/pdf-context";

// pdf-parse v2 requires the worker to be explicitly registered before use.
// Without this call it defaults to a relative "./pdf.worker.mjs" path that
// cannot resolve in the Next.js server context, causing getText() to throw.
PDFParse.setWorker(getPdfWorkerPath());

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const PDF_MAGIC_BYTES = [0x25, 0x50, 0x44, 0x46]; // %PDF

function isPdfMagicBytes(buffer: ArrayBuffer): boolean {
  const view = new Uint8Array(buffer, 0, 4);
  return PDF_MAGIC_BYTES.every((byte, i) => view[i] === byte);
}

export async function POST(request: Request) {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  if (isRateLimited(userId)) {
    return NextResponse.json(
      { message: "Rate limit exceeded. Please slow down." },
      { status: 429 }
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { message: "Invalid form data. Please upload a PDF file." },
      { status: 400 }
    );
  }

  const file = formData.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json(
      { message: "No file provided. Please upload a PDF." },
      { status: 400 }
    );
  }

  if (file.size === 0) {
    return NextResponse.json(
      { message: "Uploaded file is empty." },
      { status: 400 }
    );
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { message: "File too large. Maximum size is 5 MB." },
      { status: 400 }
    );
  }

  const fileName = file.name.toLowerCase();
  if (!fileName.endsWith(".pdf")) {
    return NextResponse.json(
      { message: "Invalid file type. Only PDF files are allowed." },
      { status: 400 }
    );
  }

  if (file.type !== "application/pdf") {
    return NextResponse.json(
      { message: "Invalid MIME type. Only PDF files are allowed." },
      { status: 400 }
    );
  }

  const arrayBuffer = await file.arrayBuffer();

  if (!isPdfMagicBytes(arrayBuffer)) {
    return NextResponse.json(
      { message: "File content is not a valid PDF." },
      { status: 400 }
    );
  }

  const pdfBuffer = Buffer.from(arrayBuffer);

  // Visual injection scan — rejects documents that visibly contain prompt injection
  // or HTML/JS payloads. Hidden text (white-on-white, 0pt font, etc.) is not seen
  // by the visual scanner and will not trigger this check.
  let scanSafe = false;
  try {
    const scan = await scanDocumentForInjection(pdfBuffer);
    scanSafe = scan.safe;
  } catch (err) {
    console.error("[upload] scan threw:", err);
  }
  if (!scanSafe) {
    return NextResponse.json(
      { message: "Document rejected: suspicious instructions detected." },
      { status: 422 }
    );
  }

  let parser: PDFParse | undefined;
  try {
    parser = new PDFParse({ data: pdfBuffer });
    const result = await parser.getText();

    const text = result.text?.trim();

    if (!text) {
      return NextResponse.json(
        { message: "Could not extract any text from the PDF. It may be image-based or empty." },
        { status: 422 }
      );
    }

    const truncated =
      text.length > 12_000
        ? text.slice(0, 12_000) + "\n\n[Text truncated — PDF exceeded 12,000 characters]"
        : text;

    return NextResponse.json({
      text: truncated,
      pdfToken: signPdfContext(userId, truncated),
      fileName: file.name,
      charCount: truncated.length
    });
  } catch {
    return NextResponse.json(
      { message: "Failed to parse the PDF. The file may be corrupted or password-protected." },
      { status: 422 }
    );
  } finally {
    await parser?.destroy();
  }
}
