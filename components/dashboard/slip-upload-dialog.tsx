"use client";

import { useState, useEffect, useRef } from "react";
import { ArrowDownCircle, ArrowUpCircle, Loader2, ImagePlus } from "lucide-react";
import {
  Dialog,
  DialogContent,
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
import { cn } from "@/lib/utils";
import { useI18n } from "@/hooks/use-i18n";
import { useIsMobile } from "@/hooks/use-mobile";
import { useVisualViewport } from "@/hooks/use-visual-viewport";

const MAX_FILE_SIZE_BYTES = 1 * 1024 * 1024; // 1 MB
const MAX_FILES_PER_REQUEST = 10;

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

type SlipDraft = {
  id: number;
  amount: string;
  occurredAt: string;
  note: string;
  type: "INCOME" | "EXPENSE";
  financialAccountId: string;
  categoryId: string;
  rawText?: string;
  error?: string;
  rawFileName: string;
};

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

  const [step, setStep] = useState<"select" | "processing" | "preview" | "submitting">("select");
  const [drafts, setDrafts] = useState<SlipDraft[]>([]);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [fileInputKey, setFileInputKey] = useState(0);

  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const processingControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const id = setTimeout(() => {
      setStep("select");
      setDrafts([]);
      setGlobalError(null);
      setFileInputKey((k) => k + 1);
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
  }, [open]);

  const defaultAccountId = accounts.find((a) => a.isDefault)?.id ?? accounts[0]?.id ?? "";

  function updateDraft(index: number, updates: Partial<SlipDraft>) {
    setDrafts((prev) =>
      prev.map((d, i) => (i === index ? { ...d, ...updates } : d))
    );
  }

  function removeDraft(index: number) {
    setDrafts((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileList = Array.from(files);
    if (fileList.length > MAX_FILES_PER_REQUEST) {
      setGlobalError(
        t("dashboard.slipUpload.errorGeneric"),
      );
      return;
    }
    const tooLarge = fileList.filter((f) => f.size > MAX_FILE_SIZE_BYTES);
    if (tooLarge.length > 0) {
      setGlobalError(t("dashboard.slipUpload.errorFileTooLarge"));
      return;
    }

    setGlobalError(null);
    if (processingControllerRef.current) {
      processingControllerRef.current.abort();
    }
    const controller = new AbortController();
    processingControllerRef.current = controller;
    setStep("processing");

    const formData = new FormData();
    fileList.forEach((file) => formData.append("file", file));

    try {
      const res = await fetch("/api/ocr/parse-slips", {
        method: "POST",
        body: formData,
        signal: controller.signal,
      });

      const data = (await res.json()) as {
        items?: Array<{
          index: number;
          rawFileName: string;
          rawText?: string;
          parsed?: { amount: number; occurredAt: string | null; note: string | null };
          error?: string;
        }>;
        error?: string;
      };

      if (!res.ok) {
        const msg =
          res.status === 503
            ? t("dashboard.slipUpload.errorNotConfigured")
            : res.status === 429
              ? t("dashboard.slipUpload.errorRateLimit")
              : data.error ?? t("dashboard.slipUpload.errorGeneric");
        setGlobalError(msg);
        setStep("select");
        return;
      }

      const items = data.items ?? [];
      const newDrafts: SlipDraft[] = items.map((item) => {
        const parsed = item.parsed;
        const occurredAt = parsed?.occurredAt
          ? formatDateToInput(parsed.occurredAt)
          : formatTodayAsInputDate();
        return {
          id: item.index,
          amount: parsed ? String(parsed.amount) : "",
          occurredAt,
          note: parsed?.note ?? "",
          type: "EXPENSE",
          financialAccountId: defaultAccountId,
          categoryId: "",
          rawText: item.rawText,
          error: item.error,
          rawFileName: item.rawFileName,
        };
      });

      setDrafts(newDrafts);
      setStep("preview");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        // Request was cancelled; just reset to select state.
        setStep("select");
        return;
      }
      setGlobalError(t("dashboard.slipUpload.errorGeneric"));
      setStep("select");
    }
  }

  async function handleConfirm() {
    const validDrafts = drafts.filter((d) => {
      const val = Number.parseFloat(d.amount.replace(/,/g, ""));
      return Number.isFinite(val) && val > 0 && d.financialAccountId;
    });
    if (validDrafts.length === 0) return;

    setStep("submitting");
    setGlobalError(null);

    const results = await Promise.allSettled(
      validDrafts.map((d) => {
        const amount = Number.parseFloat(d.amount.replace(/,/g, ""));
        const body = {
          type: d.type,
          amount,
          financialAccountId: d.financialAccountId,
          categoryId: d.categoryId || undefined,
          note: d.note.trim() || undefined,
          occurredAt: combineDateWithCurrentTime(d.occurredAt),
        };
        return fetch("/api/transactions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      })
    );

    const failed = results.filter((r) => r.status === "rejected" || (r.status === "fulfilled" && !r.value.ok));
    if (failed.length > 0 && failed.length === results.length) {
      setGlobalError(t("dashboard.slipUpload.errorGeneric"));
      setStep("preview");
      return;
    }
    if (failed.length > 0) {
      setGlobalError(t("dashboard.slipUpload.partialSuccess"));
      setStep("preview");
      return;
    }

    onOpenChange(false);
    onSuccess?.();
  }

  const validDraftCount = drafts.filter((d) => {
    const val = Number.parseFloat(d.amount.replace(/,/g, ""));
    return Number.isFinite(val) && val > 0 && d.financialAccountId;
  }).length;

  return (
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
          <DialogBody className="space-y-4 pl-1 overflow-y-auto">
            {step === "select" && (
              <>
                <p className="text-sm text-muted-foreground">
                  {t("dashboard.slipUpload.selectImages")}
                </p>
                <input
                  key={fileInputKey}
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleFileChange}
                />
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={accountsLoading}
                >
                  <ImagePlus className="mr-2 h-4 w-4" />
                  {t("dashboard.slipUpload.chooseImages")}
                </Button>
                {globalError && (
                  <p className="text-sm text-red-600 dark:text-red-400">{globalError}</p>
                )}
              </>
            )}

            {step === "processing" && (
              <div className="flex flex-col items-center justify-center gap-4 py-8">
                <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  {t("dashboard.slipUpload.processing")}
                </p>
              </div>
            )}

            {step === "preview" && (
              <>
                <p className="text-sm text-muted-foreground">
                  {t("dashboard.slipUpload.previewTitle")}
                </p>
                {globalError && (
                  <p className="text-sm text-red-600 dark:text-red-400">{globalError}</p>
                )}
                <div className="space-y-4">
                  {drafts.map((draft, idx) => (
                    <div
                      key={draft.id}
                      className={cn(
                        "rounded-lg border p-4 space-y-3",
                        draft.error && "border-amber-500/50 bg-amber-50/50 dark:bg-amber-950/20"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground truncate max-w-[180px]">
                          {draft.rawFileName}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700"
                          onClick={() => removeDraft(idx)}
                        >
                          {t("common.actions.delete")}
                        </Button>
                      </div>
                      {draft.error && (
                        <p className="text-xs text-amber-600 dark:text-amber-400">
                          {t("dashboard.slipUpload.parseWarning")}
                        </p>
                      )}
                      <div>
                        <label className="mb-1 block text-sm font-medium">
                          {t("transactions.new.amountLabel")}
                        </label>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={draft.amount}
                          onChange={(e) =>
                            updateDraft(idx, { amount: sanitizeAmountInput(e.target.value) })
                          }
                          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => updateDraft(idx, { type: "INCOME" })}
                          className={cn(
                            "inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-sm transition-all",
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
                          onClick={() => updateDraft(idx, { type: "EXPENSE" })}
                          className={cn(
                            "inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-sm transition-all",
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
                          onChange={(id) => updateDraft(idx, { financialAccountId: id })}
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
                          onChange={(v) => updateDraft(idx, { occurredAt: v })}
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
                          onChange={(e) => updateDraft(idx, { categoryId: e.target.value })}
                          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        >
                          <option value="">—</option>
                          {categories.map((c) => (
                            <option key={c.id} value={c.id}>
                              {getCategoryDisplayName(c.name, localeKey)}
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
                          onChange={(e) => updateDraft(idx, { note: e.target.value })}
                          rows={2}
                          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {step === "submitting" && (
              <div className="flex flex-col items-center justify-center gap-4 py-8">
                <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  {t("dashboard.slipUpload.creating")}
                </p>
              </div>
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
                  disabled={validDraftCount === 0}
                >
                  {t("dashboard.slipUpload.confirmAll")}
                </Button>
              </>
            )}
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
