"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Landmark,
  Plus,
  Pencil,
  AlertTriangle,
  Wallet,
  CreditCard,
  Banknote,
  PiggyBank,
  MoreHorizontal,
  BanknoteIcon,
  FileText,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  Trash2,
  CheckCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  formatAmount,
  formatCardNumber,
  formatBankAccountNumber,
} from "@/lib/format";
import Image from "next/image";
import { getBankDisplayName, getBankLogoUrl } from "@/lib/thai-banks";
import { getFullCardTypeDisplayName, getCardNetworkDisplayName } from "@/lib/card-types";
import { CardNetworkIcon } from "@/components/dashboard/card-type-select";
import { useI18n } from "@/hooks/use-i18n";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { FinancialAccountFormDialog } from "@/components/dashboard/financial-account-form-dialog";
import { CreditCardPaymentDialog } from "@/components/dashboard/credit-card-payment-dialog";
import { toast } from "sonner";

type FinancialAccount = {
  id: string;
  name: string;
  type: string;
  initialBalance: number;
  isActive: boolean;
  isDefault: boolean;
  isHidden?: boolean;
  lastCheckedAt: string | null;
  transactionCount?: number;
  balance: number;
  lastTransactionDate: string | null;
  daysSinceLastTransaction: number | null;
  daysSinceLastChecked: number | null;
  needsAttention: boolean;
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
  accountNumberMasked?: string;
  accountNumberMode?: string | null;
  interestRate?: number | null;
  cardAccountType?: string | null;
  cardNetwork?: string | null;
  isIncomplete?: boolean;
};

const ACCOUNT_TYPE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  BANK: Landmark,
  CREDIT_CARD: CreditCard,
  WALLET: Wallet,
  CASH: Banknote,
  OTHER: PiggyBank,
};

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

