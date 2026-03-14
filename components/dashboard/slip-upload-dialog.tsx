"use client";

import NextImage from "next/image";
import { useState, useEffect, useRef } from "react";
import {
  AlertCircle,
  ArrowDownCircle,
  ArrowUpCircle,
  CheckCircle2,
  ChevronDown,
  ImagePlus,
  Loader2,
  MoreHorizontal,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogBody,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { getCategoryDisplayName } from "@/lib/categories-display";
import { AccountCombobox } from "@/components/dashboard/account-combobox";
import type { AccountOption } from "@/components/dashboard/account-combobox";
import { formatYearForDisplay } from "@/lib/format-year";
import { cn } from "@/lib/utils";
import { useI18n } from "@/hooks/use-i18n";
import { useIsMobile } from "@/hooks/use-mobile";
import { useVisualViewport } from "@/hooks/use-visual-viewport";

const MAX_FILE_SIZE_BYTES = 1 * 1024 * 1024; // 1 MB
const MAX_FILES_PER_REQUEST = 10;
const COMPRESS_IMAGE_MAX_DIMENSION = 768;
const COMPRESS_IMAGE_QUALITY = 0.45;
const SLIP_UPLOAD_STORAGE_KEY = "judtang:slip-upload:drafts:v1";

type SlipProcessingStage =
  | "queued"
  | "compressing"
  | "uploading"
  | "processing"
  | "success"
  | "error";

type SlipStepStatus = "pending" | "active" | "done" | "skipped" | "error";

type AbortableRequest = {
  abort: () => void;
};

type PersistedSlipUploadState = {
  drafts: PersistedSlipDraft[];
  batchElapsedMs: number | null;
  globalError: string | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function sanitizeAmountInput(value: string): string {
  const noComma = value.replace(/,/g, "");
  const digitsAndDot = noComma.replace(/[^\d.]/g, "");
  const parts = digitsAndDot.split(".");
  const intPart = parts[0] ?? "";
  const decPart = parts.length > 1 ? parts.slice(1).join("").slice(0, 2) : "";
  return parts.length > 1 ? `${intPart}.${decPart}` : intPart;
}

function formatTodayAsInputDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDateToInput(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return formatTodayAsInputDate();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function combineDateWithCurrentTime(dateStr: string): string {
  const [y, m, day] = dateStr.split("-").map(Number);
  const now = new Date();
  const combined = new Date(
    y,
    m - 1,
    day,
    now.getHours(),
    now.getMinutes(),
    now.getSeconds(),
    now.getMilliseconds()
  );
  return combined.toISOString();
}

function replaceFileExtension(fileName: string, extension: string): string {
  return fileName.replace(/\.[^.]+$/, extension);
}

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatUploadSpeed(bytesPerSec: number): string {
  if (bytesPerSec < 1024 * 1024) {
    return `${Math.round(bytesPerSec / 1024)} KB/s`;
  }
  return `${(bytesPerSec / (1024 * 1024)).toFixed(1)} MB/s`;
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function isValidDatePart(value: number): boolean {
  return Number.isFinite(value);
}

async function compressImage(file: File): Promise<File> {
  if (
    !file.type.startsWith("image/") ||
    file.type === "image/gif"
  ) {
    return file;
  }

  return new Promise<File>((resolve) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);

      const longestSide = Math.max(image.width, image.height);
      const scale =
        longestSide > COMPRESS_IMAGE_MAX_DIMENSION
          ? COMPRESS_IMAGE_MAX_DIMENSION / longestSide
          : 1;
      const width = Math.max(1, Math.round(image.width * scale));
      const height = Math.max(1, Math.round(image.height * scale));

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const context = canvas.getContext("2d");
      if (!context) {
        resolve(file);
        return;
      }

      context.drawImage(image, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (!blob || blob.size >= file.size) {
            resolve(file);
            return;
          }

          resolve(
            new File([blob], replaceFileExtension(file.name, ".jpg"), {
              type: "image/jpeg",
              lastModified: file.lastModified,
            })
          );
        },
        "image/jpeg",
        COMPRESS_IMAGE_QUALITY
      );
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(file);
    };

    image.src = objectUrl;
  });
}

type SlipDraft = {
  id: string;
  file: File | null;
  amount: string;
  occurredAt: string;
  note: string;
  type: "INCOME" | "EXPENSE";
  financialAccountId: string;
  categoryId: string;
  rawText?: string;
  error?: string;
  rawFileName: string;
  parseStatus: "loading" | "success" | "error";
  processingStage: SlipProcessingStage;
  compressionStatus: SlipStepStatus;
  uploadStatus: SlipStepStatus;
  ocrStatus: SlipStepStatus;
  submitStatus: "idle" | "submitting" | "success" | "error";
  ocrResponse?: SlipResponseDetail;
  transactionResponse?: SlipResponseDetail;
  originalFileSizeBytes: number;
  uploadFileSizeBytes: number | null;
  uploadedBytes: number;
  uploadPercent: number | null;
  uploadSpeedBytesPerSec: number | null;
  uploadStartedAtMs: number | null;
  slipStartedAtMs: number | null;
  slipElapsedMs: number | null;
};

type PersistedSlipDraft = Omit<SlipDraft, "file">;

type SlipParseItem = {
  index: number;
  rawFileName: string;
  rawText?: string;
  parsed?: { amount: number; occurredAt: string | null; note: string | null };
  error?: string;
};

type SlipParseResponseBody = {
  items?: SlipParseItem[];
  error?: string;
};

type SlipResponseDetail = {
  status: number | null;
  ok: boolean;
  body: unknown;
};

type ParseSlipApiResult = {
  status: number;
  ok: boolean;
  data: SlipParseResponseBody | { error: string };
};

function serializeSlipDraft(draft: SlipDraft): PersistedSlipDraft {
  const { file: _file, ...persistedDraft } = draft;
  return persistedDraft;
}

