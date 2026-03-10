"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  Landmark,
  CreditCard,
  Wallet,
  Banknote,
  PiggyBank,
  Pencil,
  BanknoteIcon,
  FileText,
  CheckCircle,
  ArrowDownCircle,
  ArrowUpCircle,
  ArrowLeftRight,
  ChevronLeft,
  ChevronRight,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { formatAmount } from "@/lib/format";
import { getBankDisplayName, getBankLogoUrl } from "@/lib/thai-banks";
import { getCardNetworkDisplayName } from "@/lib/card-types";
import { CardNetworkIcon } from "@/components/dashboard/card-type-select";
import { getCategoryDisplayName } from "@/lib/categories-display";
import { useI18n } from "@/hooks/use-i18n";
import { useAccountDetailBreadcrumb } from "@/components/dashboard/account-detail-breadcrumb-context";
import { FinancialAccountFormDialog } from "@/components/dashboard/financial-account-form-dialog";
import { CreditCardPaymentDialog } from "@/components/dashboard/credit-card-payment-dialog";
import { TransactionFormDialog } from "@/components/dashboard/transaction-form-dialog";
import { TransactionDeleteDialog } from "@/components/dashboard/transaction-delete-dialog";
import { toast } from "sonner";

type FinancialAccount = {
  id: string;
  name: string;
  type: string;
  initialBalance: number;
  isActive: boolean;
  isDefault: boolean;
  lastCheckedAt: string | null;
  balance: number;
  lastTransactionDate: string | null;
  transactionCount?: number;
  creditLimit?: number | null;
  statementClosingDay?: number | null;
  dueDay?: number | null;
  currentOutstanding?: number;
  availableCredit?: number | null;
  latestStatement?: {
    id: string;
    closingDate: string;
    dueDate: string;
    statementBalance: number;
    paidAmount: number;
    isPaid: boolean;
  } | null;
  bankName?: string | null;
  interestRate?: number | null;
  cardAccountType?: string | null;
  cardNetwork?: string | null;
  isIncomplete?: boolean;
};

type Transaction = {
  id: string;
  type: string;
  amount: number;
  financialAccount?: { id: string; name: string } | null;
  transferAccount?: { id: string; name: string } | null;
  categoryRef?: { id: string; name: string } | null;
  category: string | null;
  note: string | null;
  occurredAt: string;
  createdAt: string;
};

type Summary = { income: number; expense: number; totalBalance?: number } | null;

const ACCOUNT_TYPE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  BANK: Landmark,
  CREDIT_CARD: CreditCard,
  WALLET: Wallet,
  CASH: Banknote,
  OTHER: PiggyBank,
};

const PAGE_SIZE = 20;

