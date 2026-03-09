import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { parseSlipText } from "@/lib/slip-parser";

type SessionWithId = { user: { id?: string }; sessionId?: string };

const OCR_SPACE_URL = "https://api.ocr.space/parse/image";
const MAX_FILE_SIZE_BYTES = 1 * 1024 * 1024; // 1 MB (OCR.space free tier)
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/gif", "image/bmp", "image/tiff"];
const MAX_FILES_PER_REQUEST = 10;
const OCR_CONCURRENCY = 5;
const OCR_TIMEOUT_MS = 60000; // 60 seconds
const OCR_MAX_RETRIES = 1;
const PRIMARY_OCR_ENGINE = "2";
const FALLBACK_OCR_ENGINE = "3";
const IS_PRODUCTION = process.env.APP_ENV === "production";

type OcrEngine = typeof PRIMARY_OCR_ENGINE | typeof FALLBACK_OCR_ENGINE;

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

type OcrRequestResult =
  | { kind: "response"; response: Response }
  | { kind: "error"; error: "OCR_REQUEST_TIMEOUT" | "OCR_REQUEST_FAILED" }
  | { kind: "rate_limit" };

async function runWithConcurrency<T>(
  tasks: Array<() => Promise<T>>,
  limit: number,
): Promise<T[]> {
  const results: T[] = new Array(tasks.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < tasks.length) {
      const current = nextIndex;
      nextIndex += 1;
      const task = tasks[current];
      if (!task) return;
      results[current] = await task();
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

  const arrayBuffer = await file.arrayBuffer();
  const blob = new Blob([arrayBuffer], {
    type: file.type || "application/octet-stream",
  });

  async function fetchOcrResponse(engine: OcrEngine): Promise<OcrRequestResult> {
    let res: Response | null = null;
    for (let attempt = 0; attempt <= OCR_MAX_RETRIES; attempt += 1) {
      const ocrForm = new FormData();
      ocrForm.append("file", blob, file.name || "image.png");
      // ocrForm.append("language", "tha");
      ocrForm.append("OCREngine", engine);
      ocrForm.append("isOverlayRequired", "false");
      ocrForm.append("apikey", apiKey);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
      }, OCR_TIMEOUT_MS);
      const attemptStart = Date.now();

      try {
        res = await fetch(OCR_SPACE_URL, {
          method: "POST",
          headers: {
            apikey: apiKey,
          },
          body: ocrForm,
          signal: controller.signal,
        });
        log("ocr_response", {
          engine,
          status: res.status,
          durationMs: Date.now() - attemptStart,
          attempt: attempt + 1,
        });
        break;
      } catch (error) {
        const durationMs = Date.now() - attemptStart;
        const shouldRetry = attempt < OCR_MAX_RETRIES;
        const errorMessage = error instanceof Error ? error.message : String(error);

        if (error instanceof Error && error.name === "AbortError") {
          log(shouldRetry ? "ocr_timeout_retry" : "ocr_timeout", {
            engine,
            durationMs,
            attempt: attempt + 1,
          });
          if (shouldRetry) {
            continue;
          }
          return { kind: "error", error: "OCR_REQUEST_TIMEOUT" };
        }

        log(shouldRetry ? "ocr_request_failed_retry" : "ocr_request_failed", {
          engine,
          durationMs,
          attempt: attempt + 1,
          error: errorMessage,
        });
        if (shouldRetry) {
          continue;
        }
        return { kind: "error", error: "OCR_REQUEST_FAILED" };
      } finally {
        clearTimeout(timeoutId);
      }
    }

    if (!res) {
      return { kind: "error", error: "OCR_REQUEST_FAILED" };
    }

    if (res.status === 429) {
      log("ocr_rate_limit", { engine });
      return { kind: "rate_limit" };
    }

    return { kind: "response", response: res };
  }

  const engines: OcrEngine[] = [PRIMARY_OCR_ENGINE, FALLBACK_OCR_ENGINE];
  for (const engine of engines) {
    const requestResult = await fetchOcrResponse(engine);
    if (requestResult.kind === "rate_limit") {
      throw new Error("RATE_LIMIT");
    }
    if (requestResult.kind === "error") {
      return {
        index,
        rawFileName,
        rawText: undefined,
        error: requestResult.error,
      };
    }

    const res = requestResult.response;
    let data: OcrSpaceResponse;
    try {
      data = (await res.json()) as OcrSpaceResponse;
    } catch (error) {
      log("ocr_response_invalid", {
        engine,
        error: error instanceof Error ? error.message : String(error),
      });
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
      log("ocr_failed", { engine, OCRExitCode: data.OCRExitCode, error: errMsg });
      return {
        index,
        rawFileName,
        error: errMsg || "OCR_FAILED",
      };
    }

    const first = data.ParsedResults?.[0];
    if (!first || first.FileParseExitCode !== 1 || !first.ParsedText) {
      const errMsg = first?.ErrorMessage ?? first?.ErrorDetails ?? "No text extracted";
      const shouldFallback = engine === PRIMARY_OCR_ENGINE;
      log(shouldFallback ? "parse_failed_no_text_fallback" : "parse_failed_no_text", {
        engine,
        error: errMsg,
      });
      if (shouldFallback) {
        continue;
      }
      return {
        index,
        rawFileName,
        rawText: first?.ParsedText ?? undefined,
        error: errMsg || "PARSE_FAILED",
      };
    }

    const parsed = parseSlipText(first.ParsedText);
    if (!parsed) {
      const shouldFallback = engine === PRIMARY_OCR_ENGINE;
      log(shouldFallback ? "parse_failed_amount_fallback" : "parse_failed_amount", {
        engine,
      });
      if (shouldFallback) {
        continue;
      }
      return {
        index,
        rawFileName,
        rawText: first.ParsedText,
        error: "PARSE_FAILED",
      };
    }

    log("parse_success", { engine, amount: parsed.amount });
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
  return {
    index,
    rawFileName,
    error: "PARSE_FAILED",
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