export default function AccountsPage() {
  const { t, locale } = useI18n();
  const [accounts, setAccounts] = useState<FinancialAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formEditId, setFormEditId] = useState<string | null>(null);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentAccount, setPaymentAccount] = useState<FinancialAccount | null>(null);
  const [revealedAccountIds, setRevealedAccountIds] = useState<Set<string>>(new Set());
  const [fullAccountNumbers, setFullAccountNumbers] = useState<Record<string, string>>({});
  const [expandedCreditCardIds, setExpandedCreditCardIds] = useState<Set<string>>(new Set());
  const [deleteAccount, setDeleteAccount] = useState<FinancialAccount | null>(null);
  const [deletePending, setDeletePending] = useState(false);
  const [deleteConfirmValue, setDeleteConfirmValue] = useState("");
  const [deleteExpectedValue, setDeleteExpectedValue] = useState("");
  const [copiedAccountId, setCopiedAccountId] = useState<string | null>(null);
  const [hoveredAccountId, setHoveredAccountId] = useState<string | null>(null);

  async function fetchAccounts() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/financial-accounts", { cache: "no-store" });
      if (!res.ok) {
        if (res.status === 401) {
          setError(t("common.errors.unauthenticated"));
        } else {
          setError(t("accounts.loadFailed"));
        }
        setAccounts([]);
        return;
      }
      const data = (await res.json()) as FinancialAccount[];
      setAccounts(Array.isArray(data) ? data : []);
    } catch {
      setError(t("accounts.loadFailed"));
      setAccounts([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void fetchAccounts();
  }, []);

  function openCreateModal() {
    setFormEditId(null);
    setFormOpen(true);
  }

  function openEditModal(acc: FinancialAccount) {
    setFormEditId(acc.id);
    setFormOpen(true);
  }

  async function handleCheck(acc: FinancialAccount) {
    try {
      await fetch(`/api/financial-accounts/${acc.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lastCheckedAt: new Date().toISOString() }),
      });
      void fetchAccounts();
    } catch {
      // ignore
    }
  }

  async function handleCloseStatement(acc: FinancialAccount) {
    if (acc.isIncomplete) {
      toast.error(
        t("accounts.incompleteAccountCannotUse") ??
          "Please complete account setup (bank and account number) before using."
      );
      openEditModal(acc);
      return;
    }
    if (
      acc.type === "CREDIT_CARD" &&
      (acc.statementClosingDay == null || acc.dueDay == null)
    ) {
      toast.error(
        t("accounts.closeStatementConfigRequired") ??
          "Please set statement closing day and due day in account settings first."
      );
      openEditModal(acc);
      return;
    }
    const now = new Date();
    let closingDateStr: string;
    if (acc.statementClosingDay != null) {
      const today = now.getDate();
      let closingDate: Date;
      if (today >= acc.statementClosingDay) {
        closingDate = new Date(
          now.getFullYear(),
          now.getMonth(),
          acc.statementClosingDay
        );
      } else {
        closingDate = new Date(
          now.getFullYear(),
          now.getMonth() - 1,
          acc.statementClosingDay
        );
      }
      closingDateStr = closingDate.toISOString().slice(0, 10);
    } else {
      closingDateStr = now.toISOString().slice(0, 10);
    }
    try {
      const res = await fetch(`/api/credit-card/${acc.id}/close-statement`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ closingDate: closingDateStr }),
      });
      if (res.ok) {
        toast.success(t("accounts.closeStatementSuccess") ?? "Statement closed.");
        void fetchAccounts();
      } else {
        const data = (await res.json()) as { error?: string };
        toast.error(data.error ?? t("accounts.loadFailed"));
      }
    } catch {
      toast.error(t("accounts.loadFailed"));
    }
  }

  function openPaymentDialog(acc: FinancialAccount) {
    if (acc.isIncomplete) {
      toast.error(
        t("accounts.incompleteAccountCannotUse") ??
          "Please complete account setup (bank and account number) before using."
      );
      openEditModal(acc);
      return;
    }
    setPaymentAccount(acc);
    setPaymentDialogOpen(true);
  }

  async function handleToggleHideDefault(acc: FinancialAccount) {
    if (!acc.isDefault) return;
    try {
      const res = await fetch(`/api/financial-accounts/${acc.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isHidden: !acc.isHidden }),
      });
      if (res.ok) {
        void fetchAccounts();
      } else {
        const data = (await res.json()) as { error?: string };
        toast.error(data.error ?? t("accounts.loadFailed"));
      }
    } catch {
      toast.error(t("accounts.loadFailed"));
    }
  }

  function generateRandomConfirmationCode(): string {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let result = "";
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  function openDeleteDialog(acc: FinancialAccount) {
    if (acc.isDefault) {
      toast.error(t("accounts.cannotDeleteDefault"));
      return;
    }
    setDeleteAccount(acc);
    setDeleteConfirmValue("");
    setDeleteExpectedValue(generateRandomConfirmationCode());
  }

  const deleteConfirmMatches =
    deleteExpectedValue &&
    deleteConfirmValue.toUpperCase() === deleteExpectedValue;

  async function handleDeleteConfirm() {
    if (!deleteAccount || deletePending) return;
    setDeletePending(true);
    try {
      const res = await fetch(`/api/financial-accounts/${deleteAccount.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success(t("accounts.deleteSuccess"));
        setDeleteAccount(null);
        void fetchAccounts();
      } else {
        const data = (await res.json()) as { error?: string };
        toast.error(data.error ?? t("accounts.loadFailed"));
      }
    } catch {
      toast.error(t("accounts.loadFailed"));
    } finally {
      setDeletePending(false);
    }
  }

  async function handleShowDefault(hiddenDefaultId: string) {
    try {
      const res = await fetch(`/api/financial-accounts/${hiddenDefaultId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isHidden: false }),
      });
      if (res.ok) {
        void fetchAccounts();
      } else {
        const data = (await res.json()) as { error?: string };
        toast.error(data.error ?? t("accounts.loadFailed"));
      }
    } catch {
      toast.error(t("accounts.loadFailed"));
    }
  }

  function toggleCreditCardDetails(accId: string) {
    setExpandedCreditCardIds((prev) => {
      const next = new Set(prev);
      if (next.has(accId)) next.delete(accId);
      else next.add(accId);
      return next;
    });
  }

  async function toggleRevealAccountNumber(acc: FinancialAccount) {
    const id = acc.id;
    const isRevealed = revealedAccountIds.has(id);
    if (isRevealed) {
      setRevealedAccountIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      return;
    }
    if (fullAccountNumbers[id]) {
      setRevealedAccountIds((prev) => new Set(prev).add(id));
      return;
    }
    try {
      const res = await fetch(`/api/financial-accounts/${id}`);
      if (!res.ok) return;
      const data = (await res.json()) as { accountNumber?: string | null };
      const num = data.accountNumber ?? "";
      setFullAccountNumbers((prev) => ({ ...prev, [id]: num }));
      setRevealedAccountIds((prev) => new Set(prev).add(id));
    } catch {
      // ignore
    }
  }

  async function handleCopyAccountNumber(acc: FinancialAccount) {
    const raw = fullAccountNumbers[acc.id];
    if (!raw) return;
    const toCopy = String(raw).replace(/\D/g, "");
    try {
      await navigator.clipboard.writeText(toCopy);
      setCopiedAccountId(acc.id);
      setTimeout(() => {
        setCopiedAccountId(null);
        setHoveredAccountId((prev) => (prev === acc.id ? null : prev));
      }, 1500);
    } catch {
      toast.error(t("common.errors.generic"));
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="mt-1 text-sm text-[#6B5E4E] dark:text-stone-400">
            {t("accounts.subtitle")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href="/dashboard/accounts/trash" className="gap-2">
              <Trash2 className="h-4 w-4" />
              {t("accounts.viewTrash")}
            </Link>
          </Button>
          <Button onClick={openCreateModal} className="gap-2">
            <Plus className="h-4 w-4" />
            {t("accounts.newAccount")}
          </Button>
        </div>
      </div>

      {loading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 rounded-lg" />
          ))}
        </div>
      )}

      {error && !loading && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      {!loading && !error && accounts.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Landmark className="mb-3 h-12 w-12 text-zinc-400" />
            <p className="text-sm text-[#A09080] dark:text-stone-400">
              {t("accounts.empty")}
            </p>
            <Button onClick={openCreateModal} className="mt-4">
              {t("accounts.newAccount")}
            </Button>
          </CardContent>
        </Card>
      )}

      {!loading && !error && accounts.length > 0 && (
        <div className="space-y-8">
          {(() => {
            const hiddenDefault = accounts.find((a) => a.isDefault && a.isHidden);
            const regularAccounts = accounts.filter(
              (a) => a.type !== "CREDIT_CARD" && !a.isHidden
            );
            const creditCards = accounts.filter(
              (a) => a.type === "CREDIT_CARD" && !a.isHidden
            );
            const renderCard = (acc: FinancialAccount) => {
              const TypeIcon = ACCOUNT_TYPE_ICONS[acc.type] ?? PiggyBank;
              const bankLogoUrl = acc.bankName ? getBankLogoUrl(acc.bankName) : null;
              return (
              <Card
                key={acc.id}
                className={`relative overflow-hidden ${
                  acc.needsAttention ? "ring-2 ring-amber-400/50 dark:ring-amber-500/50" : ""
                } ${acc.isIncomplete ? "ring-2 ring-red-400/50 dark:ring-red-500/50" : ""}`}
              >
                {acc.isIncomplete && (
                  <div
                    className="absolute right-2 top-2"
                    title={t("accounts.incompleteAccount")}
                  >
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                  </div>
                )}
                {acc.needsAttention && !acc.isIncomplete && (
                  <div className="absolute right-2 top-2" title={t("accounts.needsAttention")}>
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                  </div>
                )}
                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-2">
                      {bankLogoUrl ? (
                        <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-lg bg-[#E8E0C8] p-1 dark:bg-stone-700">
                          <Image
                            src={bankLogoUrl}
                            alt=""
                            width={28}
                            height={28}
                            className="h-full w-full object-contain"
                          />
                        </div>
                      ) : (
                        <TypeIcon className="h-5 w-5 text-[#A09080]" />
                      )}
                      <CardTitle className="text-base">{acc.name}</CardTitle>
                      {acc.type === "CREDIT_CARD" && acc.cardNetwork && (
                        <div
                          className="flex shrink-0 items-center"
                          title={
                            getCardNetworkDisplayName(
                              acc.cardNetwork,
                              locale?.startsWith("th") ? "th" : "en"
                            ) ?? undefined
                          }
                        >
                          <CardNetworkIcon id={acc.cardNetwork} size={18} />
                        </div>
                      )}
                    </div>
                    {(acc.bankName || acc.accountNumberMasked) && (
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs text-[#A09080] dark:text-stone-400">
                          {(() => {
                            const bankLabel =
                              getBankDisplayName(
                                acc.bankName ?? undefined,
                                locale?.startsWith("th") ? "th" : "en"
                              ) ?? acc.bankName;
                            const networkLabel =
                              acc.type === "CREDIT_CARD" && acc.cardNetwork
                                ? getCardNetworkDisplayName(
                                    acc.cardNetwork,
                                    locale?.startsWith("th") ? "th" : "en"
                                  )
                                : null;
                            const isRevealed =
                              revealedAccountIds.has(acc.id) && fullAccountNumbers[acc.id];
                            const numberDisplay = isRevealed ? (
                              <TooltipProvider key={acc.id} delayDuration={0}>
                                <Tooltip
                                  open={
                                    hoveredAccountId === acc.id ||
                                    copiedAccountId === acc.id
                                  }
                                  onOpenChange={(open) => {
                                    if (!open) {
                                      setHoveredAccountId(null);
                                      setCopiedAccountId(null);
                                    }
                                  }}
                                >
                                  <TooltipTrigger asChild>
                                    <span
                                      role="button"
                                      tabIndex={0}
                                      className="cursor-pointer hover:underline"
                                      onClick={() => handleCopyAccountNumber(acc)}
                                      onMouseEnter={() =>
                                        setHoveredAccountId(acc.id)
                                      }
                                      onMouseLeave={() =>
                                        setHoveredAccountId(null)
                                      }
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter" || e.key === " ") {
                                          e.preventDefault();
                                          handleCopyAccountNumber(acc);
                                        }
                                      }}
                                    >
                                      {acc.type === "CREDIT_CARD"
                                        ? formatCardNumber(fullAccountNumbers[acc.id])
                                        : formatBankAccountNumber(
                                            fullAccountNumbers[acc.id]
                                          )}
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" sideOffset={4}>
                                    {copiedAccountId === acc.id
                                      ? t("common.actions.copied")
                                      : t("accounts.clickToCopy")}
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            ) : (
                              acc.accountNumberMasked
                            );
                            return (
                              <>
                                {bankLabel}
                                {bankLabel && networkLabel && " · "}
                                {networkLabel}
                                {(bankLabel || networkLabel) && numberDisplay && " · "}
                                {numberDisplay}
                              </>
                            );
                          })()}
                        </p>
                        {acc.accountNumberMasked &&
                          acc.accountNumberMode === "FULL" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 shrink-0 text-[#A09080] hover:text-[#3D3020] dark:hover:text-stone-300"
                              onClick={() => toggleRevealAccountNumber(acc)}
                              title={
                                revealedAccountIds.has(acc.id)
                                  ? t("accounts.hideAccountNumber")
                                  : t("accounts.showAccountNumber")
                              }
                            >
                              {revealedAccountIds.has(acc.id) ? (
                                <EyeOff className="h-3.5 w-3.5" />
                              ) : (
                                <Eye className="h-3.5 w-3.5" />
                              )}
                            </Button>
                          )}
                      </div>
                    )}
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openEditModal(acc)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        {t("common.actions.edit")}
                      </DropdownMenuItem>
                      {acc.isDefault && (
                        <DropdownMenuItem
                          onClick={() => handleToggleHideDefault(acc)}
                        >
                          {acc.isHidden ? (
                            <>
                              <Eye className="mr-2 h-4 w-4" />
                              {t("accounts.showDefaultAccount")}
                            </>
                          ) : (
                            <>
                              <EyeOff className="mr-2 h-4 w-4" />
                              {t("accounts.hideDefaultAccount")}
                            </>
                          )}
                        </DropdownMenuItem>
                      )}
                      {acc.type === "CREDIT_CARD" && (
                        <>
                          <DropdownMenuItem
                            onClick={() => openPaymentDialog(acc)}
                            disabled={acc.isIncomplete}
                          >
                            <BanknoteIcon className="mr-2 h-4 w-4" />
                            {t("accounts.pay")}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleCloseStatement(acc)}
                            disabled={acc.isIncomplete}
                          >
                            <FileText className="mr-2 h-4 w-4" />
                            {t("accounts.closeStatement")}
                          </DropdownMenuItem>
                        </>
                      )}
                      <DropdownMenuItem onClick={() => handleCheck(acc)}>
                        <CheckCircle className="mr-2 h-4 w-4" />
                        {t("accounts.markChecked")}
                      </DropdownMenuItem>
                      {!acc.isDefault && (
                        <DropdownMenuItem
                          onClick={() => openDeleteDialog(acc)}
                          className="text-red-600 focus:text-red-600 dark:text-red-400 dark:focus:text-red-400"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          {t("accounts.delete")}
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardHeader>
                <CardContent>
                  {acc.isIncomplete && (
                    <div className="mb-3 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-950/50 dark:text-red-300">
                      {acc.type === "CREDIT_CARD"
                        ? t("accounts.incompleteCreditCardWarning")
                        : t("accounts.incompleteAccountWarning")}
                    </div>
                  )}
                  {acc.type === "CREDIT_CARD" ? (
                    <>
                      <p className="text-2xl font-bold tabular-nums text-red-700 dark:text-red-300">
                        {formatAmount(acc.currentOutstanding ?? Math.abs(acc.balance))}
                      </p>
                      <p className="mt-1 text-xs text-[#A09080] dark:text-stone-400">
                        {t("accounts.currentOutstanding")}
                      </p>
                      <button
                        type="button"
                        onClick={() => toggleCreditCardDetails(acc.id)}
                        className="mt-2 flex w-full items-center justify-center gap-1 rounded-md py-1.5 text-xs text-[#A09080] transition-colors hover:bg-[#F5F0E8] hover:text-[#3D3020] dark:hover:bg-stone-800 dark:hover:text-stone-300"
                        title={
                          expandedCreditCardIds.has(acc.id)
                            ? t("accounts.hideDetails")
                            : t("accounts.showDetails")
                        }
                      >
                        {expandedCreditCardIds.has(acc.id) ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                        <span>
                          {expandedCreditCardIds.has(acc.id)
                            ? t("accounts.hideDetails")
                            : t("accounts.showDetails")}
                        </span>
                      </button>
                      <div
                        className="grid transition-[grid-template-rows] duration-200 ease-in-out"
                        style={{
                          gridTemplateRows: expandedCreditCardIds.has(acc.id) ? "1fr" : "0fr",
                        }}
                      >
                        <div className="min-h-0 overflow-hidden">
                          <div className="mt-2 space-y-1 text-xs">
                            {acc.creditLimit != null && (
                              <p>
                                {t("accounts.creditLimit")}: {formatAmount(acc.creditLimit)}
                              </p>
                            )}
                            {acc.availableCredit != null && (
                              <p>
                                {t("accounts.availableCredit")}: {formatAmount(acc.availableCredit)}
                              </p>
                            )}
                            {acc.latestStatement && (
                              <>
                                <p>
                                  {t("accounts.statementBalance")}:{" "}
                                  {formatAmount(
                                    acc.latestStatement.statementBalance - acc.latestStatement.paidAmount
                                  )}
                                </p>
                                <p>
                                  {t("accounts.dueDate")}: {acc.latestStatement.dueDate}
                                </p>
                              </>
                            )}
                            {acc.creditLimit != null &&
                              acc.currentOutstanding != null &&
                              acc.creditLimit > 0 && (
                                <p>
                                  {t("accounts.utilization")}:{" "}
                                  {Math.round(
                                    (acc.currentOutstanding / acc.creditLimit) * 100
                                  )}
                                  %
                                </p>
                              )}
                            {acc.interestRate != null && (
                              <p>
                                {t("accounts.interestRateLabel")}: {acc.interestRate}%
                              </p>
                            )}
                            {(acc.cardAccountType || acc.cardNetwork) && (
                              <p>
                                {t("accounts.cardTypeLabel")}:{" "}
                                {getFullCardTypeDisplayName(
                                  acc.cardAccountType,
                                  acc.cardNetwork,
                                  locale?.startsWith("th") ? "th" : "en"
                                ) ?? "—"}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-3 w-full"
                        onClick={() => openPaymentDialog(acc)}
                        disabled={acc.isIncomplete}
                      >
                        {t("accounts.pay")}
                      </Button>
                    </>
                  ) : (
                    <>
                      <p className="text-2xl font-bold tabular-nums">
                        {formatAmount(acc.balance)}
                      </p>
                      <CardDescription className="mt-1 text-xs">
                        {t("accounts.lastTransaction")}:{" "}
                        {formatDate(acc.lastTransactionDate, locale)}
                      </CardDescription>
                      {acc.lastCheckedAt && (
                        <CardDescription className="text-xs">
                          {t("accounts.lastChecked")}:{" "}
                          {formatDate(acc.lastCheckedAt, locale)}
                        </CardDescription>
                      )}
                      {acc.isDefault && (
                        <span className="mt-2 inline-block rounded-full bg-[#D4C9B0] px-2 py-0.5 text-xs dark:bg-stone-700">
                          {t("accounts.default")}
                        </span>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
              );
            };
            return (
              <>
                {(regularAccounts.length > 0 || hiddenDefault) && (
                  <section>
                    <div className="mb-4 flex items-center justify-between gap-2">
                      <h2 className="flex items-center gap-2 text-lg font-semibold">
                        <Landmark className="h-5 w-5 text-[#A09080]" />
                        {t("accounts.sectionAccounts")}
                      </h2>
                      {hiddenDefault && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => handleShowDefault(hiddenDefault.id)}
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              {t("accounts.showDefaultAccount")}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                    {regularAccounts.length > 0 && (
                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {regularAccounts.map((acc) => renderCard(acc))}
                      </div>
                    )}
                  </section>
                )}
                {creditCards.length > 0 && (
                  <section>
                    <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
                      <CreditCard className="h-5 w-5 text-[#A09080]" />
                      {t("accounts.sectionCreditCards")}
                    </h2>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {creditCards.map((acc) => renderCard(acc))}
                    </div>
                  </section>
                )}
              </>
            );
          })()}
        </div>
      )}

      <FinancialAccountFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        editId={formEditId}
        onSuccess={fetchAccounts}
      />
      {paymentAccount && (
        <CreditCardPaymentDialog
          open={paymentDialogOpen}
          onOpenChange={(open) => {
            setPaymentDialogOpen(open);
            if (!open) setPaymentAccount(null);
          }}
          accountId={paymentAccount.id}
          accountName={paymentAccount.name}
          maxAmount={paymentAccount.currentOutstanding}
          onSuccess={fetchAccounts}
        />
      )}

      <AlertDialog
        open={deleteAccount !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteAccount(null);
            setDeleteConfirmValue("");
            setDeleteExpectedValue("");
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("accounts.deleteConfirmTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteAccount &&
              (deleteAccount.transactionCount ?? 0) > 0
                ? t("accounts.deleteConfirmHasTransactions")
                : t("accounts.deleteConfirmNoTransactions")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteAccount && deleteExpectedValue && (
            <div className="space-y-2">
              <Label htmlFor="delete-confirm-input">
                {t("accounts.deleteConfirmRandomCodeLabel").startsWith("accounts.")
                  ? (locale?.startsWith("th") ? "กรอกรหัสด้านล่างเพื่อยืนยันการลบ" : "Enter the code below to confirm deletion")
                  : t("accounts.deleteConfirmRandomCodeLabel")}
              </Label>
              <p className="select-none rounded-md bg-[#F5F0E8] px-3 py-2 font-mono text-sm dark:bg-stone-800">
                {deleteExpectedValue}
              </p>
              <Input
                id="delete-confirm-input"
                type="text"
                placeholder={t("accounts.deleteConfirmRandomCodePlaceholder").startsWith("accounts.")
                  ? (locale?.startsWith("th") ? "กรอกรหัส" : "Enter code")
                  : t("accounts.deleteConfirmRandomCodePlaceholder")}
                value={deleteConfirmValue}
                onChange={(e) => setDeleteConfirmValue(e.target.value)}
                disabled={deletePending}
                autoComplete="off"
                className="font-mono"
              />
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletePending}>
              {t("common.actions.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDeleteConfirm();
              }}
              disabled={deletePending || !deleteConfirmMatches}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {deletePending ? t("accounts.deletePending") : t("accounts.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
