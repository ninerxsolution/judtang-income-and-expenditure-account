"use client";

import { useEffect, useState, useCallback } from "react";
import {
  RepeatIcon,
  PlusIcon,
  PencilIcon,
  CheckCircle2Icon,
  CircleIcon,
  CalendarIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatAmount } from "@/lib/format";
import { useI18n } from "@/hooks/use-i18n";
import { RecurringTransactionFormDialog } from "@/components/dashboard/recurring-transaction-form-dialog";
import { RecurringConfirmDialog } from "@/components/dashboard/recurring-confirm-dialog";

type RecurringItem = {
  id: string;
  name: string;
  type: "INCOME" | "EXPENSE";
  amount: number;
  frequency: "WEEKLY" | "MONTHLY" | "YEARLY";
  dayOfMonth: number | null;
  monthOfYear: number | null;
  isActive: boolean;
  note: string | null;
  financialAccountId: string | null;
  categoryId: string | null;
  categoryRef: { name: string } | null;
  financialAccount: { name: string } | null;
  isPaid?: boolean;
};

type ViewMode = "all" | "due";

function FrequencyBadge({
  item,
  r,
}: {
  item: RecurringItem;
  r: {
    frequency: { WEEKLY: string; MONTHLY: string; YEARLY: string };
    dayOfMonth: string;
    monthOfYear: string;
    months: Record<string, string>;
  };
}) {
  const freqLabel = r.frequency[item.frequency];
  const dayLabel =
    item.frequency !== "WEEKLY" && item.dayOfMonth ? ` · ${r.dayOfMonth} ${item.dayOfMonth}` : "";
  const monthLabel =
    item.frequency === "YEARLY" && item.monthOfYear
      ? ` ${r.months[String(item.monthOfYear)]} `
      : "";

  return (
    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
      <CalendarIcon className="h-3 w-3" />
      {freqLabel}
      {monthLabel}
      {dayLabel}
    </span>
  );
}

