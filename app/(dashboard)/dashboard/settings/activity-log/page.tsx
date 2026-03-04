"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { DatePicker } from "@/components/ui/date-picker";
import { Skeleton } from "@/components/ui/skeleton";
import { useI18n } from "@/hooks/use-i18n";

type ActivityLogEntry = {
  id: string;
  userId: string;
  userDisplayName?: string;
  action: string;
  entityType: string | null;
  entityId: string | null;
  details: Record<string, unknown> | null;
  createdAt: string;
};

const ENTITY_TYPES = [
  { value: "", labelKey: "all" },
  { value: "user", labelKey: "user" },
  { value: "session", labelKey: "session" },
  { value: "transaction", labelKey: "transaction" },
  { value: "financialAccount", labelKey: "financialAccount" },
] as const;

const ACTION_OPTIONS = [
  { value: "", labelKey: "all" },
  { value: "USER_REGISTERED", labelKey: "USER_REGISTERED" },
  { value: "USER_LOGGED_IN", labelKey: "USER_LOGGED_IN" },
  { value: "USER_LOGGED_OUT", labelKey: "USER_LOGGED_OUT" },
  { value: "USER_PROFILE_UPDATED", labelKey: "USER_PROFILE_UPDATED" },
  { value: "USER_PASSWORD_CHANGED", labelKey: "USER_PASSWORD_CHANGED" },
  { value: "USER_PASSWORD_RESET_REQUESTED", labelKey: "USER_PASSWORD_RESET_REQUESTED" },
  { value: "USER_EMAIL_VERIFIED", labelKey: "USER_EMAIL_VERIFIED" },
  { value: "SESSION_REVOKED", labelKey: "SESSION_REVOKED" },
  { value: "TRANSACTION_CREATED", labelKey: "TRANSACTION_CREATED" },
  { value: "TRANSACTION_UPDATED", labelKey: "TRANSACTION_UPDATED" },
  { value: "TRANSACTION_DELETED", labelKey: "TRANSACTION_DELETED" },
  { value: "TRANSACTION_EXPORT", labelKey: "TRANSACTION_EXPORT" },
  { value: "TRANSACTION_IMPORT", labelKey: "TRANSACTION_IMPORT" },
  { value: "CREDIT_CARD_PAYMENT", labelKey: "CREDIT_CARD_PAYMENT" },
  { value: "FINANCIAL_ACCOUNT_CREATED", labelKey: "FINANCIAL_ACCOUNT_CREATED" },
  { value: "FINANCIAL_ACCOUNT_UPDATED", labelKey: "FINANCIAL_ACCOUNT_UPDATED" },
  { value: "FINANCIAL_ACCOUNT_DISABLED", labelKey: "FINANCIAL_ACCOUNT_DISABLED" },
  { value: "FINANCIAL_ACCOUNT_DELETED", labelKey: "FINANCIAL_ACCOUNT_DELETED" },
  { value: "FINANCIAL_ACCOUNT_RESTORED", labelKey: "FINANCIAL_ACCOUNT_RESTORED" },
] as const;

