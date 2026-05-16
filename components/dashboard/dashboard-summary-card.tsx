"use client";

import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatAmount } from "@/lib/format";
import { useI18n } from "@/hooks/use-i18n";
import { cn } from "@/lib/utils";

export type DashboardSummaryCardData = {
  balance: number;
  income: number;
  expense: number;
  accountCount: number;
  totalBalanceApproximate?: boolean;
};

type DashboardSummaryCardProps = {
  loading?: boolean;
  data?: DashboardSummaryCardData | null;
  balanceVisible: boolean;
};

const cardSurface =
  "border-0 bg-[#4A5E40] text-white dark:bg-[#3D4F33]";

const labelClass = "text-sm font-medium leading-snug text-white/90";

function MaskedAmount({ hiddenLabel }: { hiddenLabel: string }) {
  return (
    <>
      <span aria-hidden="true">฿ ••••</span>
      <span className="sr-only">{hiddenLabel}</span>
    </>
  );
}

type MetricCellProps = {
  loading: boolean;
  label: string;
  amount: number;
  balanceVisible: boolean;
  hiddenLabel: string;
  tone: "income" | "expense";
};

function MetricCell({
  loading,
  label,
  amount,
  balanceVisible,
  hiddenLabel,
  tone,
}: MetricCellProps) {
  const isIncome = tone === "income";

  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <p className={labelClass}>{label}</p>
      {loading ? (
        <Skeleton className="h-6 w-28 bg-white/15 sm:h-7" />
      ) : (
        <p
          className={cn(
            "text-lg font-semibold tabular-nums leading-none sm:text-xl",
            isIncome ? "text-emerald-200" : "text-red-200",
          )}
        >
          {balanceVisible ? (
            <>฿{formatAmount(amount)}</>
          ) : (
            <MaskedAmount hiddenLabel={hiddenLabel} />
          )}
        </p>
      )}
    </div>
  );
}

export function DashboardSummaryCard({
  loading = false,
  data,
  balanceVisible,
}: DashboardSummaryCardProps) {
  const { t } = useI18n();
  const hiddenLabel = t("dashboard.balance.hidden");

  const balance = data?.balance ?? 0;
  const income = data?.income ?? 0;
  const expense = data?.expense ?? 0;
  const accountCount = data?.accountCount ?? 0;

  const incomeLabel = `${t("dashboard.summary.income")} ${t("dashboard.summary.title")}`;
  const expenseLabel = `${t("dashboard.summary.expense")} ${t("dashboard.summary.title")}`;

  return (
    <Card
      className={cn(
        "relative gap-3 overflow-hidden px-4 py-3.5 shadow-sm sm:gap-3.5 sm:px-5 sm:py-4",
        cardSurface,
      )}
    >
      <div
        className="pointer-events-none absolute right-0 top-0 h-24 w-24 -translate-y-1/2 translate-x-1/2 rounded-full bg-white/10"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute right-8 top-5 h-16 w-16 rounded-full bg-white/5"
        aria-hidden
      />

      <div className="relative flex flex-col gap-1.5">
        <div className="flex items-start justify-between gap-3">
          <p className={labelClass}>{t("dashboard.summary.balance")}</p>
          {loading ? (
            <Skeleton className="h-3 w-24 shrink-0 bg-white/10" />
          ) : (
            <Link
              href="/dashboard/accounts"
              className="shrink-0 text-right text-xs leading-snug text-white/50 transition-colors hover:text-white hover:underline"
            >
              {t("dashboard.summary.fromAllAccounts", { count: accountCount })}
            </Link>
          )}
        </div>
        {loading ? (
          <Skeleton className="h-9 w-44 rounded-md bg-white/20 sm:h-10" />
        ) : (
          <div className="space-y-0.5">
            <p
              className={cn(
                "text-3xl font-bold tabular-nums leading-none tracking-tight sm:text-4xl",
                balance >= 0 ? "text-white" : "text-red-300",
              )}
            >
              {balanceVisible ? (
                <>฿{formatAmount(balance)}</>
              ) : (
                <MaskedAmount hiddenLabel={hiddenLabel} />
              )}
            </p>
            {data?.totalBalanceApproximate ? (
              <p className="text-xs leading-snug text-white/70">
                {t("dashboard.summary.balanceApproximate")}
              </p>
            ) : null}
          </div>
        )}
      </div>

      <div className="relative grid grid-cols-1 gap-y-2.5 sm:grid-cols-2 sm:gap-x-8 sm:gap-y-0">
        <MetricCell
          loading={loading}
          label={incomeLabel}
          amount={income}
          balanceVisible={balanceVisible}
          hiddenLabel={hiddenLabel}
          tone="income"
        />
        <MetricCell
          loading={loading}
          label={expenseLabel}
          amount={expense}
          balanceVisible={balanceVisible}
          hiddenLabel={hiddenLabel}
          tone="expense"
        />
      </div>
    </Card>
  );
}