export default function RecurringPage() {
  const { t, language } = useI18n();
  const r = t.recurring;

  const now = new Date();
  const [viewMode, setViewMode] = useState<ViewMode>("due");
  const [items, setItems] = useState<RecurringItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmItem, setConfirmItem] = useState<RecurringItem | null>(null);

  const todayString = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const url =
        viewMode === "due"
          ? `/api/recurring-transactions?dueYear=${now.getFullYear()}&dueMonth=${now.getMonth() + 1}`
          : "/api/recurring-transactions";
      const res = await fetch(url);
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const dueItems = items.filter(() => viewMode === "due");
  const unpaidItems = dueItems.filter((i) => !i.isPaid);
  const paidItems = dueItems.filter((i) => i.isPaid);
  const totalDue = unpaidItems.reduce((sum, i) => sum + Number(i.amount), 0);

  const monthName = now.toLocaleString(language === "th" ? "th-TH" : "en-US", { month: "long" });

  function openEdit(id: string) {
    setEditId(id);
    setFormOpen(true);
  }

  function openConfirm(item: RecurringItem) {
    setConfirmItem(item);
    setConfirmOpen(true);
  }

  function openCreate() {
    setEditId(null);
    setFormOpen(true);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground mt-1">{r.subtitle}</p>
        </div>
        <Button onClick={openCreate} size="sm" className="shrink-0">
          <PlusIcon className="h-4 w-4 mr-1" />
          {r.addButton}
        </Button>
      </div>

      {/* View mode toggle */}
      <div className="flex rounded-lg overflow-hidden border border-border w-fit">
        {(["due", "all"] as ViewMode[]).map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => setViewMode(mode)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              viewMode === mode
                ? "bg-primary text-primary-foreground"
                : "bg-background text-muted-foreground hover:bg-muted"
            }`}
          >
            {mode === "due"
              ? language === "th"
                ? `เดือนนี้ (${monthName})`
                : `This month (${monthName})`
              : language === "th"
                ? "ทั้งหมด"
                : "All"}
          </button>
        ))}
      </div>

      {/* Loading state */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((_i) => (
            <Skeleton key={_i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      )}

      {/* Due this month view */}
      {!loading && viewMode === "due" && (
        <div className="space-y-4">
          {items.length === 0 && (
            <div className="text-center py-16 text-muted-foreground text-sm">
              {r.widget.empty}
            </div>
          )}

          {items.length > 0 && unpaidItems.length === 0 && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20 dark:border-emerald-900 p-4 text-center text-sm text-emerald-700 dark:text-emerald-400">
              {r.widget.allPaid}
            </div>
          )}

          {unpaidItems.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">{r.widget.unpaid}</p>
                <p className="text-sm font-semibold">
                  {r.widget.totalDue}: {formatAmount(totalDue)}
                </p>
              </div>
              {unpaidItems.map((item) => (
                <RecurringCard
                  key={item.id}
                  item={item}
                  r={r}
                  onEdit={() => openEdit(item.id)}
                  onConfirm={() => openConfirm(item)}
                  showConfirm
                />
              ))}
            </div>
          )}

          {paidItems.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">{r.widget.paid}</p>
              {paidItems.map((item) => (
                <RecurringCard
                  key={item.id}
                  item={item}
                  r={r}
                  onEdit={() => openEdit(item.id)}
                  onConfirm={() => openConfirm(item)}
                  showConfirm={false}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* All items view */}
      {!loading && viewMode === "all" && (
        <div className="space-y-2">
          {items.length === 0 && (
            <div className="text-center py-16 space-y-2">
              <RepeatIcon className="h-12 w-12 text-muted-foreground/30 mx-auto" />
              <p className="text-muted-foreground text-sm">{r.emptyState}</p>
              <p className="text-muted-foreground/60 text-xs">{r.emptyStateDescription}</p>
            </div>
          )}
          {items.map((item) => (
            <RecurringCard
              key={item.id}
              item={item}
              r={r}
              onEdit={() => openEdit(item.id)}
              onConfirm={() => openConfirm(item)}
              showConfirm={false}
              showActive
            />
          ))}
        </div>
      )}

      <RecurringTransactionFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        editId={editId}
        onSuccess={loadItems}
      />

      <RecurringConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        item={confirmItem}
        defaultDate={todayString}
        onSuccess={loadItems}
      />
    </div>
  );
}

function RecurringCard({
  item,
  r,
  onEdit,
  onConfirm,
  showConfirm,
  showActive,
}: {
  item: RecurringItem;
  r: ReturnType<typeof useI18n>["t"]["recurring"];
  onEdit: () => void;
  onConfirm: () => void;
  showConfirm: boolean;
  showActive?: boolean;
}) {
  const isExpense = item.type === "EXPENSE";

  return (
    <div
      className={`rounded-xl border p-4 flex flex-col gap-3 transition-opacity sm:flex-row sm:items-center sm:gap-4 ${
        showActive && !item.isActive ? "opacity-50" : ""
      } ${item.isPaid ? "border-emerald-200 dark:border-emerald-900 bg-emerald-50/50 dark:bg-emerald-950/10" : "border-border bg-card"}`}
    >
      <div className="flex min-w-0 flex-1 items-start gap-3 sm:items-center">
        {/* Paid indicator */}
        <div className="mt-0.5 shrink-0 sm:mt-0">
          {item.isPaid ? (
            <CheckCircle2Icon className="h-5 w-5 text-emerald-500" />
          ) : (
            <CircleIcon className="h-5 w-5 text-muted-foreground/40" />
          )}
        </div>

        {/* Content */}
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm truncate">{item.name}</span>
            {showActive && !item.isActive && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground shrink-0">
                {r.badge.inactive}
              </span>
            )}
          </div>
          <div className="mt-0.5 flex items-center gap-2 flex-wrap">
            <FrequencyBadge item={item} r={r} />
            {item.categoryRef && (
              <span className="text-xs text-muted-foreground">· {item.categoryRef.name}</span>
            )}
            {item.financialAccount && (
              <span className="text-xs text-muted-foreground">· {item.financialAccount.name}</span>
            )}
          </div>
        </div>
      </div>

      <div className="mt-1 flex w-full items-center justify-between gap-3 pl-8 sm:mt-0 sm:w-auto sm:justify-end sm:pl-0">
        {/* Amount */}
        <div>
          <p
            className={`font-semibold text-sm ${isExpense ? "text-red-500" : "text-emerald-500"}`}
          >
            {isExpense ? "-" : "+"}
            {formatAmount(Number(item.amount))}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          {showConfirm && !item.isPaid && (
            <Button
              size="sm"
              className="h-8 bg-emerald-500 px-3 text-xs text-white hover:bg-emerald-600"
              onClick={onConfirm}
            >
              <CheckCircle2Icon className="h-3 w-3 md:mr-1" />
              <span className="hidden md:block">{r.widget.confirmPay}</span>
            </Button>
          )}
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={onEdit}>
            <PencilIcon className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
