"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  List,
  ArrowDownCircle,
  ArrowUpCircle,
  ArrowLeftRight,
  Plus,
  CalendarRange,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Skeleton } from "@/components/ui/skeleton";
import { formatAmount } from "@/lib/format";
import { getCategoryDisplayName } from "@/lib/categories-display";
import { useI18n } from "@/hooks/use-i18n";
import { TransactionFormDialog } from "@/components/dashboard/transaction-form-dialog";
import { TransactionDeleteDialog } from "@/components/dashboard/transaction-delete-dialog";

type Transaction = {
  id: string;
  type: "INCOME" | "EXPENSE" | "TRANSFER" | string;
  amount: number;
  financialAccount?: { id: string; name: string } | null;
  transferAccount?: { id: string; name: string } | null;
  categoryRef?: { id: string; name: string } | null;
  category: string | null;
  note: string | null;
  occurredAt: string;
  createdAt: string;
};

function formatDateTime(iso: string, locale: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const dateStr = d.toLocaleDateString(locale, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const timeStr = d.toLocaleTimeString(locale, {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${dateStr} ${timeStr}`;
}

const PAGE_SIZE = 20;

export default function TransactionsPage() {
  const searchParams = useSearchParams();
  const { t, locale, language } = useI18n();
  const localeKey = language === "th" ? "th" : "en";

  const [items, setItems] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");
  const [filterType, setFilterType] = useState<"all" | "INCOME" | "EXPENSE" | "TRANSFER">("all");
  const [filterAccountId, setFilterAccountId] = useState("");
  const [offset, setOffset] = useState(0);
  const [accounts, setAccounts] = useState<{ id: string; name: string }[]>([]);

  const [formOpen, setFormOpen] = useState(false);
  const [formEditId, setFormEditId] = useState<string | null>(null);
  const [formInitialDate, setFormInitialDate] = useState<string | null>(null);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTransaction, setDeleteTransaction] = useState<Transaction | null>(null);

  async function fetchTransactions(overrides?: { offset?: number }) {
    setLoading(true);
    setError(null);
    const currentOffset = overrides?.offset ?? offset;
    try {
      const params = new URLSearchParams();
      params.set("limit", String(PAGE_SIZE));
      params.set("offset", String(currentOffset));
      if (filterFrom) params.set("from", filterFrom);
      if (filterTo) params.set("to", filterTo);
      if (filterFrom || filterTo) {
        params.set("timezone", Intl.DateTimeFormat().resolvedOptions().timeZone);
      }
      if (filterType !== "all") params.set("type", filterType);
      if (filterAccountId) params.set("financialAccountId", filterAccountId);
      const res = await fetch(`/api/transactions?${params.toString()}`, { cache: "no-store" });
      if (!res.ok) {
        if (res.status === 401) {
          setError(t("common.errors.unauthenticated"));
        } else {
          setError(t("transactions.list.loadFailed"));
        }
        setItems([]);
        return;
      }
      const data = (await res.json()) as Transaction[];
      setItems(Array.isArray(data) ? data : []);
    } catch {
      setError(t("transactions.list.loadFailed"));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  function applyFilters() {
    setOffset(0);
    void fetchTransactions({ offset: 0 });
  }

  function goPrev() {
    const nextOffset = Math.max(0, offset - PAGE_SIZE);
    setOffset(nextOffset);
    void fetchTransactions({ offset: nextOffset });
  }

  function goNext() {
    const nextOffset = offset + PAGE_SIZE;
    setOffset(nextOffset);
    void fetchTransactions({ offset: nextOffset });
  }

  useEffect(() => {
    void fetchTransactions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetch("/api/financial-accounts")
      .then((r) => (r.ok ? r.json() : []))
      .then((data: { id: string; name: string; isActive?: boolean }[]) => {
        setAccounts(
          (Array.isArray(data) ? data : [])
            .filter((a) => a.isActive !== false)
            .map((a) => ({ id: a.id, name: a.name }))
        );
      })
      .catch(() => setAccounts([]));
  }, []);

  useEffect(() => {
    const create = searchParams.get("create");
    const editId = searchParams.get("edit");
    const date = searchParams.get("date");
    if (create === "1") {
      setFormEditId(null);
      setFormInitialDate(
        date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null,
      );
      setFormOpen(true);
    } else if (editId) {
      setFormEditId(editId);
      setFormInitialDate(null);
      setFormOpen(true);
    }
  }, [searchParams]);

  function openCreateModal(initialDate?: string | null) {
    setFormEditId(null);
    setFormInitialDate(initialDate ?? null);
    setFormOpen(true);
  }

  function openEditModal(tx: Transaction) {
    setFormEditId(tx.id);
    setFormInitialDate(null);
    setFormOpen(true);
  }

  function openDeleteModal(tx: Transaction) {
    setDeleteTransaction(tx);
    setDeleteOpen(true);
  }

  function refreshList() {
    void fetchTransactions({ offset });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          {/* <h1 className="flex items-center gap-2 text-xl font-semibold">
            <List className="h-5 w-5" />
            {t("dashboard.pageTitle.transactionsList")}
          </h1> */}
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            {t("transactions.list.subtitle")}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={() => openCreateModal()}
            className="inline-flex gap-2 rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            <Plus className="h-4 w-4" />
            {t("transactions.list.newTransaction")}
          </Button>
        </div>
      </div>

      <div className="rounded-lg border border-zinc-200 bg-zinc-50/50 p-4 dark:border-zinc-700 dark:bg-zinc-900/40">
        <h2 className="mb-3 text-sm font-medium text-zinc-700 dark:text-zinc-200">
          {t("transactions.list.filters")}
        </h2>
        <div className="flex flex-wrap items-end gap-3">
          <DatePicker
            id="list-from"
            label={t("dataTools.export.fromDate")}
            value={filterFrom}
            onChange={setFilterFrom}
            className="min-w-[180px]"
          />
          <DatePicker
            id="list-to"
            label={t("dataTools.export.toDate")}
            value={filterTo}
            onChange={setFilterTo}
            className="min-w-[180px]"
          />
          <div>
            <label htmlFor="list-type" className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
              {t("dataTools.export.type")}
            </label>
            <select
              id="list-type"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as "all" | "INCOME" | "EXPENSE" | "TRANSFER")}
              className="rounded-md border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
            >
              <option value="all">{t("dataTools.export.typeAll")}</option>
              <option value="INCOME">{t("transactions.common.income")}</option>
              <option value="EXPENSE">{t("transactions.common.expense")}</option>
              <option value="TRANSFER">{t("transactions.common.transfer")}</option>
            </select>
          </div>
          <div>
            <label htmlFor="list-account" className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
              {t("transactions.new.accountLabel")}
            </label>
            <select
              id="list-account"
              value={filterAccountId}
              onChange={(e) => setFilterAccountId(e.target.value)}
              className="rounded-md border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 min-w-[160px]"
            >
              <option value="">{t("dataTools.export.typeAll")}</option>
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name}
                </option>
              ))}
            </select>
          </div>
          <Button onClick={applyFilters} variant="secondary" size="sm">
            {t("transactions.list.applyFilters")}
          </Button>
        </div>
      </div>

      {loading && (
        <div className="mt-6 space-y-2">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-12 w-full rounded-md" />
          ))}
          <p className="text-muted-foreground text-sm">
            {t("transactions.list.loading")}
          </p>
        </div>
      )}

      {error && !loading && (
        <p className="mt-6 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      {!loading && !error && items.length === 0 && (
        <p className="mt-6 text-sm text-zinc-500 dark:text-zinc-400">
          {t("transactions.list.empty")}
        </p>
      )}

      {!loading && !error && items.length > 0 && (
        <>
          <div className="mt-6 overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900/60">
            <table className="min-w-full text-sm">
              <thead className="bg-zinc-50 dark:bg-zinc-800/80">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-zinc-500 dark:text-zinc-400">
                    {t("transactions.list.columns.date")}
                  </th>
                  <th className="px-4 py-2 text-left font-medium text-zinc-500 dark:text-zinc-400">
                    {t("transactions.list.columns.account")}
                  </th>
                  <th className="px-4 py-2 text-left font-medium text-zinc-500 dark:text-zinc-400">
                    {t("transactions.list.columns.type")}
                  </th>
                  <th className="px-4 py-2 text-right font-medium text-zinc-500 dark:text-zinc-400">
                    {t("transactions.list.columns.amount")}
                  </th>
                  <th className="px-4 py-2 text-left font-medium text-zinc-500 dark:text-zinc-400">
                    {t("transactions.list.columns.category")}
                  </th>
                  <th className="px-4 py-2 text-left font-medium text-zinc-500 dark:text-zinc-400">
                    {t("transactions.list.columns.note")}
                  </th>
                  <th className="w-0 px-2 py-2 text-right font-medium text-zinc-500 dark:text-zinc-400">
                    {t("common.actions.edit")} / {t("common.actions.delete")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((tx) => {
                  const isIncome = tx.type === "INCOME";
                  const isTransfer = tx.type === "TRANSFER";
                  const accountDisplay = isTransfer && tx.transferAccount
                    ? t("transactions.list.transferTo", {
                        account: tx.transferAccount.name,
                      })
                    : tx.financialAccount?.name ?? "—";
                  return (
                    <tr
                      key={tx.id}
                      className="border-t border-zinc-100 dark:border-zinc-800"
                    >
                      <td className="px-4 py-2 align-top text-zinc-800 dark:text-zinc-100">
                        {formatDateTime(tx.occurredAt, locale)}
                      </td>
                      <td className="px-4 py-2 align-top text-zinc-700 dark:text-zinc-200">
                        {isTransfer ? (
                          <>
                            {tx.financialAccount?.name ?? "—"} {accountDisplay}
                          </>
                        ) : (
                          accountDisplay
                        )}
                      </td>
                      <td className="px-4 py-2 align-top">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                            isIncome
                              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                              : isTransfer
                                ? "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                                : "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                          }`}
                        >
                          {isIncome ? (
                            <ArrowDownCircle className="h-3.5 w-3.5" />
                          ) : isTransfer ? (
                            <ArrowLeftRight className="h-3.5 w-3.5" />
                          ) : (
                            <ArrowUpCircle className="h-3.5 w-3.5" />
                          )}
                          {isIncome
                            ? t("transactions.common.income")
                            : isTransfer
                              ? t("transactions.common.transfer")
                              : t("transactions.common.expense")}
                        </span>
                      </td>
                      <td className="px-4 py-2 align-top text-right tabular-nums text-zinc-900 dark:text-zinc-50">
                        {formatAmount(tx.amount)}
                      </td>
                      <td className="px-4 py-2 align-top text-zinc-700 dark:text-zinc-200">
                        {getCategoryDisplayName(
                          tx.categoryRef?.name ?? tx.category ?? "",
                          localeKey
                        ) || "—"}
                      </td>
                      <td className="px-4 py-2 align-top text-zinc-600 dark:text-zinc-300">
                        {tx.note
                          ? tx.note.length > 60
                            ? `${tx.note.slice(0, 57)}…`
                            : tx.note
                          : "—"}
                      </td>
                      <td className="px-2 py-2 align-top text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditModal(tx)}
                            aria-label={t("common.actions.edit")}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openDeleteModal(tx)}
                            aria-label={t("common.actions.delete")}
                            className="text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-900/30 dark:hover:text-red-300"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="mt-3 flex items-center justify-between gap-3">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {t("transactions.list.pageInfo", {
                from: offset + 1,
                to: offset + items.length,
              })}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={goPrev}
                disabled={offset === 0}
                className="gap-1"
              >
                <ChevronLeft className="h-4 w-4" />
                {t("transactions.list.prev")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={goNext}
                disabled={items.length < PAGE_SIZE}
                className="gap-1"
              >
                {t("transactions.list.next")}
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </>
      )}

      <TransactionFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        editId={formEditId}
        initialDate={formInitialDate}
        onSuccess={refreshList}
      />

      <TransactionDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        transaction={deleteTransaction}
        onConfirm={refreshList}
      />
    </div>
  );
}
