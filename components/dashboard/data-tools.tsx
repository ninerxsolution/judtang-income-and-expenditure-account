"use client";

import { useState } from "react";
import { Download, Upload, Wrench } from "lucide-react";
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
    <div className="space-y-8">
      <header className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900">
          <Wrench className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-semibold">
            {t("dataTools.title")}
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            {t("dataTools.description")}
          </p>
        </div>
      </header>

      <section className="rounded-lg border border-zinc-200 bg-zinc-50/50 p-6 dark:border-zinc-700 dark:bg-zinc-900/40">
        <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
          {t("dataTools.export.title")}
        </h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          {t("dataTools.export.description")}
        </p>
        <div className="mt-4 flex flex-wrap items-end gap-4">
          <div>
            <label htmlFor="export-from" className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
              {t("dataTools.export.fromDate")}
            </label>
            <input
              id="export-from"
              type="date"
              value={exportFrom}
              onChange={(e) => setExportFrom(e.target.value)}
              className="rounded-md border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
            />
          </div>
          <div>
            <label htmlFor="export-to" className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
              {t("dataTools.export.toDate")}
            </label>
            <input
              id="export-to"
              type="date"
              value={exportTo}
              onChange={(e) => setExportTo(e.target.value)}
              className="rounded-md border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
            />
          </div>
          <div>
            <label htmlFor="export-type" className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
              {t("dataTools.export.type")}
            </label>
            <select
              id="export-type"
              value={exportType}
              onChange={(e) => setExportType(e.target.value as "all" | "INCOME" | "EXPENSE")}
              className="rounded-md border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
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
            className="inline-flex items-center gap-2 rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
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
        <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
          {t("dataTools.export.columns")}
        </p>
      </section>

      <section className="rounded-lg border border-zinc-200 bg-zinc-50/50 p-6 dark:border-zinc-700 dark:bg-zinc-900/40">
        <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
          {t("dataTools.import.title")}
        </h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          {t("dataTools.import.description")}
        </p>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="inline-flex cursor-pointer items-center justify-center rounded-md border border-dashed border-zinc-300 bg-white px-4 py-3 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800">
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
            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              {t("dataTools.import.selected")}:{" "}
              <span className="font-medium text-zinc-800 dark:text-zinc-100">
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

        <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
          {t("dataTools.import.note")}
        </p>
      </section>
    </div>
  );
}

