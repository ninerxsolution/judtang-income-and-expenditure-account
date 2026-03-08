"use client";

import { useState, useEffect } from "react";
import { RepeatIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogBody,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { AccountCombobox } from "@/components/dashboard/account-combobox";
import { CategoryCombobox } from "@/components/dashboard/category-combobox";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { useI18n } from "@/hooks/use-i18n";
import type { AccountOption } from "@/components/dashboard/account-combobox";

type RecurringType = "INCOME" | "EXPENSE";
type RecurringFrequency = "WEEKLY" | "MONTHLY" | "YEARLY";

type RecurringTransactionFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editId?: string | null;
  onSuccess?: () => void;
};

function sanitizeAmountInput(value: string): string {
  const noComma = value.replace(/,/g, "");
  const digitsAndDot = noComma.replace(/[^\d.]/g, "");
  const parts = digitsAndDot.split(".");
  const intPart = parts[0] ?? "";
  const decPart = parts.length > 1 ? parts.slice(1).join("").slice(0, 2) : "";
  return parts.length > 1 ? `${intPart}.${decPart}` : intPart;
}

function todayString(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
}

export function RecurringTransactionFormDialog({
  open,
  onOpenChange,
  editId,
  onSuccess,
}: RecurringTransactionFormDialogProps) {
  const { t, language } = useI18n();
  const localeKey = language === "th" ? "th" : "en";
  const r = t.recurring;

  const [type, setType] = useState<RecurringType>("EXPENSE");
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [financialAccountId, setFinancialAccountId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [frequency, setFrequency] = useState<RecurringFrequency>("MONTHLY");
  const [dayOfMonth, setDayOfMonth] = useState("1");
  const [monthOfYear, setMonthOfYear] = useState("1");
  const [startDate, setStartDate] = useState(todayString());
  const [endDate, setEndDate] = useState("");
  const [note, setNote] = useState("");
  const [isActive, setIsActive] = useState(true);

  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);

  const [pending, setPending] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deletePending, setDeletePending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadState, setLoadState] = useState<"idle" | "loading" | "done" | "error">(
    editId ? "loading" : "idle",
  );

  const isEdit = !!editId;

  useEffect(() => {
    if (!open) {
      setDeleteConfirm(false);
      setError(null);
      return;
    }

    async function loadFormData() {
      const [accRes, catRes] = await Promise.all([
        fetch("/api/financial-accounts"),
        fetch("/api/categories"),
      ]);
      const [accData, catData] = await Promise.all([accRes.json(), catRes.json()]);
      const activeAccounts = (accData.accounts ?? accData ?? []).filter(
        (a: { isActive: boolean }) => a.isActive,
      );
      setAccounts(activeAccounts);
      setCategories(catData.categories ?? catData ?? []);
    }

    async function loadEditData() {
      if (!editId) return;
      setLoadState("loading");
      try {
        const res = await fetch(`/api/recurring-transactions/${editId}`);
        if (!res.ok) throw new Error("Not found");
        const data = await res.json();
        setType(data.type as RecurringType);
        setName(data.name ?? "");
        setAmount(String(data.amount ?? ""));
        setFinancialAccountId(data.financialAccountId ?? "");
        setCategoryId(data.categoryId ?? "");
        setFrequency(data.frequency as RecurringFrequency);
        setDayOfMonth(String(data.dayOfMonth ?? 1));
        setMonthOfYear(String(data.monthOfYear ?? 1));
        setStartDate(data.startDate ? data.startDate.slice(0, 10) : todayString());
        setEndDate(data.endDate ? data.endDate.slice(0, 10) : "");
        setNote(data.note ?? "");
        setIsActive(data.isActive ?? true);
        setLoadState("done");
      } catch {
        setLoadState("error");
      }
    }

    loadFormData();
    if (isEdit) {
      loadEditData();
    } else {
      setType("EXPENSE");
      setName("");
      setAmount("");
      setFinancialAccountId("");
      setCategoryId("");
      setFrequency("MONTHLY");
      setDayOfMonth("1");
      setMonthOfYear("1");
      setStartDate(todayString());
      setEndDate("");
      setNote("");
      setIsActive(true);
      setLoadState("idle");
    }
  }, [open, editId, isEdit]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!startDate.trim()) {
      setError(r.startDateRequired);
      return;
    }
    setPending(true);

    const payload = {
      name: name.trim(),
      type,
      amount: parseFloat(amount),
      financialAccountId: financialAccountId || null,
      categoryId: categoryId || null,
      frequency,
      dayOfMonth: frequency !== "WEEKLY" ? parseInt(dayOfMonth, 10) : null,
      monthOfYear: frequency === "YEARLY" ? parseInt(monthOfYear, 10) : null,
      startDate,
      endDate: endDate || null,
      note: note.trim() || null,
      ...(isEdit && { isActive }),
    };

    try {
      const res = isEdit
        ? await fetch(`/api/recurring-transactions/${editId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetch("/api/recurring-transactions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? r.saveError);
        return;
      }

      onOpenChange(false);
      onSuccess?.();
    } catch {
      setError(r.saveError);
    } finally {
      setPending(false);
    }
  }

  async function handleDelete() {
    if (!editId) return;
    setDeletePending(true);
    try {
      const res = await fetch(`/api/recurring-transactions/${editId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? r.deleteError);
        return;
      }
      onOpenChange(false);
      onSuccess?.();
    } catch {
      setError(r.deleteError);
    } finally {
      setDeletePending(false);
    }
  }

  const monthOptions = Array.from({ length: 12 }, (_, i) => ({
    value: String(i + 1),
    label: r.months[String(i + 1) as keyof typeof r.months],
  }));

  const frequencyOptions: { value: RecurringFrequency; label: string }[] = [
    { value: "MONTHLY", label: r.frequency.MONTHLY },
    { value: "YEARLY", label: r.frequency.YEARLY },
    { value: "WEEKLY", label: r.frequency.WEEKLY },
  ];

  if (loadState === "loading") {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className={cn(
            "max-h-[90vh] flex flex-col overflow-hidden sm:max-w-md",
            "max-md:inset-0 max-md:translate-none max-md:h-dvh max-md:max-h-none max-md:w-full max-md:max-w-none max-md:rounded-none"
          )}
        >
          <DialogBody>
            <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
              Loading…
            </div>
          </DialogBody>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "max-h-[90vh] flex flex-col overflow-hidden sm:max-w-md",
          "max-md:inset-0 max-md:translate-none max-md:h-dvh max-md:max-h-none max-md:w-full max-md:max-w-none max-md:rounded-none"
        )}
      >
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <RepeatIcon className="h-4 w-4 text-muted-foreground" />
            {isEdit ? r.form.titleEdit : r.form.titleCreate}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-1 flex-col min-h-0 overflow-hidden">
          <DialogBody className="space-y-4 pb-2">
            {/* Type toggle */}
            <div className="flex rounded-lg overflow-hidden border border-border">
              {(["EXPENSE", "INCOME"] as RecurringType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={`flex-1 py-2 text-sm font-medium transition-colors ${
                    type === t
                      ? t === "EXPENSE"
                        ? "bg-red-500 text-white"
                        : "bg-emerald-500 text-white"
                      : "bg-background text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {t === "EXPENSE"
                    ? language === "th"
                      ? "รายจ่าย"
                      : "Expense"
                    : language === "th"
                      ? "รายรับ"
                      : "Income"}
                </button>
              ))}
            </div>

            {/* Name */}
            <div className="space-y-1.5">
              <Label htmlFor="recurring-name">{r.form.name}</Label>
              <input
                id="recurring-name"
                type="text"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={r.form.namePlaceholder}
                required
                maxLength={100}
              />
            </div>

            {/* Amount */}
            <div className="space-y-1.5">
              <Label htmlFor="recurring-amount">{r.form.amount}</Label>
              <input
                id="recurring-amount"
                type="text"
                inputMode="decimal"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={amount}
                onChange={(e) => setAmount(sanitizeAmountInput(e.target.value))}
                placeholder="0.00"
                required
              />
            </div>

            {/* Account */}
            <div className="space-y-1.5">
              <Label>{r.form.account}</Label>
              <AccountCombobox
                value={financialAccountId}
                onChange={setFinancialAccountId}
                accounts={accounts}
                allowEmpty
                emptyLabel={language === "th" ? "ไม่ระบุบัญชี" : "No account"}
              />
            </div>

            {/* Category */}
            <div className="space-y-1.5">
              <Label>{r.form.category}</Label>
              <CategoryCombobox
                value={categoryId}
                onChange={setCategoryId}
                categories={categories}
                localeKey={localeKey}
                noneLabel={language === "th" ? "ไม่มีหมวดหมู่" : "No category"}
                placeholder={language === "th" ? "ค้นหาหมวดหมู่…" : "Search category…"}
                noResultsText={language === "th" ? "ไม่พบหมวดหมู่" : "No category found"}
              />
            </div>

            {/* Frequency */}
            <div className="space-y-1.5">
              <Label htmlFor="recurring-frequency">{r.frequency.label}</Label>
              <select
                id="recurring-frequency"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as RecurringFrequency)}
              >
                {frequencyOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Day of month (for MONTHLY/YEARLY) */}
            {frequency !== "WEEKLY" && (
              <div className="flex gap-3">
                <div className="space-y-1.5 flex-1">
                  <Label htmlFor="recurring-day">{r.dayOfMonth}</Label>
                  <select
                    id="recurring-day"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    value={dayOfMonth}
                    onChange={(e) => setDayOfMonth(e.target.value)}
                  >
                    {Array.from({ length: 31 }, (_, i) => (
                      <option key={i + 1} value={String(i + 1)}>
                        {i + 1}
                      </option>
                    ))}
                  </select>
                </div>

                {frequency === "YEARLY" && (
                  <div className="space-y-1.5 flex-1">
                    <Label htmlFor="recurring-month">{r.monthOfYear}</Label>
                    <select
                      id="recurring-month"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      value={monthOfYear}
                      onChange={(e) => setMonthOfYear(e.target.value)}
                    >
                      {monthOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}

            {/* Start – End date range */}
            <DateRangePicker
              id="recurring-date-range"
              label={t("dataTools.export.dateRange")}
              value={{ from: startDate, to: endDate || undefined }}
              onChange={(v) => {
                setStartDate(v.from ?? "");
                setEndDate(v.to ?? "");
              }}
              placeholder={t("dataTools.export.dateRangePlaceholder")}
              numberOfMonths={1}
            />

            {/* Note */}
            <div className="space-y-1.5">
              <Label htmlFor="recurring-note">{r.form.note}</Label>
              <textarea
                id="recurring-note"
                className="flex min-h-[70px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={r.form.notePlaceholder}
                maxLength={500}
              />
            </div>

            {/* isActive toggle (edit only) */}
            {isEdit && (
              <div className="flex items-center gap-2">
                <input
                  id="recurring-active"
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <Label htmlFor="recurring-active">{r.isActive}</Label>
              </div>
            )}

            {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          </DialogBody>

          <DialogFooter
            className={cn(
              "shrink-0",
              isEdit && deleteConfirm && "flex flex-col gap-2 items-stretch"
            )}
          >
            {isEdit && !deleteConfirm && (
              <Button
                type="button"
                variant="ghost"
                className="text-destructive hover:text-destructive mr-auto"
                onClick={() => setDeleteConfirm(true)}
              >
                {r.form.deleteButton}
              </Button>
            )}
            {isEdit && deleteConfirm && (
              <>
                <p className="text-sm text-destructive text-center">
                  {r.form.deleteConfirm.replace("{name}", name)}
                </p>
                <div className="flex gap-2 justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setDeleteConfirm(false)}
                  >
                    {t.common.actions.cancel}
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={handleDelete}
                    disabled={deletePending}
                  >
                    {r.form.deleteButton}
                  </Button>
                </div>
              </>
            )}
            {(!isEdit || !deleteConfirm) && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  {t.common.actions.cancel}
                </Button>
                <Button type="submit" className="bg-emerald-500 hover:bg-emerald-600" disabled={pending}>
                  {pending ? "…" : r.form.saveButton}
                </Button>
              </>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