function getInterruptedDraft(draft: PersistedSlipDraft, message: string): SlipDraft {
  const uploadWasFinished = draft.uploadStatus === "done" || draft.processingStage === "processing";

  return {
    ...draft,
    file: null,
    parseStatus: draft.parseStatus === "loading" ? "error" : draft.parseStatus,
    processingStage: "error",
    compressionStatus:
      draft.compressionStatus === "done" || draft.compressionStatus === "skipped"
        ? draft.compressionStatus
        : "error",
    uploadStatus:
      draft.uploadStatus === "skipped" ? "skipped" : uploadWasFinished ? "done" : "error",
    ocrStatus: "error",
    submitStatus: draft.submitStatus === "submitting" ? "error" : draft.submitStatus,
    error: message,
    transactionResponse:
      draft.submitStatus === "submitting"
        ? {
            status: null,
            ok: false,
            body: { error: message },
          }
        : draft.transactionResponse,
    slipElapsedMs:
      draft.slipElapsedMs ?? (draft.slipStartedAtMs !== null ? Date.now() - draft.slipStartedAtMs : null),
  };
}

function restoreSlipDraft(draft: PersistedSlipDraft, interruptedMessage: string): SlipDraft {
  const needsInterruptionRecovery =
    draft.parseStatus === "loading" ||
    draft.submitStatus === "submitting" ||
    draft.processingStage === "queued" ||
    draft.processingStage === "compressing" ||
    draft.processingStage === "uploading" ||
    draft.processingStage === "processing";

  if (needsInterruptionRecovery) {
    return getInterruptedDraft(draft, interruptedMessage);
  }

  return {
    ...draft,
    file: null,
  };
}

function parsePersistedSlipUploadState(
  rawValue: string,
  interruptedMessage: string
): PersistedSlipUploadState & { restoredDrafts: SlipDraft[]; hadInterruptedDraft: boolean } {
  const parsed: unknown = JSON.parse(rawValue);

  if (!isRecord(parsed)) {
    throw new Error("Invalid persisted slip upload state");
  }

  const draftsValue = parsed.drafts;
  const batchElapsedMsValue = parsed.batchElapsedMs;
  const globalErrorValue = parsed.globalError;

  const persistedDrafts = Array.isArray(draftsValue)
    ? (draftsValue.filter(isRecord) as PersistedSlipDraft[])
    : [];

  const restoredDrafts = persistedDrafts.map((draft) => restoreSlipDraft(draft, interruptedMessage));
  const hadInterruptedDraft = persistedDrafts.some(
    (draft) =>
      draft.parseStatus === "loading" ||
      draft.submitStatus === "submitting" ||
      draft.processingStage === "queued" ||
      draft.processingStage === "compressing" ||
      draft.processingStage === "uploading" ||
      draft.processingStage === "processing"
  );

  return {
    drafts: persistedDrafts,
    restoredDrafts,
    hadInterruptedDraft,
    batchElapsedMs: typeof batchElapsedMsValue === "number" ? batchElapsedMsValue : null,
    globalError: typeof globalErrorValue === "string" ? globalErrorValue : null,
  };
}

type SlipUploadDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
};

