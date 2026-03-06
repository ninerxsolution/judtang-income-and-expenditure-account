"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { RepeatIcon, CheckCircle2Icon, CircleIcon, ChevronRightIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatAmount } from "@/lib/format";
import { useI18n } from "@/hooks/use-i18n";
import { RecurringConfirmDialog } from "@/components/dashboard/recurring-confirm-dialog";

type RecurringDueItem = {
  id: string;
  name: string;
  type: "INCOME" | "EXPENSE";
  amount: number;
  frequency: "WEEKLY" | "MONTHLY" | "YEARLY";
  dayOfMonth: number | null;
  isActive: boolean;
  financialAccountId: string | null;
  categoryId: string | null;
  note: string | null;
  isPaid: boolean;
};

export function RecurringDueWidget() {
  const { t } = useI18n();
  const r = t.recurring;

  const now = new Date();
  const todayString = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  const [items, setItems] = useState<RecurringDueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmItem, setConfirmItem] = useState<RecurringDueItem | null>(null);

  async function loadItems() {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/recurring-transactions?dueYear=${now.getFullYear()}&dueMonth=${now.getMonth() + 1}`,
      );
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadItems();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const unpaidItems = items.filter((i) => !i.isPaid).slice(0, 4);
  const totalDue = items.filter((i) => !i.isPaid).reduce((s, i) => s + Number(i.amount), 0);
  const allPaid = items.length > 0 && items.every((i) => i.isPaid);

  if (!loading && items.length === 0) return null;

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-1.5">
          <RepeatIcon className="h-4 w-4 text-muted-foreground" />
          {r.widget.title}
        </h3>
        <Link
          href="/dashboard/recurring"
          className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-0.5 transition-colors"
        >
          {r.widget.viewAll}
          <ChevronRightIcon className="h-3.5 w-3.5" />
        </Link>
      </div>

      {loading && (
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-10 w-full rounded-lg" />
          ))}
        </div>
      )}

      {!loading && allPaid && (
        <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400 py-1">
          <CheckCircle2Icon className="h-4 w-4" />
          {r.widget.allPaid}
        </div>
      )}

      {!loading && !allPaid && (
        <>
          <div className="space-y-1.5">
            {unpaidItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-muted/50 transition-colors group"
              >
                <CircleIcon className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                <span className="flex-1 text-sm truncate">{item.name}</span>
                <span className="text-sm font-medium text-red-500 shrink-0">
                  {formatAmount(Number(item.amount))}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 px-2 text-xs opacity-0 group-hover:opacity-100 transition-opacity text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/30 shrink-0"
                  onClick={() => {
                    setConfirmItem(item);
                    setConfirmOpen(true);
                  }}
                >
                  {r.widget.confirmPay}
                </Button>
              </div>
            ))}
          </div>

          {unpaidItems.length > 0 && (
            <div className="flex items-center justify-between pt-1 border-t border-border/50">
              <span className="text-xs text-muted-foreground">{r.widget.totalDue}</span>
              <span className="text-sm font-semibold text-red-500">{formatAmount(totalDue)}</span>
            </div>
          )}
        </>
      )}

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
