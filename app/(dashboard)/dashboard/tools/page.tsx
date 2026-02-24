"use client";

import { useState } from "react";
import { Download, Upload, Wrench } from "lucide-react";

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

export default function DataToolsPage() {
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  async function handleExportClick() {
    setExportError(null);
    setExporting(true);
    try {
      const res = await fetch("/api/transactions/export");
      if (!res.ok) {
        let message = "Failed to export transactions";
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
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = getFilenameFromHeaders(res.headers) ?? "transactions.csv";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      setExportError("Failed to export transactions");
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
      setImportError("Please choose a CSV file first.");
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
            : "Failed to import transactions",
        );
        return;
      }

      setImportResult(data as ImportResult);
    } catch {
      setImportError("Failed to import transactions");
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="p-8 mx-auto max-w-3xl space-y-8">
      <header className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900">
          <Wrench className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-semibold">Data tools</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Export or import your income and expense transactions as CSV.
          </p>
        </div>
      </header>

      <section className="rounded-lg border border-zinc-200 bg-zinc-50/50 p-6 dark:border-zinc-700 dark:bg-zinc-900/40">
        <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
          Export transactions
        </h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Download a CSV file of all your transactions (filtered by your
          account). If you have no data yet, the file will contain only the
          header row and can be used as a template.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleExportClick}
            disabled={exporting}
            className="inline-flex items-center gap-2 rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            <Download className="h-4 w-4" />
            {exporting ? "Exporting…" : "Download CSV"}
          </button>
          {exportError && (
            <p className="text-sm text-red-600 dark:text-red-400">
              {exportError}
            </p>
          )}
        </div>
        <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
          Columns: id, type, amount, category, note, occurredAt, createdAt.
        </p>
      </section>

      <section className="rounded-lg border border-zinc-200 bg-zinc-50/50 p-6 dark:border-zinc-700 dark:bg-zinc-900/40">
        <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
          Import transactions from CSV
        </h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Choose a CSV file with the same columns as the export. Rows with an
          empty id will create new transactions; rows with an existing id will
          update the matching transaction that belongs to your account.
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
            {file ? "Change CSV file" : "Choose CSV file"}
          </label>
          {file && (
            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              Selected:{" "}
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
            {importing ? "Importing…" : "Import CSV"}
          </button>
          {importError && (
            <p className="text-sm text-red-600 dark:text-red-400">
              {importError}
            </p>
          )}
        </div>

        {importResult && (
          <div className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-100">
            <p className="font-medium">Import completed.</p>
            <p className="mt-1">
              Created {importResult.createdCount} transaction
              {importResult.createdCount === 1 ? "" : "s"}, updated{" "}
              {importResult.updatedCount} transaction
              {importResult.updatedCount === 1 ? "" : "s"} (total{" "}
              {importResult.totalRows} rows).
            </p>
            {importResult.errorCount > 0 && importResult.errors.length > 0 && (
              <div className="mt-2 space-y-1">
                <p className="font-medium">
                  {importResult.errorCount} error
                  {importResult.errorCount === 1 ? "" : "s"} reported:
                </p>
                <ul className="list-disc pl-5">
                  {importResult.errors.slice(0, 5).map((err) => (
                    <li key={`${err.row}-${err.message}`}>
                      Row {err.row}: {err.message}
                    </li>
                  ))}
                  {importResult.errors.length > 5 && (
                    <li>
                      And {importResult.errors.length - 5} more…
                    </li>
                  )}
                </ul>
              </div>
            )}
          </div>
        )}

        <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
          Files larger than about 2&nbsp;MB or more than 10,000 rows will be
          rejected. All changes are applied in a single operation—if any row
          fails validation, nothing is written.
        </p>
      </section>
    </div>
  );
}

