import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { parseSlipText } from "@/lib/slip-parser";

type SessionWithId = { user: { id?: string }; sessionId?: string };

const OCR_SPACE_URL = "https://api.ocr.space/parse/image";
const MAX_FILE_SIZE_BYTES = 1 * 1024 * 1024; // 1 MB (OCR.space free tier)
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/gif", "image/bmp", "image/tiff"];
const MAX_FILES_PER_REQUEST = 10;
const OCR_CONCURRENCY = 3;
const OCR_TIMEOUT_MS = 20000;
const IS_PRODUCTION = process.env.APP_ENV === "production";

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

async function runWithConcurrency<T>(
  tasks: Array<() => Promise<T>>,
  limit: number,
): Promise<T[]> {
  const results: T[] = new Array(tasks.length);
  let nextIndex = 0;

  async function worker() {
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const current = nextIndex;
      if (current >= tasks.length) break;
      nextIndex += 1;
      results[current] = await tasks[current]();
    }
  }

  const workerCount = Math.min(limit, tasks.length);
  const workers: Promise<void>[] = [];
  for (let i = 0; i < workerCount; i += 1) {
    workers.push(worker());
  }
  await Promise.all(workers);
  return results;
}

async function processFile(
  index: number,
  file: File,
  apiKey: string,
  requestId: string,
): Promise<SlipItemResponse> {
  const rawFileName = file.name || `image-${index + 1}`;
  const baseLog = {
    requestId,
    index,
    fileName: rawFileName,
    fileSize: file.size,
  };

  const log = (stage: string, extra: Record<string, unknown> = {}): void => {
    if (IS_PRODUCTION) return;
    // eslint-disable-next-line no-console
    console.log(
      JSON.stringify({
        stage,
        ...baseLog,
        ...extra,
      }),
    );
  };

  if (file.size > MAX_FILE_SIZE_BYTES) {
    log("skip_file_too_large");
    return {
      index,
      rawFileName,
      error: "FILE_TOO_LARGE",
    };
  }

  const contentType = file.type || "";
  if (contentType && !ALLOWED_TYPES.includes(contentType)) {
    log("skip_invalid_type", { contentType });
    return {
      index,
      rawFileName,
      error: "INVALID_FILE_TYPE",
    };
  }

  const ocrStart = Date.now();
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

  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, OCR_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(OCR_SPACE_URL, {
      method: "POST",
      headers: {
        apikey: apiKey,
      },
      body: ocrForm,
      signal: controller.signal,
    });
  } catch (error) {
    clearTimeout(timeoutId);
    const durationMs = Date.now() - ocrStart;
    if (error instanceof Error && error.name === "AbortError") {
      log("ocr_timeout", { durationMs });
      return {
        index,
        rawFileName,
        rawText: undefined,
        error: "OCR_REQUEST_TIMEOUT",
      };
    }
    log("ocr_request_failed", { durationMs, error: error instanceof Error ? error.message : String(error) });
    return {
      index,
      rawFileName,
      rawText: undefined,
      error: "OCR_REQUEST_FAILED",
    };
  } finally {
    clearTimeout(timeoutId);
  }

  const durationMs = Date.now() - ocrStart;
  log("ocr_response", { status: res.status, durationMs });

  if (res.status === 429) {
    log("ocr_rate_limit");
    // Signal caller to return 429 for the whole request
    throw new Error("RATE_LIMIT");
  }

  let data: OcrSpaceResponse;
  try {
    data = (await res.json()) as OcrSpaceResponse;
  } catch (error) {
    log("ocr_response_invalid", { error: error instanceof Error ? error.message : String(error) });
    return {
      index,
      rawFileName,
      error: "OCR_RESPONSE_INVALID",
    };
  }

  if (data.IsErroredOnProcessing || (data.OCRExitCode && data.OCRExitCode >= 3)) {
    const message = data.ErrorMessage;
    const errMsg = typeof message === "string"
      ? message
      : data.ErrorDetails ?? "OCR failed";
    log("ocr_failed", { OCRExitCode: data.OCRExitCode, error: errMsg });
    return {
      index,
      rawFileName,
      error: errMsg || "OCR_FAILED",
    };
  }

  const first = data.ParsedResults?.[0];
  if (!first || first.FileParseExitCode !== 1 || !first.ParsedText) {
    const errMsg = first?.ErrorMessage ?? first?.ErrorDetails ?? "No text extracted";
    log("parse_failed_no_text", { error: errMsg });
    return {
      index,
      rawFileName,
      rawText: first?.ParsedText ?? undefined,
      error: errMsg || "PARSE_FAILED",
    };
  }

  const parsed = parseSlipText(first.ParsedText);
  if (!parsed) {
    log("parse_failed_amount", {});
    return {
      index,
      rawFileName,
      rawText: first.ParsedText,
      error: "PARSE_FAILED",
    };
  }

  log("parse_success", { amount: parsed.amount });

  return {
    index,
    rawFileName,
    rawText: first.ParsedText,
    parsed: {
      amount: parsed.amount,
      occurredAt: parsed.occurredAt ? parsed.occurredAt.toISOString() : null,
      note: parsed.note ?? null,
    },
  };
}

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

  if (files.length > MAX_FILES_PER_REQUEST) {
    return NextResponse.json(
      { error: `Too many files. Maximum is ${MAX_FILES_PER_REQUEST}.` },
      { status: 400 },
    );
  }

  const requestId = IS_PRODUCTION
    ? ""
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const routeStart = Date.now();
  if (!IS_PRODUCTION) {
    // eslint-disable-next-line no-console
    console.log(
      JSON.stringify({
        stage: "route_start",
        requestId,
        fileCount: files.length,
      }),
    );
  }

  const tasks = files.map(
    (file, index) => () => processFile(index, file, apiKey, requestId),
  );

  try {
    const items: SlipItemResponse[] = await runWithConcurrency(
      tasks,
      OCR_CONCURRENCY,
    );
    if (!IS_PRODUCTION) {
      const totalDurationMs = Date.now() - routeStart;
      // eslint-disable-next-line no-console
      console.log(
        JSON.stringify({
          stage: "route_end",
          requestId,
          fileCount: files.length,
          totalDurationMs,
        }),
      );
    }
    return NextResponse.json({ items });
  } catch (error) {
    if (!IS_PRODUCTION) {
      const totalDurationMs = Date.now() - routeStart;
      // eslint-disable-next-line no-console
      console.log(
        JSON.stringify({
          stage: "route_error",
          requestId,
          fileCount: files.length,
          totalDurationMs,
          error: error instanceof Error ? error.message : String(error),
        }),
      );
    }

    if (error instanceof Error && error.message === "RATE_LIMIT") {
      return NextResponse.json(
        { error: "Slip OCR rate limit exceeded. Please try again later." },
        { status: 429 },
      );
    }

    return NextResponse.json(
      { error: "Failed to process slips" },
      { status: 500 },
    );
  }
}