function formatDateTime(iso: string, locale: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(locale, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatAmount(amount: unknown): string {
  const n = typeof amount === "number" ? amount : Number(amount);
  if (!Number.isFinite(n)) return String(amount ?? "");
  return new Intl.NumberFormat("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

function formatDetailDate(iso: unknown, locale: string): string {
  if (iso == null) return "";
  const d = typeof iso === "string" ? new Date(iso) : iso instanceof Date ? iso : null;
  if (!d || Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleDateString(locale, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

type DetailChange = { field: string; from: unknown; to: unknown };

function formatDetails(
  action: string,
  details: Record<string, unknown> | null,
  t: (key: string, params?: Record<string, string | number>) => string,
  locale: string,
): string[] {
  const detailLines: string[] = [];
  if (!details || typeof details !== "object") return detailLines;

  if (action === "SESSION_REVOKED" && typeof details.scope === "string") {
    if (details.scope === "all") detailLines.push(t("activityLog.details.sessions.all"));
    else if (details.scope === "others")
      detailLines.push(t("activityLog.details.sessions.others"));
    else if (details.scope === "one") detailLines.push(t("activityLog.details.sessions.one"));
    return detailLines;
  }

  const transactionActions = [
    "TRANSACTION_CREATED",
    "TRANSACTION_UPDATED",
    "TRANSACTION_DELETED",
  ];
  if (transactionActions.includes(action)) {
    const type = details.type as string | undefined;
    const typeLabel = type ? t(`activityLog.details.transactionTypes.${type}`) : "";
    const amount = formatAmount(details.amount);
    const categoryName = (details.categoryName ?? details.category) as string | undefined;
    const accountName = details.accountName as string | undefined;
    const toAccountName = details.toAccountName as string | undefined;
    const occurredAt = formatDetailDate(details.occurredAt, locale);

    if (action === "TRANSACTION_DELETED") {
      detailLines.push(
        t("activityLog.details.transactionDeleted", {
          type: typeLabel || type || "—",
          amount,
          date: occurredAt || "—",
        }),
      );
    } else if (action === "TRANSACTION_UPDATED") {
      const changes = details.changes as DetailChange[] | undefined;
      if (Array.isArray(changes) && changes.length > 0) {
        changes.forEach((c) => {
          if (!c || typeof c.field !== "string") return;
          const fieldKey = `activityLog.details.changeField${c.field.charAt(0).toUpperCase() + c.field.slice(1)}`;
          const fieldLabel = t(fieldKey) || c.field;
          let fromVal = String(c.from ?? "");
          let toVal = String(c.to ?? "");
          if (c.field === "type") {
            fromVal = t(`activityLog.details.transactionTypes.${c.from}`) || fromVal;
            toVal = t(`activityLog.details.transactionTypes.${c.to}`) || toVal;
          } else if (c.field === "amount") {
            fromVal = `฿${formatAmount(c.from)}`;
            toVal = `฿${formatAmount(c.to)}`;
          } else if (c.field === "date") {
            fromVal = formatDetailDate(c.from, locale) || fromVal;
            toVal = formatDetailDate(c.to, locale) || toVal;
          }
          detailLines.push(
            t("activityLog.details.changedField", {
              field: fieldLabel,
              from: fromVal,
              to: toVal,
            }),
          );
        });
      } else {
        if (typeLabel) detailLines.push(t("activityLog.details.transactionType", { type: typeLabel }));
        if (amount) detailLines.push(t("activityLog.details.transactionAmount", { amount: `฿${amount}` }));
        if (categoryName) detailLines.push(t("activityLog.details.transactionCategory", { category: categoryName }));
        if (occurredAt) detailLines.push(t("activityLog.details.transactionDate", { date: occurredAt }));
        if (accountName) detailLines.push(t("activityLog.details.transactionAccount", { account: accountName }));
        if (type === "TRANSFER" && toAccountName)
          detailLines.push(t("activityLog.details.transactionToAccount", { account: toAccountName }));
      }
    } else {
      if (typeLabel) detailLines.push(t("activityLog.details.transactionType", { type: typeLabel }));
      if (amount) detailLines.push(t("activityLog.details.transactionAmount", { amount: `฿${amount}` }));
      if (categoryName) detailLines.push(t("activityLog.details.transactionCategory", { category: categoryName }));
      if (occurredAt) detailLines.push(t("activityLog.details.transactionDate", { date: occurredAt }));
      if (accountName) detailLines.push(t("activityLog.details.transactionAccount", { account: accountName }));
      if (type === "TRANSFER" && toAccountName)
        detailLines.push(t("activityLog.details.transactionToAccount", { account: toAccountName }));
    }
    if (detailLines.length > 0) return detailLines;
  }

  if (action === "CREDIT_CARD_PAYMENT") {
    const amount = formatAmount(details.amount);
    const fromAccountName = details.fromAccountName as string | undefined;
    const occurredAt = formatDetailDate(details.occurredAt, locale);
    detailLines.push(
      t("activityLog.details.creditCardPayment", {
        amount: `฿${amount}`,
        fromAccount: fromAccountName ?? "—",
        date: occurredAt || "—",
      }),
    );
    return detailLines;
  }

  if (action === "TRANSACTION_EXPORT") {
    const rowCount = details.rowCount as number | undefined;
    const hasFilter = details.hasFilter as boolean | undefined;
    detailLines.push(
      t("activityLog.details.transactionExport", {
        rowCount: rowCount ?? 0,
        hasFilter: hasFilter ? t("activityLog.details.yes") : t("activityLog.details.no"),
      }),
    );
    return detailLines;
  }

  if (action === "TRANSACTION_IMPORT") {
    const createdCount = details.createdCount as number | undefined;
    const updatedCount = details.updatedCount as number | undefined;
    const totalRows = details.totalRows as number | undefined;
    detailLines.push(
      t("activityLog.details.transactionImport", {
        createdCount: createdCount ?? 0,
        updatedCount: updatedCount ?? 0,
        totalRows: totalRows ?? 0,
      }),
    );
    return detailLines;
  }

  if (action === "FINANCIAL_ACCOUNT_CREATED") {
    const name = details.name as string | undefined;
    const type = details.type as string | undefined;
    const typeLabel = type ? t(`accounts.type.${type}`) : "";
    const initialBalance = formatAmount(details.initialBalance);
    if (name) detailLines.push(t("activityLog.details.financialAccountName", { name }));
    if (typeLabel) detailLines.push(t("activityLog.details.financialAccountType", { type: typeLabel }));
    if (initialBalance) detailLines.push(t("activityLog.details.financialAccountInitialBalance", { amount: `฿${initialBalance}` }));
    return detailLines;
  }

  if (action === "FINANCIAL_ACCOUNT_UPDATED") {
    const changes = details.changes as DetailChange[] | undefined;
    if (Array.isArray(changes) && changes.length > 0) {
      changes.forEach((c) => {
        if (!c || typeof c.field !== "string") return;
        const fieldKey = `activityLog.details.accountChangeField${c.field.charAt(0).toUpperCase() + c.field.slice(1)}`;
        const fieldLabel = t(fieldKey) || c.field;
        let fromVal = String(c.from ?? "");
        let toVal = String(c.to ?? "");
        if (c.field === "type") {
          fromVal = t(`accounts.type.${c.from}`) || fromVal;
          toVal = t(`accounts.type.${c.to}`) || toVal;
        } else if (c.field === "initialBalance" || c.field === "creditLimit") {
          fromVal = `฿${formatAmount(c.from)}`;
          toVal = `฿${formatAmount(c.to)}`;
        } else if (c.field === "lastCheckedAt") {
          fromVal = formatDetailDate(c.from, locale) || fromVal;
          toVal = formatDetailDate(c.to, locale) || toVal;
        } else if (c.field === "isDefault" || c.field === "isHidden") {
          fromVal = c.from === "true" ? t("activityLog.details.yes") : t("activityLog.details.no");
          toVal = c.to === "true" ? t("activityLog.details.yes") : t("activityLog.details.no");
        }
        detailLines.push(
          t("activityLog.details.changedField", {
            field: fieldLabel,
            from: fromVal,
            to: toVal,
          }),
        );
      });
    } else if (typeof details.name === "string") {
      detailLines.push(t("activityLog.details.financialAccountName", { name: details.name }));
    }
    return detailLines;
  }

  if (action === "FINANCIAL_ACCOUNT_DISABLED") {
    const name = details.name as string | undefined;
    const type = details.type as string | undefined;
    const typeLabel = type ? t(`accounts.type.${type}`) : "";
    if (name) detailLines.push(t("activityLog.details.financialAccountDisabled", { name }));
    if (typeLabel) detailLines.push(t("activityLog.details.financialAccountType", { type: typeLabel }));
    return detailLines;
  }

  if (action === "FINANCIAL_ACCOUNT_DELETED") {
    const name = details.name as string | undefined;
    const type = details.type as string | undefined;
    const typeLabel = type ? t(`accounts.type.${type}`) : "";
    if (name) detailLines.push(t("activityLog.details.financialAccountDeleted", { name }));
    if (typeLabel) detailLines.push(t("activityLog.details.financialAccountType", { type: typeLabel }));
    return detailLines;
  }

  if (action === "FINANCIAL_ACCOUNT_RESTORED") {
    const name = details.name as string | undefined;
    const type = details.type as string | undefined;
    const typeLabel = type ? t(`accounts.type.${type}`) : "";
    if (name) detailLines.push(t("activityLog.details.restored", { name }));
    if (typeLabel) detailLines.push(t("activityLog.details.financialAccountType", { type: typeLabel }));
    return detailLines;
  }

  const isDelete =
    action.endsWith("_DELETED") || action.endsWith("_RESTORED");
  const isUpdate = action.endsWith("_UPDATED");

  if (isDelete) {
    const name =
      typeof details.name === "string"
        ? details.name
        : typeof details.title === "string"
          ? details.title
          : null;
    if (name) {
      detailLines.push(
        action.endsWith("_RESTORED")
          ? t("activityLog.details.restored", { name })
          : t("activityLog.details.deleted", { name }),
      );
    }
  }

  if (isUpdate) {
    const changes = details.changes as DetailChange[] | undefined;
    if (Array.isArray(changes) && changes.length > 0) {
      changes.forEach((c) => {
        if (c && typeof c.field === "string")
          detailLines.push(
            t("activityLog.details.changedField", {
              field: c.field,
              from: String(c.from ?? ""),
              to: String(c.to ?? ""),
            }),
          );
      });
    } else if (details.from != null && details.to != null) {
      detailLines.push(
        t("activityLog.details.changedValue", {
          from: String(details.from),
          to: String(details.to),
        }),
      );
    } else if (typeof details.name === "string") {
      detailLines.push(details.name);
    }
  }

  if (detailLines.length === 0) {
    if (typeof details.name === "string") detailLines.push(details.name);
    else if (typeof details.title === "string")
      detailLines.push(details.title);
  }

  return detailLines;
}

export default function ActivityLogPage() {
  const router = useRouter();
  const { t, locale } = useI18n();
  const [list, setList] = useState<ActivityLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterEntityType, setFilterEntityType] = useState("");
  const [filterAction, setFilterAction] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filterEntityType) params.set("entityType", filterEntityType);
      if (filterAction) params.set("action", filterAction);
      if (filterDateFrom) params.set("dateFrom", filterDateFrom);
      if (filterDateTo) params.set("dateTo", filterDateTo);
      const url = `/api/activity-log${params.toString() ? `?${params.toString()}` : ""}`;
      const res = await fetch(url);
        if (!res.ok) {
          if (res.status === 401) {
            router.push("/sign-in");
            return;
          }
          throw new Error(t("activityLog.loadFailed"));
        }
      const data = await res.json();
      setList(data);
      } catch (e) {
        setError(
          e instanceof Error ? e.message : t("common.errors.generic"),
        );
    } finally {
      setLoading(false);
    }
  }, [filterEntityType, filterAction, filterDateFrom, filterDateTo, router, t]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold flex items-center gap-2">
          <Bell className="h-5 w-5" />
          {t("settings.activityLog.title")}
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          {t("activityLog.subtitle")}
        </p>
      </div>

      <section className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-800/50 p-4">
        <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-3">
          {t("activityLog.filters.title")}
        </h2>
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-xs text-zinc-500 dark:text-zinc-400 mb-1">
              {t("activityLog.filters.entityType")}
            </label>
            <select
              className="rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-2 py-1.5 text-sm"
              value={filterEntityType}
              onChange={(e) => setFilterEntityType(e.target.value)}
            >
              {ENTITY_TYPES.map((o) => (
                <option key={o.value || "all"} value={o.value}>
                  {t(`activityLog.entityTypes.${o.labelKey}`)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-zinc-500 dark:text-zinc-400 mb-1">
              {t("activityLog.filters.action")}
            </label>
            <select
              className="rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-2 py-1.5 text-sm min-w-[180px]"
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
            >
              {ACTION_OPTIONS.map((o) => (
                <option key={o.value || "all"} value={o.value}>
                  {t(`activityLog.actions.${o.labelKey}`)}
                </option>
              ))}
            </select>
          </div>
          <DatePicker
            id="activity-log-from"
            label={t("activityLog.filters.fromDate")}
            value={filterDateFrom}
            onChange={setFilterDateFrom}
            className="min-w-[180px]"
          />
          <DatePicker
            id="activity-log-to"
            label={t("activityLog.filters.toDate")}
            value={filterDateTo}
            onChange={setFilterDateTo}
            className="min-w-[180px]"
          />
        </div>
      </section>

      {loading && list.length === 0 ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
          <p className="text-muted-foreground text-sm">
            {t("activityLog.loading")}
          </p>
        </div>
      ) : error ? (
        <p className="text-red-600 dark:text-red-400">{error}</p>
      ) : list.length === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {t("activityLog.empty")}
        </p>
      ) : (
        <ul className="space-y-2">
          {list.map((entry) => {
            const detailLines = formatDetails(entry.action, entry.details, t, locale);
            return (
              <li
                key={entry.id}
                className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/80 px-4 py-3 space-y-1"
              >
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="text-sm text-zinc-500 dark:text-zinc-400 shrink-0">
                    {formatDateTime(entry.createdAt, locale)}
                  </span>
                  <span className="font-medium text-zinc-900 dark:text-zinc-100">
                    {t(
                      `activityLog.actions.${
                        ACTION_OPTIONS.find((o) => o.value === entry.action)
                          ?.labelKey ?? "fallback"
                      }`,
                    )}
                  </span>
                  {entry.entityType && (
                    <span className="text-xs rounded-full bg-zinc-100 dark:bg-zinc-700 px-2 py-0.5 text-zinc-600 dark:text-zinc-300">
                      {t(`activityLog.entityTypes.${entry.entityType}`) || entry.entityType}
                    </span>
                  )}
                </div>
                {(entry.userDisplayName || detailLines.length > 0) && (
                  <div className="text-sm text-zinc-600 dark:text-zinc-400 space-y-1">
                    {entry.userDisplayName && (
                      <div>
                        {t("activityLog.byUser", {
                          name: entry.userDisplayName,
                        })}
                      </div>
                    )}
                    {detailLines.map((line, i) => (
                      <div key={i}>{line}</div>
                    ))}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