export function SlipUploadDialog({
  open,
  onOpenChange,
  onSuccess,
}: SlipUploadDialogProps) {
  const { t, language } = useI18n();
  const localeKey = language === "th" ? "th" : "en";
  const isMobile = useIsMobile();
  const viewport = useVisualViewport(open && isMobile);

  const [step, setStep] = useState<"select" | "preview">("select");
  const [drafts, setDrafts] = useState<SlipDraft[]>([]);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [responseDraftId, setResponseDraftId] = useState<string | null>(null);
  const [previewDraftId, setPreviewDraftId] = useState<string | null>(null);
  const [editingDraftIds, setEditingDraftIds] = useState<string[]>([]);
  const [restoredMessage, setRestoredMessage] = useState<string | null>(null);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(false);
  const [batchElapsedMs, setBatchElapsedMs] = useState<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const requestControllersRef = useRef(new Map<string, AbortableRequest>());
  const processingSessionRef = useRef(0);
  const hydratedStorageRef = useRef(false);

  function resetSlipUpload(options?: { preserveStep?: boolean }) {
    processingSessionRef.current += 1;
    requestControllersRef.current.forEach((controller) => controller.abort());
    requestControllersRef.current.clear();
    setDrafts([]);
    setGlobalError(null);
    setRestoredMessage(null);
    setResponseDraftId(null);
    setPreviewDraftId(null);
    setEditingDraftIds([]);
    setBatchElapsedMs(null);
    setFileInputKey((k) => k + 1);
    if (!options?.preserveStep) {
      setStep("select");
    }
  }

  useEffect(() => {
    if (hydratedStorageRef.current) return;

    const rawValue = window.localStorage.getItem(SLIP_UPLOAD_STORAGE_KEY);
    hydratedStorageRef.current = true;
    if (!rawValue) return;

    try {
      const persistedState = parsePersistedSlipUploadState(
        rawValue,
        t("dashboard.slipUpload.restoreInterrupted")
      );

      if (persistedState.restoredDrafts.length === 0) {
        window.localStorage.removeItem(SLIP_UPLOAD_STORAGE_KEY);
        return;
      }

      setDrafts(persistedState.restoredDrafts);
      setBatchElapsedMs(persistedState.batchElapsedMs);
      setGlobalError(persistedState.globalError);
      setStep("preview");
      setRestoredMessage(
        persistedState.hadInterruptedDraft
          ? t("dashboard.slipUpload.restoreInterrupted")
          : t("dashboard.slipUpload.restoreRecovered")
      );
    } catch {
      window.localStorage.removeItem(SLIP_UPLOAD_STORAGE_KEY);
    }
  }, [t]);

  useEffect(() => {
    if (!open) {
      setResponseDraftId(null);
      setPreviewDraftId(null);
      setEditingDraftIds([]);
      return;
    }

    let cancelled = false;
    const id = setTimeout(() => {
      setStep((current) => (drafts.length > 0 || current === "preview" ? "preview" : "select"));
      setAccountsLoading(true);
      Promise.all([
        fetch("/api/financial-accounts").then((r) => (r.ok ? r.json() : [])),
        fetch("/api/categories").then((r) => (r.ok ? r.json() : [])),
      ])
        .then(([accData, catData]) => {
          if (cancelled) return;
          const accs = Array.isArray(accData)
            ? accData.filter(
                (a: { isActive?: boolean; isIncomplete?: boolean; isHidden?: boolean }) =>
                  a.isActive !== false && !a.isIncomplete && a.isHidden !== true
              )
            : [];
          setAccounts(
            accs.map(
              (a: {
                id: string;
                name: string;
                isDefault?: boolean;
                type?: string;
                bankName?: string | null;
                cardNetwork?: string | null;
              }) => ({
                id: a.id,
                name: a.name,
                isDefault: a.isDefault ?? false,
                type: a.type ?? "CASH",
                bankName: a.bankName ?? null,
                cardNetwork: a.cardNetwork ?? null,
              })
            )
          );
          setCategories(
            Array.isArray(catData)
              ? catData.map((c: { id: string; name: string }) => ({ id: c.id, name: c.name }))
              : []
          );
        })
        .finally(() => {
          if (!cancelled) setAccountsLoading(false);
        });
    }, 0);
    return () => {
      cancelled = true;
      clearTimeout(id);
    };
  }, [drafts.length, open]);

  useEffect(() => {
    const requestControllers = requestControllersRef.current;
    return () => {
      processingSessionRef.current += 1;
      requestControllers.forEach((controller) => controller.abort());
      requestControllers.clear();
    };
  }, []);

  useEffect(() => {
    if (!hydratedStorageRef.current) return;

    if (drafts.length === 0) {
      window.localStorage.removeItem(SLIP_UPLOAD_STORAGE_KEY);
      return;
    }

    const persistedState: PersistedSlipUploadState = {
      drafts: drafts.map(serializeSlipDraft),
      batchElapsedMs,
      globalError,
    };

    window.localStorage.setItem(SLIP_UPLOAD_STORAGE_KEY, JSON.stringify(persistedState));
  }, [batchElapsedMs, drafts, globalError]);

  useEffect(() => {
    if (drafts.length > 0) return;
    setGlobalError(null);
    setRestoredMessage(null);
    setBatchElapsedMs(null);
  }, [drafts.length]);

  const defaultAccountId = accounts.find((a) => a.isDefault)?.id ?? accounts[0]?.id ?? "";

  function updateDraft(id: string, updates: Partial<SlipDraft>) {
    setDrafts((prev) =>
      prev.map((draft) => (draft.id === id ? { ...draft, ...updates } : draft))
    );
  }

  function removeDraft(id: string) {
    const controller = requestControllersRef.current.get(id);
    controller?.abort();
    requestControllersRef.current.delete(id);
    setDrafts((prev) => prev.filter((draft) => draft.id !== id));
    setResponseDraftId((current) => (current === id ? null : current));
    setPreviewDraftId((current) => (current === id ? null : current));
    setEditingDraftIds((prev) => prev.filter((draftId) => draftId !== id));
  }

  function toggleDraftEditor(id: string) {
    setEditingDraftIds((prev) =>
      prev.includes(id) ? prev.filter((draftId) => draftId !== id) : [...prev, id]
    );
  }

  function closeDraftEditor(id: string) {
    setEditingDraftIds((prev) => prev.filter((draftId) => draftId !== id));
  }

  function clearAllDrafts() {
    resetSlipUpload({ preserveStep: true });
    setStep("preview");
  }

  function getResponseMessage(body: unknown): string | null {
    if (!body || typeof body !== "object") return null;

    const maybeError = "error" in body ? body.error : undefined;
    if (typeof maybeError === "string" && maybeError.trim()) {
      return maybeError;
    }

    const maybeMessage = "message" in body ? body.message : undefined;
    if (typeof maybeMessage === "string" && maybeMessage.trim()) {
      return maybeMessage;
    }

    return null;
  }

  function setDraftStage(
    draftId: string,
    updates: Partial<
      Pick<
        SlipDraft,
        "processingStage" | "compressionStatus" | "uploadStatus" | "ocrStatus" | "parseStatus"
      >
    >
  ) {
    updateDraft(draftId, updates);
  }

  async function sendParseRequest(
    draftId: string,
    formData: FormData,
    controller: AbortController,
    sessionId: number
  ): Promise<ParseSlipApiResult> {
    return new Promise<ParseSlipApiResult>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      let uploadStartedAtMs: number | null = null;

      const handleAbort = () => {
        xhr.abort();
      };

      controller.signal.addEventListener("abort", handleAbort, { once: true });

      const cleanup = () => {
        controller.signal.removeEventListener("abort", handleAbort);
      };

      xhr.open("POST", "/api/ocr/parse-slips");
      xhr.responseType = "text";

      xhr.upload.onloadstart = () => {
        if (sessionId !== processingSessionRef.current) return;
        uploadStartedAtMs = Date.now();
        updateDraft(draftId, {
          processingStage: "uploading",
          uploadStatus: "active",
          uploadStartedAtMs,
        });
      };

      xhr.upload.onprogress = (event) => {
        if (sessionId !== processingSessionRef.current) return;
        const elapsedSec =
          uploadStartedAtMs !== null ? (Date.now() - uploadStartedAtMs) / 1000 : 0;
        const percent = event.lengthComputable
          ? Math.round((event.loaded / event.total) * 100)
          : null;
        updateDraft(draftId, {
          uploadedBytes: event.loaded,
          uploadPercent: percent,
          uploadSpeedBytesPerSec: elapsedSec > 0.05 ? event.loaded / elapsedSec : null,
        });
        if (percent === 100) {
          setDraftStage(draftId, {
            processingStage: "processing",
            uploadStatus: "done",
            ocrStatus: "active",
          });
        }
      };

      xhr.upload.onload = () => {
        if (sessionId !== processingSessionRef.current) return;
        setDraftStage(draftId, {
          processingStage: "processing",
          uploadStatus: "done",
          ocrStatus: "active",
        });
      };

      xhr.onload = () => {
        cleanup();

        let data: SlipParseResponseBody | { error: string };
        try {
          data = xhr.responseText
            ? (JSON.parse(xhr.responseText) as SlipParseResponseBody | { error: string })
            : { error: "Invalid response body" };
        } catch {
          data = { error: "Invalid response body" };
        }

        resolve({
          status: xhr.status,
          ok: xhr.status >= 200 && xhr.status < 300,
          data,
        });
      };

      xhr.onerror = () => {
        cleanup();
        reject(new Error("Network request failed"));
      };

      xhr.onabort = () => {
        cleanup();
        reject(new DOMException("The operation was aborted.", "AbortError"));
      };

      xhr.send(formData);
    });
  }

  async function processSingleSlip(draftId: string, file: File, sessionId: number) {
    const controller = new AbortController();
    requestControllersRef.current.set(draftId, controller);
    let optimizedFile = file;
    const slipStart = Date.now();

    try {
      setDraftStage(draftId, {
        parseStatus: "loading",
        processingStage: "compressing",
        compressionStatus: "active",
        uploadStatus: "pending",
        ocrStatus: "pending",
      });
      updateDraft(draftId, { slipStartedAtMs: slipStart });

      optimizedFile = await compressImage(file);
      if (controller.signal.aborted || sessionId !== processingSessionRef.current) {
        return;
      }

      updateDraft(draftId, {
        processingStage: "uploading",
        compressionStatus: optimizedFile === file ? "skipped" : "done",
        uploadStatus: "active",
        uploadFileSizeBytes: optimizedFile.size,
      });

      const formData = new FormData();
      formData.append("file", optimizedFile);

      const { status, ok, data } = await sendParseRequest(draftId, formData, controller, sessionId);
      if (sessionId !== processingSessionRef.current) return;

      const responseDetail: SlipResponseDetail = {
        status,
        ok,
        body: data,
      };

      if (!ok) {
        const message =
          status === 503
            ? t("dashboard.slipUpload.errorNotConfigured")
            : status === 429
              ? t("dashboard.slipUpload.errorRateLimit")
              : getResponseMessage(data) ?? t("dashboard.slipUpload.errorGeneric");

        if (status === 503 || status === 429) {
          setGlobalError(message);
        }

        updateDraft(draftId, {
          parseStatus: "error",
          processingStage: "error",
          compressionStatus: optimizedFile === file ? "skipped" : "done",
          uploadStatus: "done",
          ocrStatus: "error",
          error: message,
          ocrResponse: responseDetail,
          slipElapsedMs: Date.now() - slipStart,
        });
        return;
      }

      const item = "items" in data ? data.items?.[0] : undefined;
      if (!item) {
        updateDraft(draftId, {
          parseStatus: "error",
          processingStage: "error",
          compressionStatus: optimizedFile === file ? "skipped" : "done",
          uploadStatus: "done",
          ocrStatus: "error",
          error: t("dashboard.slipUpload.errorGeneric"),
          ocrResponse: responseDetail,
          slipElapsedMs: Date.now() - slipStart,
        });
        return;
      }

      const occurredAt = item.parsed?.occurredAt
        ? formatDateToInput(item.parsed.occurredAt)
        : formatTodayAsInputDate();

      updateDraft(draftId, {
        amount: item.parsed ? String(item.parsed.amount) : "",
        occurredAt,
        note: item.parsed?.note ?? "",
        rawText: item.rawText,
        error: item.error,
        rawFileName: item.rawFileName,
        parseStatus: item.error ? "error" : "success",
        processingStage: item.error ? "error" : "success",
        compressionStatus: optimizedFile === file ? "skipped" : "done",
        uploadStatus: "done",
        ocrStatus: "done",
        ocrResponse: responseDetail,
        slipElapsedMs: Date.now() - slipStart,
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }

      if (sessionId !== processingSessionRef.current) return;

      updateDraft(draftId, {
        parseStatus: "error",
        processingStage: "error",
        compressionStatus: optimizedFile === file ? "skipped" : "done",
        uploadStatus: "error",
        ocrStatus: "error",
        error: t("dashboard.slipUpload.errorGeneric"),
        ocrResponse: {
          status: null,
          ok: false,
          body: { error: error instanceof Error ? error.message : t("dashboard.slipUpload.errorGeneric") },
        },
        slipElapsedMs: Date.now() - slipStart,
      });
    } finally {
      requestControllersRef.current.delete(draftId);
    }
  }

  async function processSlipsQueue(items: Array<{ draftId: string; file: File }>, sessionId: number) {
    const batchStart = Date.now();
    let nextIndex = 0;

    async function worker() {
      while (nextIndex < items.length) {
        const currentIndex = nextIndex;
        nextIndex += 1;
        const currentItem = items[currentIndex];
        if (!currentItem) {
          return;
        }
        await processSingleSlip(currentItem.draftId, currentItem.file, sessionId);
      }
    }

    const workerCount = Math.min(5, items.length);
    await Promise.all(Array.from({ length: workerCount }, () => worker()));

    if (sessionId === processingSessionRef.current) {
      setBatchElapsedMs(Date.now() - batchStart);
    }
  }

  async function submitSingleDraft(draft: SlipDraft): Promise<boolean> {
    updateDraft(draft.id, {
      submitStatus: "submitting",
      transactionResponse: undefined,
    });

    const amount = Number.parseFloat(draft.amount.replace(/,/g, ""));
    const body = {
      type: draft.type,
      amount,
      financialAccountId: draft.financialAccountId,
      categoryId: draft.categoryId || undefined,
      note: draft.note.trim() || undefined,
      occurredAt: combineDateWithCurrentTime(draft.occurredAt),
    };

    try {
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      let responseBody: unknown;
      try {
        responseBody = await res.json();
      } catch {
        responseBody = { error: "Invalid response body" };
      }

      const responseDetail: SlipResponseDetail = {
        status: res.status,
        ok: res.ok,
        body: responseBody,
      };

      if (!res.ok) {
        updateDraft(draft.id, {
          submitStatus: "error",
          transactionResponse: responseDetail,
        });
        return false;
      }

      updateDraft(draft.id, {
        submitStatus: "success",
        transactionResponse: responseDetail,
      });
      return true;
    } catch (error) {
      updateDraft(draft.id, {
        submitStatus: "error",
        transactionResponse: {
          status: null,
          ok: false,
          body: { error: error instanceof Error ? error.message : t("dashboard.slipUpload.errorGeneric") },
        },
      });
      return false;
    }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileList = Array.from(files);
    if (drafts.length + fileList.length > MAX_FILES_PER_REQUEST) {
      setGlobalError(
        t("dashboard.slipUpload.errorGeneric"),
      );
      setFileInputKey((k) => k + 1);
      return;
    }
    const tooLarge = fileList.filter((f) => f.size > MAX_FILE_SIZE_BYTES);
    if (tooLarge.length > 0) {
      setGlobalError(t("dashboard.slipUpload.errorFileTooLarge"));
      setFileInputKey((k) => k + 1);
      return;
    }

    setGlobalError(null);
    setRestoredMessage(null);
    setBatchElapsedMs(null);
    setStep("preview");

    const sessionId = processingSessionRef.current;
    const newDrafts: SlipDraft[] = fileList.map((file, index) => ({
      id: `${Date.now()}-${drafts.length + index}-${file.name}`,
      file,
      amount: "",
      occurredAt: formatTodayAsInputDate(),
      note: "",
      type: "EXPENSE",
      financialAccountId: defaultAccountId,
      categoryId: "",
      rawFileName: file.name,
      parseStatus: "loading",
      processingStage: "queued",
      compressionStatus: "pending",
      uploadStatus: "pending",
      ocrStatus: "pending",
      submitStatus: "idle",
      originalFileSizeBytes: file.size,
      uploadFileSizeBytes: null,
      uploadedBytes: 0,
      uploadPercent: null,
      uploadSpeedBytesPerSec: null,
      uploadStartedAtMs: null,
      slipStartedAtMs: null,
      slipElapsedMs: null,
    }));

    setDrafts((prev) => [...prev, ...newDrafts]);
    setFileInputKey((k) => k + 1);
    void processSlipsQueue(
      newDrafts.map((draft, index) => ({
        draftId: draft.id,
        file: fileList[index] ?? new File([], draft.rawFileName),
      })),
      sessionId,
    );
  }

  async function handleConfirm() {
    const validDrafts = drafts.filter((d) => {
      const val = Number.parseFloat(d.amount.replace(/,/g, ""));
      return (
        Number.isFinite(val) &&
        val > 0 &&
        d.financialAccountId &&
        d.parseStatus !== "loading" &&
        d.submitStatus !== "success"
      );
    });
    if (validDrafts.length === 0) return;

    setGlobalError(null);

    const results = await Promise.all(validDrafts.map((draft) => submitSingleDraft(draft)));
    const successCount = results.filter(Boolean).length;

    if (successCount === 0) {
      setGlobalError(t("dashboard.slipUpload.errorGeneric"));
      return;
    }

    if (successCount < results.length) {
      setGlobalError(t("dashboard.slipUpload.partialSuccess"));
      // Still record partial success as a notification
      void fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "EVENT_SLIP_DONE",
          payload: { createdCount: successCount, totalCount: results.length, hasErrors: true },
          link: "/dashboard/transactions",
        }),
      });
      return;
    }

    void fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "EVENT_SLIP_DONE",
        payload: { createdCount: successCount, totalCount: results.length, hasErrors: false },
        link: "/dashboard/transactions",
      }),
    });

    resetSlipUpload();
    onOpenChange(false);
    onSuccess?.();
  }

  const validDraftCount = drafts.filter((d) => {
    const val = Number.parseFloat(d.amount.replace(/,/g, ""));
    return (
      Number.isFinite(val) &&
      val > 0 &&
      d.financialAccountId &&
      d.parseStatus !== "loading" &&
      d.submitStatus !== "success"
    );
  }).length;
  const processingDraftCount = drafts.filter((draft) => draft.parseStatus === "loading").length;
  const submittingDraftCount = drafts.filter((draft) => draft.submitStatus === "submitting").length;
  const completedDraftCount = drafts.length - processingDraftCount;
  const parseSuccessCount = drafts.filter((draft) => draft.parseStatus === "success").length;
  const parseErrorCount = drafts.filter((draft) => draft.parseStatus === "error").length;
  const hasPendingProcessing = processingDraftCount > 0;
  const hasPendingSubmission = submittingDraftCount > 0;
  const selectedDraft = responseDraftId
    ? drafts.find((draft) => draft.id === responseDraftId) ?? null
    : null;
  const previewDraft = previewDraftId
    ? drafts.find((draft) => draft.id === previewDraftId) ?? null
    : null;

  useEffect(() => {
    if (!previewDraft?.file) {
      setPreviewImageUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(previewDraft.file);
    setPreviewImageUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [previewDraft?.file]);

  function getStepSummaryLine(draft: SlipDraft): string {
    if (draft.submitStatus === "submitting") {
      return t("dashboard.slipUpload.statusCreating");
    }
    if (draft.submitStatus === "success") {
      return t("dashboard.slipUpload.statusCreated");
    }
    if (draft.submitStatus === "error") {
      return t("dashboard.slipUpload.statusCreateFailed");
    }

    switch (draft.processingStage) {
      case "queued":
        return t("dashboard.slipUpload.statusQueued");
      case "compressing":
        return `${t("dashboard.slipUpload.stepResize")}…`;
      case "uploading": {
        const parts: string[] = [t("dashboard.slipUpload.stepUpload")];
        if (draft.uploadPercent !== null) {
          parts.push(`${draft.uploadPercent}%`);
          parts.push(
            `${formatBytes(draft.uploadedBytes)}${draft.uploadFileSizeBytes !== null ? ` / ${formatBytes(draft.uploadFileSizeBytes)}` : ""}`
          );
          if (draft.uploadSpeedBytesPerSec !== null) {
            parts.push(formatUploadSpeed(draft.uploadSpeedBytesPerSec));
          }
        }
        return parts.join(" · ");
      }
      case "processing":
        return "OCR Processing…";
      case "success": {
        const parts: string[] = [t("dashboard.slipUpload.processDone")];
        if (draft.compressionStatus === "done" && draft.uploadFileSizeBytes !== null) {
          parts.push(
            `${formatBytes(draft.originalFileSizeBytes)} → ${formatBytes(draft.uploadFileSizeBytes)}`
          );
        }
        return parts.join(" · ");
      }
      case "error":
        return t("dashboard.slipUpload.stepFailed");
      default:
        return "";
    }
  }

  function formatAmountForDisplay(value: string): string {
    const amount = Number.parseFloat(value.replace(/,/g, ""));
    if (!Number.isFinite(amount)) {
      return "—";
    }

    return new Intl.NumberFormat(localeKey === "th" ? "th-TH" : "en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  }

  function formatDraftDateForDisplay(value: string): string {
    const [year, month, day] = value.split("-").map(Number);
    if (![year, month, day].every(isValidDatePart)) {
      return value;
    }

    const date = new Date(year, month - 1, day);
    const monthLabel = new Intl.DateTimeFormat(localeKey === "th" ? "th-TH" : "en-US", {
      month: "short",
    }).format(date);

    return `${day} ${monthLabel} ${formatYearForDisplay(year, language)}`;
  }

  function getDraftTypeLabel(type: SlipDraft["type"]): string {
    return type === "INCOME" ? t("transactions.new.income") : t("transactions.new.expense");
  }


  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className={cn(
            "max-h-[90vh] flex flex-col overflow-hidden sm:max-w-md",
            "max-md:inset-0 max-md:translate-none max-md:h-dvh max-md:max-h-none max-md:w-full max-md:max-w-none max-md:rounded-none"
          )}
          style={
            isMobile && viewport
              ? {
                  height: viewport.height,
                  top: viewport.offsetTop,
                  left: 0,
                  width: "100%",
                  maxWidth: "100%",
                }
              : undefined
          }
        >
          <DialogHeader className="shrink-0">
            <DialogTitle>{t("dashboard.slipUpload.title")}</DialogTitle>
          </DialogHeader>

          <div className="flex flex-1 flex-col min-h-0 overflow-hidden">
            <DialogBody className="space-y-4">
              <input
                key={fileInputKey}
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleFileChange}
              />

              {step === "select" && (
                <>
                  <div className="rounded-lg border border-dashed p-4 text-center space-y-3">
                    <p className="text-sm text-muted-foreground">
                      {t("dashboard.slipUpload.emptyState")}
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={accountsLoading}
                    >
                      <ImagePlus className="mr-2 h-4 w-4" />
                      {t("dashboard.slipUpload.chooseImages")}
                    </Button>
                  </div>
                  {globalError && (
                    <p className="text-sm text-red-600 dark:text-red-400">{globalError}</p>
                  )}
                </>
              )}

              {step === "preview" && (
                <>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">
                      {t("dashboard.slipUpload.previewTitle")}
                    </p>
                    <div className="flex justify-between items-center">
                      <p className="text-xs text-muted-foreground">
                        {t("dashboard.slipUpload.progressSummary", {
                          completed: completedDraftCount,
                          total: drafts.length,
                        })}
                        {!hasPendingProcessing && batchElapsedMs !== null && (
                          <span className="ml-1 text-muted-foreground/60">
                            · {formatDuration(batchElapsedMs)}
                          </span>
                        )}
                      </p>
                      {!hasPendingProcessing && completedDraftCount > 0 && (
                        <p className="text-xs">
                          {parseSuccessCount > 0 && (
                            <span className="text-emerald-600 dark:text-emerald-400">
                              ✓ {parseSuccessCount}
                            </span>
                          )}
                          {parseSuccessCount > 0 && parseErrorCount > 0 && (
                            <span className="mx-1.5 text-muted-foreground/40">·</span>
                          )}
                          {parseErrorCount > 0 && (
                            <span className="text-amber-600 dark:text-amber-400">
                              ✕ {parseErrorCount}
                            </span>
                          )}
                        </p>
                      )}
                    </div>
                  </div>
                  {restoredMessage && (
                    <p className="text-xs text-muted-foreground">{restoredMessage}</p>
                  )}
                  {globalError && (
                    <p className="text-sm text-red-600 dark:text-red-400">{globalError}</p>
                  )}
                  {drafts.length > 0 && (
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={accountsLoading || drafts.length >= MAX_FILES_PER_REQUEST}
                      >
                        <ImagePlus className="mr-2 h-4 w-4" />
                        {t("dashboard.slipUpload.uploadMore")}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={clearAllDrafts}
                        disabled={hasPendingSubmission}
                      >
                        {t("dashboard.slipUpload.clearAll")}
                      </Button>
                    </div>
                  )}
                  {drafts.length === 0 && (
                    <div className="rounded-lg border border-dashed p-4 text-center space-y-3">
                      <p className="text-sm text-muted-foreground">
                        {t("dashboard.slipUpload.emptyState")}
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={accountsLoading}
                      >
                        <ImagePlus className="mr-2 h-4 w-4" />
                        {t("dashboard.slipUpload.chooseImages")}
                      </Button>
                    </div>
                  )}
                  <div className="space-y-4">
                    {drafts.map((draft, idx) => {
                      const isDraftLoading = draft.parseStatus === "loading";
                      const isDraftSubmitting = draft.submitStatus === "submitting";
                      const isDraftCreated = draft.submitStatus === "success";
                      const isDraftDisabled = isDraftLoading || isDraftSubmitting || isDraftCreated;
                      const isDraftEditing = editingDraftIds.includes(draft.id);
                      const statusLabel = getStepSummaryLine(draft);
                      const hasResponse = Boolean(draft.ocrResponse || draft.transactionResponse);

                      return (
                        <div
                          key={draft.id}
                          className={cn(
                            "rounded-lg border p-4 space-y-1",
                            draft.submitStatus === "success" && "border-emerald-500/40 bg-emerald-50/60 dark:bg-emerald-950/20",
                            draft.submitStatus === "error" && "border-red-500/40 bg-red-50/60 dark:bg-red-950/20",
                            draft.submitStatus !== "error" &&
                              draft.parseStatus === "error" &&
                              "border-amber-500/50 bg-amber-50/50 dark:bg-amber-950/20"
                          )}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 space-y-1">
                              <div className="flex items-center gap-2">
                                {isDraftSubmitting || isDraftLoading ? (
                                  <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
                                ) : isDraftCreated || draft.parseStatus === "success" ? (
                                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                                ) : (
                                  <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
                                )}
                                <span className="truncate text-sm font-medium">
                                  {draft.rawFileName}
                                </span>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {statusLabel}
                                {draft.slipElapsedMs !== null && (
                                  <span className="ml-1 text-muted-foreground/60">
                                    · {formatDuration(draft.slipElapsedMs)}
                                  </span>
                                )}
                              </p>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setPreviewDraftId(draft.id)}
                                disabled={!draft.file}
                              >
                                {t("dashboard.slipUpload.previewImage")}
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => setResponseDraftId(draft.id)}
                                disabled={!hasResponse}
                                aria-label={t("dashboard.slipUpload.viewResponse")}
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="text-red-600 hover:text-red-700"
                                onClick={() => removeDraft(draft.id)}
                                disabled={isDraftSubmitting}
                              >
                                {t("common.actions.delete")}
                              </Button>
                            </div>
                          </div>

                          {draft.error && (
                            <p className="text-xs text-amber-600 dark:text-amber-400">
                              {t("dashboard.slipUpload.parseWarning")}
                            </p>
                          )}


                          <div className="space-y-1">
                            {draft.parseStatus !== "loading" && (
                              <div className="flex flex-warp justify-between gap-3 rounded-md bg-muted/20 p-3">
                                <div className="space-y-1">
                                  <p className="text-xs text-muted-foreground">
                                    {t("transactions.new.amountLabel")}
                                  </p>
                                  <p className="text-sm font-medium">
                                    {formatAmountForDisplay(draft.amount)}
                                  </p>
                                </div>
                                <div className="space-y-1">
                                  <p className="text-xs text-muted-foreground">
                                    {t("transactions.new.typeLabel")}
                                  </p>
                                  <p className="text-sm font-medium">{getDraftTypeLabel(draft.type)}</p>
                                </div>
                                <div className="space-y-1">
                                  <p className="text-xs text-muted-foreground">
                                    {t("transactions.new.dateLabel")}
                                  </p>
                                  <p className="text-sm font-medium">
                                    {formatDraftDateForDisplay(draft.occurredAt)}
                                  </p>
                                </div>
                              </div>
                            )}

                            {draft.parseStatus !== "loading" && (
                              <>
                                <div
                                  className={cn(
                                    "transition-opacity",
                                    isDraftDisabled && "pointer-events-none opacity-50"
                                  )}
                                >
                                  {!isDraftEditing && (
                                    <div
                                      className="w-full font-bold text-sm flex justify-between items-center cursor-pointer p-2 bg-muted/90 rounded-md"
                                      onClick={() => toggleDraftEditor(draft.id)}
                                    >
                                      {t("dashboard.slipUpload.editDetails")}
                                      <ChevronDown className="h-4 w-4" />
                                    </div>
                                  )}
                                </div>

                                <div
                                  className={cn(
                                    "grid overflow-hidden transition-all duration-300 ease-out",
                                    isDraftEditing ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                                  )}
                                >
                                  <div className="min-h-0 overflow-hidden">
                                    <div
                                      className={cn(
                                        "space-y-3 rounded-md border border-dashed bg-muted/20 p-3",
                                        isDraftDisabled && "pointer-events-none opacity-50"
                                      )}
                                    >
                                      <div>
                                        <label className="mb-1 block text-sm font-medium">
                                          {t("transactions.new.amountLabel")}
                                        </label>
                                        <input
                                          type="text"
                                          inputMode="decimal"
                                          value={draft.amount}
                                          onChange={(e) =>
                                            updateDraft(draft.id, {
                                              amount: sanitizeAmountInput(e.target.value),
                                            })
                                          }
                                          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                        />
                                      </div>
                                      <div className="flex gap-2">
                                        <button
                                          type="button"
                                          onClick={() => updateDraft(draft.id, { type: "INCOME" })}
                                          className={cn(
                                            "inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-sm transition-all",
                                            draft.type === "INCOME"
                                              ? "bg-emerald-500 text-white"
                                              : "border bg-muted/50 hover:bg-muted"
                                          )}
                                        >
                                          <ArrowDownCircle className="h-4 w-4" />
                                          {t("transactions.new.income")}
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => updateDraft(draft.id, { type: "EXPENSE" })}
                                          className={cn(
                                            "inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-sm transition-all",
                                            draft.type === "EXPENSE"
                                              ? "bg-red-500 text-white"
                                              : "border bg-muted/50 hover:bg-muted"
                                          )}
                                        >
                                          <ArrowUpCircle className="h-4 w-4" />
                                          {t("transactions.new.expense")}
                                        </button>
                                      </div>
                                      <div>
                                        <label className="mb-1 block text-sm font-medium">
                                          {t("transactions.new.accountLabel")}
                                        </label>
                                        <AccountCombobox
                                          value={draft.financialAccountId}
                                          onChange={(id) =>
                                            updateDraft(draft.id, { financialAccountId: id })
                                          }
                                          accounts={accounts}
                                          filterByType={(type) => type !== "CREDIT_CARD"}
                                          defaultLabel={t("accounts.default")}
                                          className="w-full rounded-md border border-input px-3 py-2 text-sm"
                                        />
                                      </div>
                                      <div>
                                        <DatePicker
                                          id={`slip-draft-date-${idx}`}
                                          label={t("transactions.new.dateLabel")}
                                          value={draft.occurredAt}
                                          onChange={(value) =>
                                            updateDraft(draft.id, { occurredAt: value })
                                          }
                                          variant="inline"
                                          placeholder={t("transactions.new.dateSelectPlaceholder")}
                                        />
                                      </div>
                                      <div>
                                        <label className="mb-1 block text-sm font-medium">
                                          {t("transactions.new.categoryLabel")}
                                        </label>
                                        <select
                                          value={draft.categoryId}
                                          onChange={(e) =>
                                            updateDraft(draft.id, { categoryId: e.target.value })
                                          }
                                          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                        >
                                          <option value="">—</option>
                                          {categories.map((category) => (
                                            <option key={category.id} value={category.id}>
                                              {getCategoryDisplayName(category.name, localeKey)}
                                            </option>
                                          ))}
                                        </select>
                                      </div>
                                      <div>
                                        <label className="mb-1 block text-sm font-medium">
                                          {t("transactions.new.noteLabel")}
                                        </label>
                                        <textarea
                                          value={draft.note}
                                          onChange={(e) => updateDraft(draft.id, { note: e.target.value })}
                                          rows={2}
                                          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none"
                                        />
                                      </div>
                                      <div className="flex justify-end">
                                        <Button
                                          type="button"
                                          size="sm"
                                          onClick={() => closeDraftEditor(draft.id)}
                                          disabled={isDraftDisabled}
                                        >
                                          {t("dashboard.slipUpload.confirmEdit")}
                                        </Button>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </DialogBody>

            <DialogFooter className="shrink-0 gap-2">
              {step === "select" && (
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  {t("common.actions.cancel")}
                </Button>
              )}
              {step === "preview" && (
                <>
                  <Button variant="outline" onClick={() => onOpenChange(false)}>
                    {t("common.actions.cancel")}
                  </Button>
                  <Button
                    onClick={handleConfirm}
                    className="bg-emerald-500 hover:bg-emerald-600"
                    disabled={validDraftCount === 0 || hasPendingProcessing || hasPendingSubmission}
                  >
                    {hasPendingSubmission
                      ? t("dashboard.slipUpload.creating")
                      : hasPendingProcessing
                        ? t("dashboard.slipUpload.processingAction", {
                            count: processingDraftCount,
                          })
                        : t("dashboard.slipUpload.confirmAll")}
                  </Button>
                </>
              )}
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(previewDraftId)}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setPreviewDraftId(null);
          }
        }}
      >
        <DialogContent className="max-h-[90vh] flex flex-col overflow-hidden sm:max-w-3xl">
          <DialogHeader className="shrink-0">
            <DialogTitle>{t("dashboard.slipUpload.previewImageTitle")}</DialogTitle>
            <DialogDescription>
              {previewDraft?.rawFileName ?? t("dashboard.slipUpload.previewUnavailable")}
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            {previewImageUrl ? (
              <div className="relative mx-auto h-[55dvh] w-full overflow-hidden rounded-md bg-muted/30 sm:h-128">
                <NextImage
                  src={previewImageUrl}
                  alt={previewDraft?.rawFileName ?? t("dashboard.slipUpload.previewImageTitle")}
                  fill
                  unoptimized
                  className="object-contain"
                  sizes="100vw"
                />
              </div>
            ) : (
              <div className="flex min-h-48 items-center justify-center rounded-md border border-dashed px-4 text-sm text-muted-foreground">
                {t("dashboard.slipUpload.previewUnavailable")}
              </div>
            )}
          </DialogBody>
          
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(selectedDraft)}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setResponseDraftId(null);
          }
        }}
      >
        <DialogContent className="max-h-[85vh] flex flex-col overflow-hidden sm:max-w-lg">
          <DialogHeader className="shrink-0">
            <DialogTitle>{t("dashboard.slipUpload.responseTitle")}</DialogTitle>
            <DialogDescription>
              {selectedDraft?.rawFileName ?? t("dashboard.slipUpload.responseEmpty")}
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="space-y-4">
            {selectedDraft?.ocrResponse && (
              <div className="space-y-2">
                <div>
                  <p className="text-sm font-medium">{t("dashboard.slipUpload.responseOcrTitle")}</p>
                  <p className="text-xs text-muted-foreground">
                    {selectedDraft.ocrResponse.status == null
                      ? t("dashboard.slipUpload.responseNetworkError")
                      : t("dashboard.slipUpload.responseStatus", {
                          status: selectedDraft.ocrResponse.status,
                        })}
                  </p>
                  {getResponseMessage(selectedDraft.ocrResponse.body) && (
                    <p className="text-xs text-muted-foreground">
                      {getResponseMessage(selectedDraft.ocrResponse.body)}
                    </p>
                  )}
                </div>
                <pre className="max-h-56 overflow-auto rounded-md bg-muted p-3 text-xs">
                  {JSON.stringify(selectedDraft.ocrResponse.body, null, 2)}
                </pre>
              </div>
            )}

            {selectedDraft?.transactionResponse && (
              <div className="space-y-2">
                <div>
                  <p className="text-sm font-medium">
                    {t("dashboard.slipUpload.responseTransactionTitle")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {selectedDraft.transactionResponse.status == null
                      ? t("dashboard.slipUpload.responseNetworkError")
                      : t("dashboard.slipUpload.responseStatus", {
                          status: selectedDraft.transactionResponse.status,
                        })}
                  </p>
                  {getResponseMessage(selectedDraft.transactionResponse.body) && (
                    <p className="text-xs text-muted-foreground">
                      {getResponseMessage(selectedDraft.transactionResponse.body)}
                    </p>
                  )}
                </div>
                <pre className="max-h-56 overflow-auto rounded-md bg-muted p-3 text-xs">
                  {JSON.stringify(selectedDraft.transactionResponse.body, null, 2)}
                </pre>
              </div>
            )}

            {!selectedDraft?.ocrResponse && !selectedDraft?.transactionResponse && (
              <p className="text-sm text-muted-foreground">
                {t("dashboard.slipUpload.responseEmpty")}
              </p>
            )}
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResponseDraftId(null)}>
              {t("common.actions.close")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
