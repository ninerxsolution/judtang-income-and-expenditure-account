"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Trash2,
  ArrowLeft,
  Landmark,
  CreditCard,
  Wallet,
  Banknote,
  PiggyBank,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatAmount } from "@/lib/format";
import { useI18n } from "@/hooks/use-i18n";
import { toast } from "sonner";

type FinancialAccount = {
  id: string;
  name: string;
  type: string;
  initialBalance: number;
  isActive: boolean;
  isDefault: boolean;
  balance: number;
  lastTransactionDate: string | null;
  transactionCount?: number;
  bankName?: string | null;
  accountNumberMasked?: string;
  creditLimit?: number | null;
  currentOutstanding?: number;
  availableCredit?: number | null;
};

const ACCOUNT_TYPE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  BANK: Landmark,
  CREDIT_CARD: CreditCard,
  WALLET: Wallet,
  CASH: Banknote,
  OTHER: PiggyBank,
};

export default function AccountsTrashPage() {
  const { t } = useI18n();
  const [accounts, setAccounts] = useState<FinancialAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  const fetchAccounts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/financial-accounts?inactive=true");
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
  }, [t]);

  useEffect(() => {
    void fetchAccounts();
  }, [fetchAccounts]);

  async function handleRestore(acc: FinancialAccount) {
    if (restoringId) return;
    setRestoringId(acc.id);
    try {
      const res = await fetch(`/api/financial-accounts/${acc.id}/restore`, {
        method: "PATCH",
      });
      if (res.ok) {
        toast.success(t("accounts.restoreSuccess"));
        setAccounts((prev) => prev.filter((a) => a.id !== acc.id));
      } else {
        const data = (await res.json()) as { error?: string };
        toast.error(data.error ?? t("accounts.restoreFailed"));
      }
    } catch {
      toast.error(t("accounts.restoreFailed"));
    } finally {
      setRestoringId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            {t("accounts.trashSubtitle")}
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/dashboard/accounts" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            {t("accounts.backToAccounts")}
          </Link>
        </Button>
      </div>

      {loading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="opacity-90">
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-5 w-5 rounded" />
                  <Skeleton className="h-5 w-28" />
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <Skeleton className="h-3.5 w-32" />
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-9 w-full rounded-md" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {error && !loading && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      {!loading && !error && accounts.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Trash2 className="mb-3 h-12 w-12 text-zinc-400" />
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {t("accounts.trashEmpty")}
            </p>
            <Button variant="outline" asChild className="mt-4">
              <Link href="/dashboard/accounts" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                {t("accounts.backToAccounts")}
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {!loading && !error && accounts.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {accounts.map((acc) => {
            const TypeIcon = ACCOUNT_TYPE_ICONS[acc.type] ?? PiggyBank;
            const isRestoring = restoringId === acc.id;
            return (
              <Card key={acc.id} className="opacity-90">
                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                  <div className="flex items-center gap-2">
                    <TypeIcon className="h-5 w-5 text-zinc-500" />
                    <CardTitle className="text-base">{acc.name}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    {t(`accounts.type.${acc.type}`)}
                    {acc.transactionCount != null &&
                      acc.transactionCount > 0 && (
                        <>
                          {" · "}
                          {t("accounts.transactionCountLabel", {
                            count: acc.transactionCount,
                          })}
                        </>
                      )}
                  </p>
                  <p className="text-lg font-semibold">
                    {acc.type === "CREDIT_CARD" && acc.currentOutstanding != null
                      ? formatAmount(acc.currentOutstanding)
                      : formatAmount(acc.balance)}
                  </p>
                  <Button
                    onClick={() => handleRestore(acc)}
                    disabled={isRestoring}
                    className="w-full gap-2"
                  >
                    <RotateCcw className="h-4 w-4" />
                    {isRestoring ? "…" : t("accounts.restore")}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
