"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  ArrowLeftRight,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Skeleton } from "@/components/ui/skeleton";
import { formatAmount } from "@/lib/format";
import { getCategoryDisplayName } from "@/lib/categories-display";
import { useI18n } from "@/hooks/use-i18n";
import { useIsDesktopOrLarger } from "@/hooks/use-mobile";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  const isDesktop = useIsDesktopOrLarger();

  const [items, setItems] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");
  const [filterType, setFilterType] = useState<"all" | "INCOME" | "EXPENSE" | "TRANSFER">("all");
  const [filterAccountId, setFilterAccountId] = useState("");
  const [filterCategoryId, setFilterCategoryId] = useState("");
  const [filterSearch, setFilterSearch] = useState("");
  const [offset, setOffset] = useState(0);
  const [accounts, setAccounts] = useState<{ id: string; name: string }[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);

  const [formOpen, setFormOpen] = useState(false);
  const [formEditId, setFormEditId] = useState<string | null>(null);
  const [formInitialDate, setFormInitialDate] = useState<string | null>(null);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTransaction, setDeleteTransaction] = useState<Transaction | null>(null);

  const [actionMenuTx, setActionMenuTx] = useState<Transaction | null>(null);
  const [advancedSearchOpen, setAdvancedSearchOpen] = useState(false);

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
      if (filterCategoryId) params.set("categoryId", filterCategoryId);
      if (filterSearch.trim()) params.set("search", filterSearch.trim());
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
    fetch("/api/categories")
      .then((r) => (r.ok ? r.json() : []))
      .then((data: { id: string; name: string }[]) => {
        setCategories(Array.isArray(data) ? data : []);
      })
      .catch(() => setCategories([]));
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

  function openEditModal(tx: Transaction) {
    setFormEditId(tx.id);
    setFormInitialDate(null);
    setFormOpen(true);
  }

  function openDeleteModal(tx: Transaction) {
    setDeleteTransaction(tx);
    setDeleteOpen(true);
  }

  function handleRowClick(tx: Transaction) {
    setActionMenuTx(tx);
  }

  function handleActionEdit() {
    if (actionMenuTx) {
      openEditModal(actionMenuTx);
      setActionMenuTx(null);
    }
  }

  function handleActionDelete() {
    if (actionMenuTx) {
      openDeleteModal(actionMenuTx);
      setActionMenuTx(null);
    }
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
          <p className="mt-1 text-sm text-[#6B5E4E] dark:text-stone-400">
            {t("transactions.list.subtitle")}
          </p>
        </div>
        {/* <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={() => openCreateModal()}
            className="inline-flex gap-2 rounded-md bg-[#5C6B52] px-3 py-2 text-sm font-medium text-white hover:bg-[#4A5E40] dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-200"
          >
            <Plus className="h-4 w-4" />
            {t("transactions.list.newTransaction")}
          </Button>
        </div> */}
      </div>

      <div className="rounded-lg border space-y-3 border-[#D4C9B0] bg-[#F5F0E8]/50 p-3 md:p-4 dark:border-stone-700 dark:bg-stone-900/40">
        <h2 className="text-sm font-medium text-[#3D3020] dark:text-stone-200">
          {t("transactions.list.filters")}
        </h2>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex gap-2 w-full items-end sm:gap-2">
            <div className="min-w-0 flex-1 space-y-1.5">
              <label htmlFor="list-search" className="block text-xs font-medium text-[#6B5E4E] sm:text-sm dark:text-stone-400">
                {t("transactions.list.searchLabel")}
              </label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 -translate-y-1/2 text-[#A09080] dark:text-stone-500" />
                <Input
                  id="list-search"
                  type="text"
                  placeholder={t("transactions.list.searchPlaceholder")}
                  value={filterSearch}
                  onChange={(e) => setFilterSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") applyFilters();
                  }}
                  className="h-8 w-full pl-8 text-sm sm:h-9 sm:pl-9"
                />
              </div>
            </div>
            <Button onClick={applyFilters} size="sm" className="h-8 shrink-0 self-end sm:h-9 sm:self-auto">
              {t("transactions.list.applyFilters")}
            </Button>
          </div>
          {/* Desktop (lg+): always show advanced filters. Tablet and below: collapsible with "Advanced search" */}
          {isDesktop ? (
            <div className="flex flex-wrap min-w-0 gap-2 items-end">
              <DateRangePicker
                id="list-date-range"
                label={t("dataTools.export.dateRange")}
                value={{ from: filterFrom, to: filterTo }}
                onChange={(v) => {
                  setFilterFrom(v.from ?? "");
                  setFilterTo(v.to ?? "");
                }}
                placeholder={t("dataTools.export.dateRangePlaceholder")}
                numberOfMonths={2}
              />
              <div className="min-w-0 space-y-1.5">
                <label htmlFor="list-type" className="block text-xs font-medium text-[#6B5E4E] sm:text-sm dark:text-stone-400">
                  {t("dataTools.export.type")}
                </label>
                <select
                  id="list-type"
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value as "all" | "INCOME" | "EXPENSE" | "TRANSFER")}
                  className="h-8 w-full rounded-md border border-[#D4C9B0] px-2.5 text-sm dark:border-stone-600 dark:bg-stone-900 dark:text-stone-100 sm:h-9 sm:px-3"
                >
                  <option value="all">{t("dataTools.export.typeAll")}</option>
                  <option value="INCOME">{t("transactions.common.income")}</option>
                  <option value="EXPENSE">{t("transactions.common.expense")}</option>
                  <option value="TRANSFER">{t("transactions.common.transfer")}</option>
                </select>
              </div>
              <div className="min-w-0 space-y-1.5">
                <label htmlFor="list-account" className="block text-xs font-medium text-[#6B5E4E] sm:text-sm dark:text-stone-400">
                  {t("transactions.new.accountLabel")}
                </label>
                <select
                  id="list-account"
                  value={filterAccountId}
                  onChange={(e) => setFilterAccountId(e.target.value)}
                  className="h-8 w-full rounded-md border border-[#D4C9B0] px-2.5 text-sm dark:border-stone-600 dark:bg-stone-900 dark:text-stone-100 sm:h-9 sm:px-3"
                >
                  <option value="">{t("dataTools.export.typeAll")}</option>
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="min-w-0 space-y-1.5">
                <label htmlFor="list-category" className="block text-xs font-medium text-[#6B5E4E] sm:text-sm dark:text-stone-400">
                  {t("transactions.new.categoryLabel")}
                </label>
                <select
                  id="list-category"
                  value={filterCategoryId}
                  onChange={(e) => setFilterCategoryId(e.target.value)}
                  className="h-8 w-full rounded-md border border-[#D4C9B0] px-2.5 text-sm dark:border-stone-600 dark:bg-stone-900 dark:text-stone-100 sm:h-9 sm:px-3"
                >
                  <option value="">{t("dataTools.export.typeAll")}</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : (
            <div className="w-full">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setAdvancedSearchOpen((prev) => !prev)}
                className="h-8 w-full justify-between gap-2 sm:h-9"
                aria-expanded={advancedSearchOpen}
                aria-label={t("transactions.list.advancedSearchAria")}
              >
                <span>{t("transactions.list.advancedSearch")}</span>
                {advancedSearchOpen ? (
                  <ChevronUp className="h-4 w-4 shrink-0" />
                ) : (
                  <ChevronDown className="h-4 w-4 shrink-0" />
                )}
              </Button>
              {advancedSearchOpen && (
                <div className="mt-3 flex flex-wrap min-w-0 gap-2 items-end">
                  <DateRangePicker
                    id="list-date-range"
                    label={t("dataTools.export.dateRange")}
                    value={{ from: filterFrom, to: filterTo }}
                    onChange={(v) => {
                      setFilterFrom(v.from ?? "");
                      setFilterTo(v.to ?? "");
                    }}
                    placeholder={t("dataTools.export.dateRangePlaceholder")}
                    numberOfMonths={2}
                  />
                  <div className="min-w-0 space-y-1.5">
                    <label htmlFor="list-type" className="block text-xs font-medium text-[#6B5E4E] sm:text-sm dark:text-stone-400">
                      {t("dataTools.export.type")}
                    </label>
                    <select
                      id="list-type"
                      value={filterType}
                      onChange={(e) => setFilterType(e.target.value as "all" | "INCOME" | "EXPENSE" | "TRANSFER")}
                      className="h-8 w-full rounded-md border border-[#D4C9B0] px-2.5 text-sm dark:border-stone-600 dark:bg-stone-900 dark:text-stone-100 sm:h-9 sm:px-3"
                    >
                      <option value="all">{t("dataTools.export.typeAll")}</option>
                      <option value="INCOME">{t("transactions.common.income")}</option>
                      <option value="EXPENSE">{t("transactions.common.expense")}</option>
                      <option value="TRANSFER">{t("transactions.common.transfer")}</option>
                    </select>
                  </div>
                  <div className="min-w-0 space-y-1.5">
                    <label htmlFor="list-account" className="block text-xs font-medium text-[#6B5E4E] sm:text-sm dark:text-stone-400">
                      {t("transactions.new.accountLabel")}
                    </label>
                    <select
                      id="list-account"
                      value={filterAccountId}
                      onChange={(e) => setFilterAccountId(e.target.value)}
                      className="h-8 w-full rounded-md border border-[#D4C9B0] px-2.5 text-sm dark:border-stone-600 dark:bg-stone-900 dark:text-stone-100 sm:h-9 sm:px-3"
                    >
                      <option value="">{t("dataTools.export.typeAll")}</option>
                      {accounts.map((acc) => (
                        <option key={acc.id} value={acc.id}>
                          {acc.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="min-w-0 space-y-1.5">
                    <label htmlFor="list-category" className="block text-xs font-medium text-[#6B5E4E] sm:text-sm dark:text-stone-400">
                      {t("transactions.new.categoryLabel")}
                    </label>
                    <select
                      id="list-category"
                      value={filterCategoryId}
                      onChange={(e) => setFilterCategoryId(e.target.value)}
                      className="h-8 w-full rounded-md border border-[#D4C9B0] px-2.5 text-sm dark:border-stone-600 dark:bg-stone-900 dark:text-stone-100 sm:h-9 sm:px-3"
                    >
                      <option value="">{t("dataTools.export.typeAll")}</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {loading && (
        <div className="mt-6 space-y-2">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-12 w-full rounded-md" />
          ))}
        </div>
      )}

      {error && !loading && (
        <p className="mt-6 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      {!loading && !error && items.length === 0 && (
        <p className="mt-6 text-sm text-[#A09080] dark:text-stone-400">
          {t("transactions.list.empty")}
        </p>
      )}

      {!loading && !error && items.length > 0 && (
        <>
          <div className="mt-6 overflow-x-auto rounded-lg border border-[#D4C9B0] dark:border-stone-700 bg-[#FDFAF4] dark:bg-stone-900/60">
            <table className="min-w-full text-xs lg:text-sm">
              <thead className="bg-[#F5F0E8] dark:bg-stone-800/80">
                <tr>
                  <th className="px-2 py-1.5 lg:px-4 lg:py-2 text-left font-medium text-[#A09080] dark:text-stone-400">
                    <span className="lg:hidden">{t("transactions.list.columns.dateAndAccount")}</span>
                    <span className="hidden lg:inline">{t("transactions.list.columns.date")}</span>
                  </th>
                  <th className="hidden lg:table-cell px-4 py-2 text-left font-medium text-[#A09080] dark:text-stone-400">
                    {t("transactions.list.columns.account")}
                  </th>
                  <th className="hidden lg:table-cell w-0 px-1.5 py-1.5 lg:px-4 lg:py-2 text-left font-medium text-[#A09080] dark:text-stone-400">
                    {t("transactions.list.columns.type")}
                  </th>
                  <th className="px-2 py-1.5 lg:px-4 lg:py-2 text-right font-medium text-[#A09080] dark:text-stone-400 whitespace-nowrap">
                    {t("transactions.list.columns.amount")}
                  </th>
                  <th className="hidden lg:table-cell px-2 py-1.5 lg:px-4 lg:py-2 text-left font-medium text-[#A09080] dark:text-stone-400">
                    {t("transactions.list.columns.category")}
                  </th>
                  <th className="hidden lg:table-cell px-4 py-2 text-left font-medium text-[#A09080] dark:text-stone-400">
                    {t("transactions.list.columns.note")}
                  </th>
                  <th className="hidden lg:table-cell w-0 px-2 py-2 text-right font-medium text-[#A09080] dark:text-stone-400">
                    {t("common.actions.edit")} / {t("common.actions.delete")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((tx) => {
                  const isIncome = tx.type === "INCOME";
                  const isTransfer = tx.type === "TRANSFER";
                  const categoryDisplay = getCategoryDisplayName(
                    tx.categoryRef?.name ?? tx.category ?? "",
                    localeKey
                  ) || "";
                  const accountDisplay = isTransfer && tx.transferAccount
                    ? t("transactions.list.transferTo", {
                        account: tx.transferAccount.name,
                      })
                    : tx.financialAccount?.name ?? "—";
                  return (
                    <tr
                      key={tx.id}
                      {...(!isDesktop && {
                        role: "button" as const,
                        tabIndex: 0,
                        onClick: () => handleRowClick(tx),
                        onKeyDown: (e: React.KeyboardEvent) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            handleRowClick(tx);
                          }
                        },
                        "aria-label": t("transactions.list.tapToEditOrDelete"),
                      })}
                      className={`border-t border-[#D4C9B0] dark:border-stone-800 ${
                        !isDesktop ? "cursor-pointer transition-colors hover:bg-[#F5F0E8]/60 dark:hover:bg-stone-800/60" : ""
                      }`}
                    >
                      <td className="px-2 py-1.5 lg:px-4 lg:py-2 text-[#3D3020] dark:text-stone-100">
                        <div className="flex flex-col gap-0.5">
                          <span className="whitespace-nowrap">{formatDateTime(tx.occurredAt, locale)}</span>
                          <span className="text-[12px] text-[#A09080] dark:text-stone-400 lg:hidden max-w-[160px] truncate">
                            {isTransfer ? (
                              <>
                                {tx.financialAccount?.name ?? "—"} {accountDisplay}
                              </>
                            ) : (
                              accountDisplay
                            )}
                            {categoryDisplay ? ` · ${categoryDisplay}` : ""}
                          </span>
                        </div>
                      </td>
                      <td className="hidden lg:table-cell px-4 py-2 text-[#3D3020] dark:text-stone-200 max-w-[100px] truncate">
                        {isTransfer ? (
                          <>
                            {tx.financialAccount?.name ?? "—"} {accountDisplay}
                          </>
                        ) : (
                          accountDisplay
                        )}
                      </td>
                      <td className="hidden lg:table-cell px-1.5 py-1.5 lg:px-4 lg:py-2">
                        <span
                          className={`inline-flex items-center justify-center gap-1 rounded-full p-0.5 lg:px-2 lg:py-0.5 text-xs font-medium ${
                            isIncome
                              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                              : isTransfer
                                ? "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                                : "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                          }`}
                          title={isIncome ? t("transactions.common.income") : isTransfer ? t("transactions.common.transfer") : t("transactions.common.expense")}
                        >
                          {isIncome ? (
                            <ArrowDownCircle className="h-3 w-3 lg:h-3.5 lg:w-3.5" />
                          ) : isTransfer ? (
                            <ArrowLeftRight className="h-3 w-3 lg:h-3.5 lg:w-3.5" />
                          ) : (
                            <ArrowUpCircle className="h-3 w-3 lg:h-3.5 lg:w-3.5" />
                          )}
                          <span className="hidden lg:inline">
                            {isIncome
                              ? t("transactions.common.income")
                              : isTransfer
                                ? t("transactions.common.transfer")
                                : t("transactions.common.expense")}
                          </span>
                        </span>
                      </td>
                      <td
                        className={`px-2 py-1.5 lg:px-4 lg:py-2 text-right tabular-nums whitespace-nowrap ${
                          isIncome
                            ? "text-emerald-600 dark:text-emerald-300 font-medium lg:text-zinc-900 lg:dark:text-zinc-50 lg:font-normal"
                            : isTransfer
                              ? "text-blue-600 dark:text-blue-300 font-medium lg:text-zinc-900 lg:dark:text-zinc-50 lg:font-normal"
                              : "text-red-600 dark:text-red-300 font-medium lg:text-zinc-900 lg:dark:text-zinc-50 lg:font-normal"
                        }`}
                      >
                        <span className="lg:hidden">{isIncome ? "+" : isTransfer ? "" : "-"}</span>
                        {formatAmount(tx.amount)}
                      </td>
                      <td className="hidden lg:table-cell px-2 py-1.5 lg:px-4 lg:py-2 text-[#3D3020] dark:text-stone-200 max-w-[80px] truncate">
                        {categoryDisplay || "—"}
                      </td>
                      <td className="hidden lg:table-cell px-4 py-2 text-[#6B5E4E] dark:text-stone-300 max-w-[140px] truncate">
                        {tx.note
                          ? tx.note.length > 60
                            ? `${tx.note.slice(0, 57)}…`
                            : tx.note
                          : "—"}
                      </td>
                      <td className="hidden lg:table-cell px-2 py-2 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-9"
                            onClick={() => openEditModal(tx)}
                            aria-label={t("common.actions.edit")}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-9 text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-900/30 dark:hover:text-red-300"
                            onClick={() => openDeleteModal(tx)}
                            aria-label={t("common.actions.delete")}
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
            <p className="text-sm text-[#A09080] dark:text-stone-400">
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

      <Dialog open={!!actionMenuTx} onOpenChange={(open) => !open && setActionMenuTx(null)}>
        <DialogContent showCloseButton={true} className="max-w-xs gap-4 p-4">
          <DialogHeader>
            <DialogTitle className="text-base">
              {t("transactions.list.selectAction")}
            </DialogTitle>
          </DialogHeader>
          {actionMenuTx && (
            <div className="rounded-lg border border-[#E8E0C8] dark:border-stone-700 bg-[#F5F0E8]/50 dark:bg-stone-800/50 px-3 py-2.5 text-sm space-y-1.5">
              <p className="text-[#3D3020] dark:text-stone-100 font-medium">
                {formatDateTime(actionMenuTx.occurredAt, locale)}
              </p>
              <p className="text-[#6B5E4E] dark:text-stone-300 truncate">
                {actionMenuTx.type === "TRANSFER" && actionMenuTx.transferAccount
                  ? `${actionMenuTx.financialAccount?.name ?? "—"} → ${actionMenuTx.transferAccount.name}`
                  : actionMenuTx.financialAccount?.name ?? "—"}
              </p>
              <p
                className={`tabular-nums font-medium ${
                  actionMenuTx.type === "INCOME"
                    ? "text-emerald-600 dark:text-emerald-300"
                    : actionMenuTx.type === "TRANSFER"
                      ? "text-blue-600 dark:text-blue-300"
                      : "text-red-600 dark:text-red-300"
                }`}
              >
                {actionMenuTx.type === "INCOME" ? "+" : actionMenuTx.type === "TRANSFER" ? "" : "-"}
                {formatAmount(actionMenuTx.amount)}
              </p>
            </div>
          )}
          <div className="flex flex-row gap-2">
            <Button
              variant="outline"
              className="w-1/2 gap-2"
              onClick={handleActionEdit}
            >
              <Pencil className="h-4 w-4" />
              {t("common.actions.edit")}
            </Button>
            <Button
              variant="outline"
              className="w-1/2 gap-2 text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-900/30 dark:hover:text-red-300"
              onClick={handleActionDelete}
            >
              <Trash2 className="h-4 w-4" />
              {t("common.actions.delete")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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
