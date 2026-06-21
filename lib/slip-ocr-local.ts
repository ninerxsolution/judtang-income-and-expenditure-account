"use client";

/**
 * On-device slip OCR via tesseract.js (WASM). No API/key/quota — runs in the
 * user's browser. Slower and less accurate than the cloud engine; offered as an
 * experimental, fully-free alternative.
 *
 * Worker/core/lang are loaded from a CDN with EXPLICIT paths so Next.js never
 * tries to bundle/serve the web worker itself (bundling it breaks worker spawn
 * and makes recognize() throw almost immediately). tesseract.js is dynamically
 * imported so nothing loads until this engine is actually used.
 */
const TESSERACT_VERSION = "7.0.0";
const WORKER_PATH = `https://cdn.jsdelivr.net/npm/tesseract.js@${TESSERACT_VERSION}/dist/worker.min.js`;
const CORE_PATH = `https://cdn.jsdelivr.net/npm/tesseract.js-core@${TESSERACT_VERSION}`;
const LANG_PATH = "https://tessdata.projectnaptha.com/4.0.0";

export async function recognizeSlipLocally(
  file: File,
  onProgress?: (progress: number) => void,
): Promise<string> {
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker("tha+eng", 1, {
    workerPath: WORKER_PATH,
    corePath: CORE_PATH,
    langPath: LANG_PATH,
    logger: (m: { status?: string; progress?: number }) => {
      if (onProgress && m.status === "recognizing text" && typeof m.progress === "number") {
        onProgress(m.progress);
      }
    },
  });
  try {
    const { data } = await worker.recognize(file);
    return data?.text ?? "";
  } finally {
    await worker.terminate();
  }
}
