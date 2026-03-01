"use client";

import { useEffect, useState } from "react";
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
import { Skeleton } from "@/components/ui/skeleton";
import {
  formatAmount,
  formatCardNumber,
  formatBankAccountNumber,
} from "@/lib/format";
import { getBankDisplayName } from "@/lib/thai-banks";
import { getCardTypeDisplayName } from "@/lib/card-types";
import { useI18n } from "@/hooks/use-i18n";
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
  lastCheckedAt: string | null;
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
  interestRate?: number | null;
  cardType?: string | null;
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

  async function fetchAccounts() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/financial-accounts");
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold">
            <Landmark className="h-5 w-5" />
            {t("dashboard.pageTitle.accounts")}
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            {t("accounts.subtitle")}
          </p>
        </div>
        <Button onClick={openCreateModal} className="gap-2">
          <Plus className="h-4 w-4" />
          {t("accounts.newAccount")}
        </Button>
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
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
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
            const regularAccounts = accounts.filter((a) => a.type !== "CREDIT_CARD");
            const creditCards = accounts.filter((a) => a.type === "CREDIT_CARD");
            const renderCard = (acc: FinancialAccount) => {
              const TypeIcon = ACCOUNT_TYPE_ICONS[acc.type] ?? PiggyBank;
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
                      <TypeIcon className="h-5 w-5 text-zinc-500" />
                      <CardTitle className="text-base">{acc.name}</CardTitle>
                    </div>
                    {(acc.bankName || acc.accountNumberMasked) && (
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                          {[
                            getBankDisplayName(acc.bankName ?? undefined, locale?.startsWith("th") ? "th" : "en") ?? acc.bankName,
                            revealedAccountIds.has(acc.id) && fullAccountNumbers[acc.id]
                              ? acc.type === "CREDIT_CARD"
                                ? formatCardNumber(fullAccountNumbers[acc.id])
                                : formatBankAccountNumber(fullAccountNumbers[acc.id])
                              : acc.accountNumberMasked,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                        {acc.accountNumberMasked && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 shrink-0 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
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
                        {t("accounts.markChecked")}
                      </DropdownMenuItem>
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
                      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                        {t("accounts.currentOutstanding")}
                      </p>
                      <button
                        type="button"
                        onClick={() => toggleCreditCardDetails(acc.id)}
                        className="mt-2 flex w-full items-center justify-center gap-1 rounded-md py-1.5 text-xs text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
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
                            {acc.cardType && (
                              <p>
                                {t("accounts.cardTypeLabel")}:{" "}
                                {getCardTypeDisplayName(
                                  acc.cardType,
                                  locale?.startsWith("th") ? "th" : "en"
                                ) ?? acc.cardType}
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
                        <span className="mt-2 inline-block rounded-full bg-zinc-200 px-2 py-0.5 text-xs dark:bg-zinc-700">
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
                {regularAccounts.length > 0 && (
                  <section>
                    <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
                      <Landmark className="h-5 w-5 text-zinc-500" />
                      {t("accounts.sectionAccounts")}
                    </h2>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {regularAccounts.map((acc) => renderCard(acc))}
                    </div>
                  </section>
                )}
                {creditCards.length > 0 && (
                  <section>
                    <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
                      <CreditCard className="h-5 w-5 text-zinc-500" />
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
    </div>
  );
}