function formatDate(iso: string | null, locale: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(locale, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function formatDateTime(iso: string, locale: string): string {
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


export default function AccountDetailPage() {
  const params = useParams();
  const { t, locale, language } = useI18n();
  const { setAccountName } = useAccountDetailBreadcrumb() ?? { setAccountName: () => {} };
  const localeKey = language === "th" ? "th" : "en";
  const accountId = typeof params.id === "string" ? params.id : null;

  const [account, setAccount] = useState<FinancialAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [txFormOpen, setTxFormOpen] = useState(false);
  const [txFormEditId, setTxFormEditId] = useState<string | null>(null);
  const [txFormInitialDate, setTxFormInitialDate] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTransaction, setDeleteTransaction] = useState<Transaction | null>(null);

  const [summary, setSummary] = useState<Summary>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  const [txFilterFrom, setTxFilterFrom] = useState("");
  const [txFilterTo, setTxFilterTo] = useState("");
  const [txFilterType, setTxFilterType] = useState<"all" | "INCOME" | "EXPENSE" | "TRANSFER">("all");
  const [txOffset, setTxOffset] = useState(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [txLoading, setTxLoading] = useState(false);


  const fetchAccount = useCallback(async () => {
    if (!accountId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/financial-accounts/${accountId}`, { cache: "no-store" });
      if (res.status === 404) {
        setAccount(null);
        setError("notFound");
        return;
      }
      if (!res.ok) {
        setError(t("accounts.loadFailed"));
        setAccount(null);
        return;
      }
      const data = (await res.json()) as FinancialAccount;
      setAccount(data);
    } catch {
      setError(t("accounts.loadFailed"));
      setAccount(null);
    } finally {
      setLoading(false);
    }
  }, [accountId, t]);

  const fetchSummary = useCallback(async () => {
    if (!accountId) return;
    setSummaryLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("all", "1");
      params.set("financialAccountId", accountId);
      const res = await fetch(`/api/transactions/summary?${params.toString()}`, {
        cache: "no-store",
      });
      if (res.ok) {
        const data = (await res.json()) as Summary;
        setSummary(data);
      } else {
        setSummary(null);
      }
    } catch {
      setSummary(null);
    } finally {
      setSummaryLoading(false);
    }
  }, [accountId]);

  const fetchTransactions = useCallback(async (overrides?: { offset?: number }) => {
    if (!accountId) return;
    setTxLoading(true);
    const currentOffset = overrides?.offset ?? txOffset;
    try {
      const params = new URLSearchParams();
      params.set("financialAccountId", accountId);
      params.set("limit", String(PAGE_SIZE));
      params.set("offset", String(currentOffset));
      if (txFilterFrom) params.set("from", txFilterFrom);
      if (txFilterTo) params.set("to", txFilterTo);
      if (txFilterFrom || txFilterTo) {
        params.set("timezone", Intl.DateTimeFormat().resolvedOptions().timeZone);
      }
      if (txFilterType !== "all") params.set("type", txFilterType);
      const res = await fetch(`/api/transactions?${params.toString()}`, { cache: "no-store" });
      if (res.ok) {
        const data = (await res.json()) as Transaction[];
        setTransactions(Array.isArray(data) ? data : []);
      } else {
        setTransactions([]);
      }
    } catch {
      setTransactions([]);
    } finally {
      setTxLoading(false);
    }
  }, [accountId, txFilterFrom, txFilterTo, txFilterType, txOffset]);

  useEffect(() => {
    void fetchAccount();
  }, [fetchAccount]);

  useEffect(() => {
    if (account?.name && typeof document !== "undefined") {
      document.title = `${account.name} | Judtang`;
    }
  }, [account?.name]);

  useEffect(() => {
    if (account?.name) {
      setAccountName(account.name);
    }
    return () => setAccountName(null);
  }, [account?.name, setAccountName]);

  useEffect(() => {
    if (accountId) void fetchSummary();
  }, [accountId, fetchSummary]);

  useEffect(() => {
    if (accountId) void fetchTransactions();
  }, [accountId, fetchTransactions]);

  function openEditModal() {
    setFormOpen(true);
  }

  function openPaymentDialog() {
    if (account?.isIncomplete) {
      toast.error(
        t("accounts.incompleteAccountCannotUse") ??
        "Please complete account setup (bank and account number) before using."
      );
      openEditModal();
      return;
    }
    if (
      account?.type === "CREDIT_CARD" &&
      (account.statementClosingDay == null || account.dueDay == null)
    ) {
      toast.error(
        t("accounts.closeStatementConfigRequired") ??
        "Please set statement closing day and due day in account settings first."
      );
      openEditModal();
      return;
    }
    setPaymentDialogOpen(true);
  }

  async function handleCloseStatement() {
    if (!account || account.type !== "CREDIT_CARD") return;
    if (account.isIncomplete) {
      toast.error(
        t("accounts.incompleteAccountCannotUse") ??
        "Please complete account setup before using."
      );
      openEditModal();
      return;
    }
    if (account.statementClosingDay == null || account.dueDay == null) {
      toast.error(t("accounts.closeStatementConfigRequired"));
      openEditModal();
      return;
    }
    const now = new Date();
    let closingDateStr: string;
    if (account.statementClosingDay != null) {
      const today = now.getDate();
      let closingDate: Date;
      if (today >= account.statementClosingDay) {
        closingDate = new Date(
          now.getFullYear(),
          now.getMonth(),
          account.statementClosingDay
        );
      } else {
        closingDate = new Date(
          now.getFullYear(),
          now.getMonth() - 1,
          account.statementClosingDay
        );
      }
      closingDateStr = closingDate.toISOString().slice(0, 10);
    } else {
      closingDateStr = now.toISOString().slice(0, 10);
    }
    try {
      const res = await fetch(`/api/credit-card/${account.id}/close-statement`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ closingDate: closingDateStr }),
      });
      if (res.ok) {
        toast.success(t("accounts.closeStatementSuccess") ?? "Statement closed.");
        void fetchAccount();
      } else {
        const data = (await res.json()) as { error?: string };
        toast.error(data.error ?? t("accounts.loadFailed"));
      }
    } catch {
      toast.error(t("accounts.loadFailed"));
    }
  }

  async function handleMarkChecked() {
    if (!account) return;
    try {
      await fetch(`/api/financial-accounts/${account.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lastCheckedAt: new Date().toISOString() }),
      });
      void fetchAccount();
    } catch {
      toast.error(t("accounts.loadFailed"));
    }
  }

  function openTxEdit(tx: Transaction) {
    setTxFormEditId(tx.id);
    setTxFormInitialDate(null);
    setTxFormOpen(true);
  }

  function openTxDelete(tx: Transaction) {
    setDeleteTransaction(tx);
    setDeleteOpen(true);
  }

  function refreshAll() {
    void fetchAccount();
    void fetchSummary();
    void fetchTransactions({ offset: txOffset });
  }

  function applyTxFilters() {
    setTxOffset(0);
    void fetchTransactions({ offset: 0 });
  }

  function goPrev() {
    const nextOffset = Math.max(0, txOffset - PAGE_SIZE);
    setTxOffset(nextOffset);
    void fetchTransactions({ offset: nextOffset });
  }

  function goNext() {
    const nextOffset = txOffset + PAGE_SIZE;
    setTxOffset(nextOffset);
    void fetchTransactions({ offset: nextOffset });
  }

  if (!accountId) {
    return (
      <div className="space-y-6">
        <p className="text-sm text-red-600 dark:text-red-400">{t("accounts.loadFailed")}</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" asChild>
          <Link href="/dashboard/accounts" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            {t("accounts.detail.backToAccounts")}
          </Link>
        </Button>
        <Card>
          <CardContent className="pt-6 space-y-3">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-lg" />
              <div className="space-y-1.5">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
            </div>
            <Skeleton className="h-9 w-44" />
            <div className="flex gap-6">
              <div className="space-y-1">
                <p className="text-sm text-[#A09080] dark:text-stone-400">
                  {t("accounts.detail.incomeTotal")}
                </p>
                <Skeleton className="h-6 w-24" />
              </div>
              <div className="space-y-1">
                <p className="text-sm text-[#A09080] dark:text-stone-400">
                  {t("accounts.detail.expenseTotal")}
                </p>
                <Skeleton className="h-6 w-24" />
              </div>
            </div>
          </CardContent>
        </Card>
        <div className="overflow-x-auto rounded-lg border border-[#D4C9B0] dark:border-stone-700 bg-[#FDFAF4] dark:bg-stone-900/60">
          <table className="min-w-full text-sm">
            <thead className="bg-[#F5F0E8] dark:bg-stone-800/80">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-[#A09080] dark:text-stone-400">{t("transactions.list.columns.date")}</th>
                <th className="px-4 py-2 text-left font-medium text-[#A09080] dark:text-stone-400">{t("transactions.list.columns.type")}</th>
                <th className="px-4 py-2 text-right font-medium text-[#A09080] dark:text-stone-400">{t("transactions.list.columns.amount")}</th>
                <th className="px-4 py-2 text-left font-medium text-[#A09080] dark:text-stone-400">{t("transactions.list.columns.category")}</th>
              </tr>
            </thead>
            <tbody>
              {[1, 2, 3, 4, 5].map((i) => (
                <tr key={i} className="border-t border-[#D4C9B0] dark:border-stone-800">
                  <td className="px-4 py-2"><Skeleton className="h-4 w-28" /></td>
                  <td className="px-4 py-2"><Skeleton className="h-5 w-16 rounded-full" /></td>
                  <td className="px-4 py-2 text-right"><Skeleton className="ml-auto h-4 w-16" /></td>
                  <td className="px-4 py-2"><Skeleton className="h-4 w-20" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (error === "notFound" || (!loading && !account)) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" asChild>
          <Link href="/dashboard/accounts" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            {t("accounts.detail.backToAccounts")}
          </Link>
        </Button>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Landmark className="mb-3 h-12 w-12 text-zinc-400" />
            <p className="text-sm text-[#A09080] dark:text-stone-400">
              {t("accounts.detail.notFound")}
            </p>
            <Button asChild className="mt-4">
              <Link href="/dashboard/accounts">{t("accounts.detail.backToAccounts")}</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !account) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" asChild>
          <Link href="/dashboard/accounts" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            {t("accounts.detail.backToAccounts")}
          </Link>
        </Button>
        <p className="text-sm text-red-600 dark:text-red-400">{error ?? t("accounts.loadFailed")}</p>
      </div>
    );
  }

  const TypeIcon = ACCOUNT_TYPE_ICONS[account.type] ?? PiggyBank;
  const bankLogoUrl = account.bankName ? getBankLogoUrl(account.bankName) : null;

  return (
    <div className="space-y-6">
      {/* AccountHeader */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/accounts" aria-label={t("accounts.detail.backToAccounts")}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="flex items-center gap-3">
            {bankLogoUrl ? (
              <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-[#E8E0C8] p-1 dark:bg-stone-700">
                <Image
                  src={bankLogoUrl}
                  alt=""
                  width={36}
                  height={36}
                  className="h-full w-full object-contain"
                />
              </div>
            ) : (
              <TypeIcon className="h-10 w-10 text-[#A09080]" />
            )}
            <div>
              <h1 className="text-xl font-semibold">{account.name}</h1>
              <div className="flex items-center gap-2 text-sm text-[#A09080] dark:text-stone-400">
                <span>
                  {t(`accounts.type.${account.type}`) ?? account.type}
                  {account.bankName &&
                    ` · ${getBankDisplayName(account.bankName, localeKey === "th" ? "th" : "en") ?? account.bankName}`}
                </span>
                {account.type === "CREDIT_CARD" && account.cardNetwork && (
                  <span
                    title={
                      getCardNetworkDisplayName(
                        account.cardNetwork,
                        localeKey === "th" ? "th" : "en"
                      ) ?? undefined
                    }
                  >
                    <CardNetworkIcon id={account.cardNetwork} size={16} />
                  </span>
                )}
                {account.isDefault && (
                  <span className="rounded-full bg-[#D4C9B0] px-2 py-0.5 text-xs dark:bg-stone-700">
                    {t("accounts.default")}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
        {/* QuickActions */}
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={openEditModal} className="gap-2">
            <Pencil className="h-4 w-4" />
            {t("common.actions.edit")}
          </Button>
          {account.type === "CREDIT_CARD" && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={openPaymentDialog}
                disabled={account.isIncomplete}
                className="gap-2"
              >
                <BanknoteIcon className="h-4 w-4" />
                {t("accounts.pay")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCloseStatement}
                disabled={account.isIncomplete}
                className="gap-2"
              >
                <FileText className="h-4 w-4" />
                {t("accounts.closeStatement")}
              </Button>
            </>
          )}
          <Button variant="outline" size="sm" onClick={handleMarkChecked} className="gap-2">
            <CheckCircle className="h-4 w-4" />
            {t("accounts.markChecked")}
          </Button>
        </div>
      </div>

      {/* AccountInfoCard with SummaryStats */}
      <div className="relative overflow-hidden rounded-3xl border-2 border-emerald-500/10 bg-[#FDFAF4] p-6 text-left dark:border-emerald-500/20 dark:bg-stone-900/80">
        <div className="absolute -top-6 -right-6 h-28 w-28 rounded-full bg-emerald-600 opacity-[0.07] dark:bg-emerald-500" />
        <div className="relative flex items-center gap-4 mb-5">
          {bankLogoUrl ? (
            <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-[#E8E0C8] p-2 dark:bg-stone-700">
              <Image
                src={bankLogoUrl}
                alt=""
                width={48}
                height={48}
                className="h-full w-full object-contain"
              />
            </div>
          ) : (
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20">
              <TypeIcon className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
            </div>
          )}
          <div>
            <p className="text-lg font-semibold text-[#3D3020] dark:text-stone-200">
              {account.name}
            </p>
            <p className="text-sm text-[#A09080] dark:text-stone-400">
              {t(`accounts.type.${account.type}`) ?? account.type}
            </p>
          </div>
        </div>
        <p className="text-sm mb-1 text-[#A09080] dark:text-stone-400">
          {account.type === "CREDIT_CARD"
            ? t("accounts.currentOutstanding")
            : t("summary.balance")} 
        </p>
        <p
          className={`text-3xl font-extrabold tabular-nums tracking-tight ${
            account.type === "CREDIT_CARD"
              ? "text-red-700 dark:text-red-300"
              : "text-emerald-600 dark:text-emerald-400"
          }`}
        >
          {formatAmount(
            account.type === "CREDIT_CARD"
              ? (account.currentOutstanding ?? Math.abs(account.balance))
              : account.balance
          )} 
        </p>
        {account.type === "CREDIT_CARD" && (
          <div className="mt-3 grid gap-3 text-base sm:grid-cols-2">
            {account.creditLimit != null && (
              <p>
                <span className="text-sm text-[#A09080] dark:text-stone-400">
                  {t("accounts.creditLimit")}:
                </span>{" "}
                <span className="font-medium">{formatAmount(account.creditLimit)}</span>
              </p>
            )}
            {account.availableCredit != null && (
              <p>
                <span className="text-sm text-[#A09080] dark:text-stone-400">
                  {t("accounts.availableCredit")}:
                </span>{" "}
                <span className="font-medium">{formatAmount(account.availableCredit)}</span>
              </p>
            )}
            {account.latestStatement && (
              <p>
                <span className="text-sm text-[#A09080] dark:text-stone-400">
                  {t("accounts.dueDate")}:
                </span>{" "}
                <span className="font-medium">{account.latestStatement.dueDate}</span>
              </p>
            )}
          </div>
        )}
        {account.type !== "CREDIT_CARD" && (
          <>
            {account.lastTransactionDate && (
              <CardDescription className="mt-2 text-sm">
                {t("accounts.lastTransaction")}:{" "}
                {formatDate(account.lastTransactionDate, locale)}
              </CardDescription>
            )}
            {account.lastCheckedAt && (
              <CardDescription className="text-sm">
                {t("accounts.lastChecked")}: {formatDate(account.lastCheckedAt, locale)}
              </CardDescription>
            )}
          </>
        )}
        <div className="mt-5 flex gap-6 border-t border-[#DDD5BB] pt-5 dark:border-stone-700">
          <div>
            <p className="text-sm text-[#A09080] dark:text-stone-400">
              {t("accounts.detail.incomeTotal")}
            </p>
            {summaryLoading ? (
              <Skeleton className="h-6 w-24" />
            ) : (
              <p className="text-lg font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                {formatAmount(summary?.income ?? 0)}
              </p>
            )}
          </div>
          <div>
            <p className="text-sm text-[#A09080] dark:text-stone-400">
              {t("accounts.detail.expenseTotal")}
            </p>
            {summaryLoading ? (
              <Skeleton className="h-6 w-24" />
            ) : (
              <p className="text-lg font-semibold tabular-nums text-amber-700 dark:text-amber-400">
                {formatAmount(summary?.expense ?? 0)}
              </p>
            )}
          </div>
          <div className="ml-auto">
            <p className="text-sm text-[#A09080] dark:text-stone-400">
              {t("accounts.detail.transactionCount")}
            </p>
            <p className="text-lg font-semibold text-[#3D3020] dark:text-stone-200">
              {account.transactionCount ?? 0}
            </p>
          </div>
        </div>
      </div>

      {/* TransactionList */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-base">{t("accounts.detail.transactions")}</CardTitle>
          </div>
      <Card>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <DateRangePicker
              id="tx-date-range"
              label={t("dataTools.export.dateRange")}
              value={{ from: txFilterFrom, to: txFilterTo }}
              onChange={(v) => {
                setTxFilterFrom(v.from ?? "");
                setTxFilterTo(v.to ?? "");
              }}
              placeholder={t("dataTools.export.dateRangePlaceholder")}
              className="min-w-[200px]"
            />
            <div className="min-w-[120px] space-y-1">
              <label htmlFor="tx-type" className="block text-xs font-medium text-[#6B5E4E] dark:text-stone-400">
                {t("dataTools.export.type")}
              </label>
              <select
                id="tx-type"
                value={txFilterType}
                onChange={(e) =>
                  setTxFilterType(e.target.value as "all" | "INCOME" | "EXPENSE" | "TRANSFER")
                }
                className="h-9 w-full rounded-md border border-[#D4C9B0] px-3 text-sm dark:border-stone-600 dark:bg-stone-900 dark:text-stone-100"
              >
                <option value="all">{t("dataTools.export.typeAll")}</option>
                <option value="INCOME">{t("transactions.common.income")}</option>
                <option value="EXPENSE">{t("transactions.common.expense")}</option>
                <option value="TRANSFER">{t("transactions.common.transfer")}</option>
              </select>
            </div>
            <Button size="sm" onClick={applyTxFilters}>
              {t("transactions.list.applyFilters")}
            </Button>
          </div>

          
        </CardContent>
      </Card>

      {txLoading ? (
            <div className="overflow-x-auto rounded-lg border border-[#D4C9B0] dark:border-stone-700 bg-[#FDFAF4] dark:bg-stone-900/60">
              <table className="min-w-full text-sm">
                <thead className="bg-[#F5F0E8] dark:bg-stone-800/80">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium text-[#A09080] dark:text-stone-400">{t("transactions.list.columns.date")}</th>
                    <th className="px-4 py-2 text-left font-medium text-[#A09080] dark:text-stone-400">{t("transactions.list.columns.type")}</th>
                    <th className="px-4 py-2 text-right font-medium text-[#A09080] dark:text-stone-400">{t("transactions.list.columns.amount")}</th>
                    <th className="px-4 py-2 text-left font-medium text-[#A09080] dark:text-stone-400">{t("transactions.list.columns.category")}</th>
                  </tr>
                </thead>
                <tbody>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <tr key={i} className="border-t border-[#D4C9B0] dark:border-stone-800">
                      <td className="px-4 py-2"><Skeleton className="h-4 w-28" /></td>
                      <td className="px-4 py-2"><Skeleton className="h-5 w-16 rounded-full" /></td>
                      <td className="px-4 py-2 text-right"><Skeleton className="ml-auto h-4 w-16" /></td>
                      <td className="px-4 py-2"><Skeleton className="h-4 w-20" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : transactions.length === 0 ? (
            <p className="py-8 text-center text-sm text-[#A09080] dark:text-stone-400">
              {t("transactions.list.empty")}
            </p>
          ) : (
            <>
              <div className="overflow-x-auto rounded-lg border border-[#D4C9B0] dark:border-stone-700 bg-[#FDFAF4] dark:bg-stone-900/60">
                <table className="min-w-full text-sm">
                  <thead className="bg-[#F5F0E8] dark:bg-stone-800/80">
                    <tr>
                      <th className="px-4 py-2 text-left font-medium text-[#A09080] dark:text-stone-400">
                        {t("transactions.list.columns.date")}
                      </th>
                      <th className="px-4 py-2 text-left font-medium text-[#A09080] dark:text-stone-400">
                        {t("transactions.list.columns.account")}
                      </th>
                      <th className="px-4 py-2 text-left font-medium text-[#A09080] dark:text-stone-400">
                        {t("transactions.list.columns.type")}
                      </th>
                      <th className="px-4 py-2 text-right font-medium text-[#A09080] dark:text-stone-400">
                        {t("transactions.list.columns.amount")}
                      </th>
                      <th className="px-4 py-2 text-left font-medium text-[#A09080] dark:text-stone-400">
                        {t("transactions.list.columns.category")}
                      </th>
                      <th className="px-4 py-2 text-left font-medium text-[#A09080] dark:text-stone-400">
                        {t("transactions.list.columns.note")}
                      </th>
                      <th className="w-0 px-2 py-2 text-right font-medium text-[#A09080] dark:text-stone-400">
                        {t("common.actions.edit")} / {t("common.actions.delete")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((tx) => {
                      const isIncome = tx.type === "INCOME";
                      const isTransfer = tx.type === "TRANSFER";
                      const accountDisplay =
                        isTransfer && tx.transferAccount
                          ? t("transactions.list.transferTo", {
                            account: tx.transferAccount.name,
                          })
                          : tx.financialAccount?.name ?? "—";
                      return (
                        <tr
                          key={tx.id}
                          className="border-t border-[#D4C9B0] dark:border-stone-800"
                        >
                          <td className="px-4 py-2 text-[#3D3020] dark:text-stone-100">
                            {formatDateTime(tx.occurredAt, locale)}
                          </td>
                          <td className="px-4 py-2 text-[#3D3020] dark:text-stone-200">
                            {isTransfer ? (
                              <>
                                {tx.financialAccount?.name ?? "—"} → {accountDisplay}
                              </>
                            ) : (
                              accountDisplay
                            )}
                          </td>
                          <td className="px-4 py-2">
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${isIncome
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
                          <td className="px-4 py-2 text-right tabular-nums text-zinc-900 dark:text-zinc-50">
                            {formatAmount(tx.amount)}
                          </td>
                          <td className="px-4 py-2 text-[#3D3020] dark:text-stone-200">
                            {getCategoryDisplayName(
                              tx.categoryRef?.name ?? tx.category ?? "",
                              localeKey
                            ) || "—"}
                          </td>
                          <td className="px-4 py-2 text-[#6B5E4E] dark:text-stone-300">
                            {tx.note
                              ? tx.note.length > 60
                                ? `${tx.note.slice(0, 57)}…`
                                : tx.note
                              : "—"}
                          </td>
                          <td className="px-2 py-2 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openTxEdit(tx)}
                                aria-label={t("common.actions.edit")}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openTxDelete(tx)}
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
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-[#A09080] dark:text-stone-400">
                  {t("transactions.list.pageInfo", {
                    from: txOffset + 1,
                    to: txOffset + transactions.length,
                  })}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={goPrev}
                    disabled={txOffset === 0}
                    className="gap-1"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    {t("transactions.list.prev")}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={goNext}
                    disabled={transactions.length < PAGE_SIZE}
                    className="gap-1"
                  >
                    {t("transactions.list.next")}
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}

      <FinancialAccountFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        editId={account.id}
        onSuccess={() => {
          void fetchAccount();
          void fetchSummary();
        }}
      />

      {account.type === "CREDIT_CARD" && (
        <CreditCardPaymentDialog
          open={paymentDialogOpen}
          onOpenChange={(open) => {
            setPaymentDialogOpen(open);
          }}
          accountId={account.id}
          accountName={account.name}
          maxAmount={account.currentOutstanding}
          onSuccess={() => {
            void fetchAccount();
            void fetchSummary();
          }}
        />
      )}

      <TransactionFormDialog
        open={txFormOpen}
        onOpenChange={setTxFormOpen}
        editId={txFormEditId}
        initialDate={txFormInitialDate}
        onSuccess={refreshAll}
      />

      <TransactionDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        transaction={deleteTransaction}
        onConfirm={refreshAll}
      />
    </div>
  );
}
