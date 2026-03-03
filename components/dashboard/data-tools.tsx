"use client";

import { useState } from "react";
import { Download, Upload, Wrench } from "lucide-react";
import { DatePicker } from "@/components/ui/date-picker";
import { useI18n } from "@/hooks/use-i18n";

type ImportErrorItem = {
  row: number;
  message: string;
};

type ImportResult = {
  createdCount: number;
  updatedCount: number;
  totalRows: number;
  errorCount: number;
  errors: ImportErrorItem[];
};

function getFilenameFromHeaders(headers: Headers): string | null {
  const disposition = headers.get("content-disposition");
  if (!disposition) return null;
  const match = /filename="([^"]+)"/i.exec(disposition);
  if (match && match[1]) {
    return match[1];
  }
  return null;
}

export function DataTools() {
  const { t } = useI18n();

  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportFrom, setExportFrom] = useState("");
  const [exportTo, setExportTo] = useState("");
  const [exportType, setExportType] = useState<"all" | "INCOME" | "EXPENSE">("all");

  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  async function handleExportClick() {
    setExportError(null);
    setExporting(true);
    try {
      const params = new URLSearchParams();
      if (exportFrom) params.set("from", exportFrom);
      if (exportTo) params.set("to", exportTo);
      if (exportFrom || exportTo) {
        params.set("timezone", Intl.DateTimeFormat().resolvedOptions().timeZone);
      }
      if (exportType !== "all") params.set("type", exportType);
      const query = params.toString();
      const url = query ? `/api/transactions/export?${query}` : "/api/transactions/export";
      const res = await fetch(url);
      if (!res.ok) {
        let message = t("dataTools.export.failed");
        try {
          const data = (await res.json()) as { error?: string };
          if (data.error) {
            message = data.error;
          }
        } catch {
          // ignore JSON parse errors
        }
        setExportError(message);
        return;
      }

      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = getFilenameFromHeaders(res.headers) ?? "transactions.csv";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(blobUrl);
    } catch {
      setExportError(t("dataTools.export.failed"));
    } finally {
      setExporting(false);
    }
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    setImportError(null);
    setImportResult(null);
    const nextFile = event.target.files?.[0] ?? null;
    setFile(nextFile);
  }

  async function handleImportClick() {
    setImportError(null);
    setImportResult(null);

    if (!file) {
      setImportError(t("dataTools.import.noFile"));
      return;
    }

    setImporting(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/transactions/import", {
        method: "POST",
        body: formData,
      });

      const data = (await res.json()) as
        | { error?: string; errorCount?: number; errors?: ImportErrorItem[] }
        | ImportResult;

      if (!res.ok) {
        setImportError(
          "error" in data && data.error
            ? data.error
            : t("dataTools.import.failed"),
        );
        return;
      }

      setImportResult(data as ImportResult);
    } catch {
      setImportError(t("dataTools.import.failed"));
    } finally {
      setImporting(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-7 w-7 items-center justify-center">
            <Wrench className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-medium text-[#3D3020] dark:text-stone-100">
              {t("dataTools.title")}
            </h2>
            <p className="mt-1 text-xs text-[#6B5E4E] dark:text-stone-400">
              {t("dataTools.description")}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-8">
        <div>
          <h3 className="text-sm font-medium text-[#3D3020] dark:text-stone-200">
            {t("dataTools.export.title")}
          </h3>
          <p className="mt-1 text-sm text-[#6B5E4E] dark:text-stone-400">
            {t("dataTools.export.description")}
          </p>
          <div className="mt-4 flex flex-wrap items-end gap-4">
            <DatePicker
              id="export-from"
              label={t("dataTools.export.fromDate")}
              value={exportFrom}
              onChange={setExportFrom}
              className="min-w-[180px]"
            />
            <DatePicker
              id="export-to"
              label={t("dataTools.export.toDate")}
              value={exportTo}
              onChange={setExportTo}
              className="min-w-[180px]"
            />
            <div>
              <label htmlFor="export-type" className="mb-1 block text-xs font-medium text-[#6B5E4E] dark:text-stone-400">
                {t("dataTools.export.type")}
              </label>
              <select
                id="export-type"
                value={exportType}
                onChange={(e) => setExportType(e.target.value as "all" | "INCOME" | "EXPENSE")}
                className="rounded-md border border-[#D4C9B0] px-2 py-1.5 text-sm dark:border-stone-600 dark:bg-stone-900 dark:text-stone-100"
              >
                <option value="all">{t("dataTools.export.typeAll")}</option>
                <option value="INCOME">{t("transactions.common.income")}</option>
                <option value="EXPENSE">{t("transactions.common.expense")}</option>
              </select>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleExportClick}
              disabled={exporting}
              className="inline-flex items-center gap-2 rounded-md bg-[#5C6B52] px-4 py-2 text-sm font-medium text-white hover:bg-[#4A5E40] disabled:opacity-50 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-200"
            >
              <Download className="h-4 w-4" />
              {exporting ? t("dataTools.export.pending") : t("dataTools.export.button")}
            </button>
            {exportError && (
              <p className="text-sm text-red-600 dark:text-red-400">
                {exportError}
              </p>
            )}
          </div>
          <p className="mt-2 text-xs text-[#A09080] dark:text-stone-400">
            {t("dataTools.export.columns")}
          </p>
        </div>

        <div>
          <h3 className="text-sm font-medium text-[#3D3020] dark:text-stone-200">
            {t("dataTools.import.title")}
          </h3>
          <p className="mt-1 text-sm text-[#6B5E4E] dark:text-stone-400">
            {t("dataTools.import.description")}
          </p>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <label className="inline-flex cursor-pointer items-center justify-center rounded-md border border-dashed border-[#D4C9B0] bg-[#FDFAF4] px-4 py-3 text-sm font-medium text-[#3D3020] hover:bg-[#F5F0E8] dark:border-stone-600 dark:bg-stone-900 dark:text-stone-200 dark:hover:bg-stone-800">
              <input
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={handleFileChange}
              />
              <Upload className="mr-2 h-4 w-4" />
              {file ? t("dataTools.import.changeFile") : t("dataTools.import.chooseFile")}
            </label>
            {file && (
              <p className="text-xs text-[#6B5E4E] dark:text-stone-400">
                {t("dataTools.import.selected")}:{" "}
                <span className="font-medium text-[#3D3020] dark:text-stone-100">
                  {file.name}
                </span>
              </p>
            )}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleImportClick}
              disabled={importing || !file}
              className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
            >
              <Upload className="h-4 w-4" />
              {importing ? t("dataTools.import.pending") : t("dataTools.import.button")}
            </button>
            {importError && (
              <p className="text-sm text-red-600 dark:text-red-400">
                {importError}
              </p>
            )}
          </div>

          {importResult && (
            <div className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-100">
              <p className="font-medium">
                {t("dataTools.import.completed")}
              </p>
              <p className="mt-1">
                {t("dataTools.import.summary", {
                  created: importResult.createdCount,
                  updated: importResult.updatedCount,
                  total: importResult.totalRows,
                })}
              </p>
              {importResult.errorCount > 0 && importResult.errors.length > 0 && (
                <div className="mt-2 space-y-1">
                  <p className="font-medium">
                    {t("dataTools.import.errorSummary", {
                      count: importResult.errorCount,
                    })}
                  </p>
                  <ul className="list-disc pl-5">
                    {importResult.errors.slice(0, 5).map((err) => (
                      <li key={`${err.row}-${err.message}`}>
                        {t("dataTools.import.errorRow", {
                          row: err.row,
                          message: err.message,
                        })}
                      </li>
                    ))}
                    {importResult.errors.length > 5 && (
                      <li>
                        {t("dataTools.import.moreErrors", {
                          count: importResult.errors.length - 5,
                        })}
                      </li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          )}

          <p className="mt-3 text-xs text-[#A09080] dark:text-stone-400">
            {t("dataTools.import.note")}
          </p>
        </div>
      </div>
    </div>
  );
}

