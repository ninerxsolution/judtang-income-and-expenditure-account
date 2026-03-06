import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { parseSlipText } from "@/lib/slip-parser";

type SessionWithId = { user: { id?: string }; sessionId?: string };

const OCR_SPACE_URL = "https://api.ocr.space/parse/image";
const MAX_FILE_SIZE_BYTES = 1 * 1024 * 1024; // 1 MB (OCR.space free tier)
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/gif", "image/bmp", "image/tiff"];

type OcrSpaceParsedResult = {
  FileParseExitCode: number;
  ParsedText: string | null;
  ErrorMessage: string | null;
  ErrorDetails: string | null;
};

type OcrSpaceResponse = {
  OCRExitCode: number;
  IsErroredOnProcessing: boolean;
  ErrorMessage: string | null;
  ErrorDetails: string | null;
  ParsedResults?: OcrSpaceParsedResult[];
};

export type SlipItemResponse = {
  index: number;
  rawFileName: string;
  rawText?: string;
  parsed?: {
    amount: number;
    occurredAt: string | null;
    note: string | null;
  };
  error?: string;
};

function collectFiles(formData: FormData): File[] {
  const files: File[] = [];
  const fileKeys = ["file", "files"];
  for (const key of fileKeys) {
    const entries = formData.getAll(key);
    for (const entry of entries) {
      if (entry instanceof File) files.push(entry);
    }
  }
  // Also support files[0], files[1], etc.
  let i = 0;
  while (true) {
    const f = formData.get(`files[${i}]`);
    if (!(f instanceof File)) break;
    files.push(f);
    i++;
  }
  return files;
}

export async function POST(request: Request) {
  const session = (await getServerSession(authOptions)) as SessionWithId | null;
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.OCR_SPACE_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json(
      { error: "Slip OCR is not configured" },
      { status: 503 }
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Invalid form data" },
      { status: 400 }
    );
  }

  const files = collectFiles(formData);
  if (files.length === 0) {
    return NextResponse.json(
      { error: "At least one image file is required" },
      { status: 400 }
    );
  }

  const items: SlipItemResponse[] = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const rawFileName = file.name || `image-${i + 1}`;

    if (file.size > MAX_FILE_SIZE_BYTES) {
      items.push({
        index: i,
        rawFileName,
        error: "FILE_TOO_LARGE",
      });
      continue;
    }

    const contentType = file.type || "";
    if (contentType && !ALLOWED_TYPES.includes(contentType)) {
      items.push({
        index: i,
        rawFileName,
        error: "INVALID_FILE_TYPE",
      });
      continue;
    }

    const arrayBuffer = await file.arrayBuffer();
    const blob = new Blob([arrayBuffer], {
      type: file.type || "application/octet-stream",
    });
    const ocrForm = new FormData();
    ocrForm.append("file", blob, file.name || "image.png");
    // ocrForm.append("language", "tha");
    ocrForm.append("OCREngine", "3");
    ocrForm.append("isOverlayRequired", "false");
    ocrForm.append("apikey", apiKey);

    let res: Response;
    try {
      res = await fetch(OCR_SPACE_URL, {
        method: "POST",
        headers: {
          apikey: apiKey,
        },
        body: ocrForm,
      });
    } catch {
      items.push({
        index: i,
        rawFileName,
        rawText: undefined,
        error: "OCR_REQUEST_FAILED",
      });
      continue;
    }

    if (res.status === 429) {
      return NextResponse.json(
        { error: "Slip OCR rate limit exceeded. Please try again later." },
        { status: 429 }
      );
    }

    let data: OcrSpaceResponse;
    try {
      data = (await res.json()) as OcrSpaceResponse;
    } catch {
      items.push({
        index: i,
        rawFileName,
        error: "OCR_RESPONSE_INVALID",
      });
      continue;
    }

    if (data.IsErroredOnProcessing || (data.OCRExitCode && data.OCRExitCode >= 3)) {
      const message = data.ErrorMessage;
      const errMsg = typeof message === "string"
        ? message
        : data.ErrorDetails ?? "OCR failed";
      items.push({
        index: i,
        rawFileName,
        error: errMsg || "OCR_FAILED",
      });
      continue;
    }

    const first = data.ParsedResults?.[0];
    if (!first || first.FileParseExitCode !== 1 || !first.ParsedText) {
      const errMsg = first?.ErrorMessage ?? first?.ErrorDetails ?? "No text extracted";
      items.push({
        index: i,
        rawFileName,
        rawText: first?.ParsedText ?? undefined,
        error: errMsg || "PARSE_FAILED",
      });
      continue;
    }

    const parsed = parseSlipText(first.ParsedText);
    if (!parsed) {
      items.push({
        index: i,
        rawFileName,
        rawText: first.ParsedText,
        error: "PARSE_FAILED",
      });
      continue;
    }

    items.push({
      index: i,
      rawFileName,
      rawText: first.ParsedText,
      parsed: {
        amount: parsed.amount,
        occurredAt: parsed.occurredAt ? parsed.occurredAt.toISOString() : null,
        note: parsed.note ?? null,
      },
    });
  }

  return NextResponse.json({ items });
}
