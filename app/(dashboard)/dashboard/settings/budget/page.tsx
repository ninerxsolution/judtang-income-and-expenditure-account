"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  ChevronLeft,
  ChevronRight,
  Wallet,
  Plus,
  Trash2,
  Loader2,
  Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { useI18n } from "@/hooks/use-i18n";
import { formatAmount } from "@/lib/format";

type BudgetTemplate = {
  id: string;
  name: string;
  isActive: boolean;
  totalBudget: number | null;
  createdAt: string;
  updatedAt: string;
  categoryLimits: Array<{
    id: string;
    categoryId: string | null;
    categoryName: string | null;
    limitAmount: number;
    createdAt: string;
  }>;
};

type CategoryBudgetWithActual = {
  id: string;
  categoryId: string | null;
  categoryName: string | null;
  limitAmount: number;
  spent: number;
  remaining: number;
  progress: number;
  indicator: "normal" | "warning" | "critical" | "over";
};

type BudgetResponse = {
  budgetMonth: {
    id: string;
    year: number;
    month: number;
    totalBudget: number | null;
    createdAt: string;
    updatedAt: string;
  } | null;
  totalSpent: number;
  totalBudget: number | null;
  totalProgress: number;
  totalIndicator: "normal" | "warning" | "critical" | "over";
  categoryBudgets: CategoryBudgetWithActual[];
};

type Category = { id: string; name: string };

const MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

function indicatorColor(indicator: string): string {
  switch (indicator) {
    case "over":
      return "bg-red-500 dark:bg-red-600";
    case "critical":
      return "bg-orange-500 dark:bg-orange-600";
    case "warning":
      return "bg-amber-500 dark:bg-amber-600";
    default:
      return "bg-emerald-500 dark:bg-emerald-600";
  }
}

function indicatorLabel(
  indicator: string,
  t: (key: string) => string,
): string {
  switch (indicator) {
    case "over":
      return t("settings.budget.overBudget");
    case "critical":
      return t("settings.budget.critical");
    case "warning":
      return t("settings.budget.warning");
    default:
      return t("settings.budget.normal");
  }
}

function indicatorBadgeClass(indicator: string): string {
  switch (indicator) {
    case "over":
      return "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400";
    case "critical":
      return "bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-400";
    case "warning":
      return "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400";
    default:
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400";
  }
}

export default function BudgetSettingsPage() {
  const { t } = useI18n();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [templates, setTemplates] = useState<BudgetTemplate[]>([]);
  const [budget, setBudget] = useState<BudgetResponse | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [loadingBudget, setLoadingBudget] = useState(true);
  const [, setLoadingCategories] = useState(true);
  const [savingTotal, setSavingTotal] = useState(false);
  const [applyTemplateId, setApplyTemplateId] = useState<string>("");
  const [applying, setApplying] = useState(false);
  const [addCategoryOpen, setAddCategoryOpen] = useState(false);
  const [newCategoryId, setNewCategoryId] = useState("");
  const [newCategoryAmount, setNewCategoryAmount] = useState("");
  const [savingCategory, setSavingCategory] = useState(false);
  const [deleteCategoryId, setDeleteCategoryId] = useState<string | null>(
    null,
  );
  const [deleting, setDeleting] = useState(false);
  const [createTemplateOpen, setCreateTemplateOpen] = useState(false);
  const [editTemplateId, setEditTemplateId] = useState<string | null>(null);
  const [deleteTemplateId, setDeleteTemplateId] = useState<string | null>(
    null,
  );
  const [templateFormName, setTemplateFormName] = useState("");
  const [templateFormTotalBudget, setTemplateFormTotalBudget] = useState("");
  const [templateFormCategoryLimits, setTemplateFormCategoryLimits] = useState<
    Array<{ categoryId: string; limitAmount: string }>
  >([{ categoryId: "", limitAmount: "" }]);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [editCategoryBudgetId, setEditCategoryBudgetId] = useState<
    string | null
  >(null);
  const [editCategoryBudgetAmount, setEditCategoryBudgetAmount] = useState("");
  const [savingEditCategory, setSavingEditCategory] = useState(false);
  const [deletingTemplate, setDeletingTemplate] = useState(false);

  const fetchTemplates = useCallback(async () => {
    setLoadingTemplates(true);
    try {
      const res = await fetch("/api/budget-templates");
      if (!res.ok) throw new Error("Failed to load templates");
      const data: BudgetTemplate[] = await res.json();
      setTemplates(data);
    } catch {
      toast.error(t("common.errors.generic"));
    } finally {
      setLoadingTemplates(false);
    }
  }, [t]);

  const fetchBudget = useCallback(async () => {
    setLoadingBudget(true);
    try {
      const res = await fetch(`/api/budgets?year=${year}&month=${month}`);
      if (!res.ok) throw new Error("Failed to load budget");
      const data: BudgetResponse = await res.json();
      setBudget(data);
    } catch {
      toast.error(t("common.errors.generic"));
    } finally {
      setLoadingBudget(false);
    }
  }, [year, month, t]);

  const fetchCategories = useCallback(async () => {
    setLoadingCategories(true);
    try {
      const res = await fetch("/api/categories");
      if (!res.ok) throw new Error("Failed to load categories");
      const data: Array<{ id: string; name: string }> = await res.json();
      setCategories(data);
    } catch {
      toast.error(t("common.errors.generic"));
    } finally {
      setLoadingCategories(false);
    }
  }, [t]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  useEffect(() => {
    fetchBudget();
  }, [fetchBudget]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const budgetMonthId = budget?.budgetMonth?.id;
  const existingCategoryIds = new Set(
    (budget?.categoryBudgets ?? [])
      .map((cb) => cb.categoryId)
      .filter(Boolean),
  );

  function goToPreviousMonth() {
    if (month === 1) {
      setYear((y) => y - 1);
      setMonth(12);
    } else {
      setMonth((m) => m - 1);
    }
  }

  function goToNextMonth() {
    if (month === 12) {
      setYear((y) => y + 1);
      setMonth(1);
    } else {
      setMonth((m) => m + 1);
    }
  }

  async function handleSaveTotalBudget() {
    const input = document.getElementById(
      "total-budget-input",
    ) as HTMLInputElement | null;
    const raw = input?.value?.replace(/,/g, "")?.trim();
    const num = raw ? parseFloat(raw) : 0;
    if (!Number.isFinite(num) || num < 0) {
      toast.error(
        t("settings.budget.totalBudget") + " must be a non-negative number",
      );
      return;
    }
    setSavingTotal(true);
    try {
      const res = await fetch("/api/budgets/month", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year, month, totalBudget: num }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(
          (j as { error?: string }).error ?? "Failed to save",
        );
      }
      toast.success(t("settings.budget.saveSuccess"));
      fetchBudget();
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : t("common.errors.generic"),
      );
    } finally {
      setSavingTotal(false);
    }
  }

  async function handleApplyTemplate() {
    if (!applyTemplateId) {
      toast.error(t("settings.budget.templates") + " — select one");
      return;
    }
    setApplying(true);
    try {
      const res = await fetch("/api/budgets/apply-template", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId: applyTemplateId, year, month }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(
          (j as { error?: string }).error ?? "Failed to apply",
        );
      }
      toast.success(t("settings.budget.applyTemplateSuccess"));
      setApplyTemplateId("");
      fetchBudget();
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : t("common.errors.generic"),
      );
    } finally {
      setApplying(false);
    }
  }

  function openCreateTemplate() {
    setTemplateFormName("");
    setTemplateFormTotalBudget("");
    setTemplateFormCategoryLimits([{ categoryId: "", limitAmount: "" }]);
    setCreateTemplateOpen(true);
    setEditTemplateId(null);
  }

  function openEditTemplate(tm: BudgetTemplate) {
    setEditTemplateId(tm.id);
    setTemplateFormName(tm.name);
    setTemplateFormTotalBudget(
      tm.totalBudget != null ? String(tm.totalBudget) : "",
    );
    setTemplateFormCategoryLimits(
      tm.categoryLimits.length > 0
        ? tm.categoryLimits.map((cl) => ({
            categoryId: cl.categoryId ?? "",
            limitAmount: String(cl.limitAmount),
          }))
        : [{ categoryId: "", limitAmount: "" }],
    );
    setCreateTemplateOpen(true);
  }

  function addTemplateLimitRow() {
    setTemplateFormCategoryLimits((prev) => [
      ...prev,
      { categoryId: "", limitAmount: "" },
    ]);
  }

  function removeTemplateLimitRow(index: number) {
    setTemplateFormCategoryLimits((prev) =>
      prev.filter((_, i) => i !== index),
    );
  }

  function updateTemplateLimitRow(
    index: number,
    field: "categoryId" | "limitAmount",
    value: string,
  ) {
    setTemplateFormCategoryLimits((prev) =>
      prev.map((row, i) => (i === index ? { ...row, [field]: value } : row)),
    );
  }

  async function handleSaveTemplate() {
    const name = templateFormName.trim();
    if (!name) {
      toast.error(t("settings.budget.templateName") + " is required");
      return;
    }
    const totalBudgetNum =
      templateFormTotalBudget.trim() !== ""
        ? parseFloat(templateFormTotalBudget.replace(/,/g, ""))
        : NaN;
    const totalBudget =
      Number.isFinite(totalBudgetNum) && totalBudgetNum > 0
        ? totalBudgetNum
        : null;
    const limits = templateFormCategoryLimits
      .filter(
        (row) =>
          row.categoryId.trim() !== "" &&
          Number.isFinite(parseFloat(row.limitAmount.replace(/,/g, ""))) &&
          parseFloat(row.limitAmount.replace(/,/g, "")) > 0,
      )
      .map((row) => ({
        categoryId: row.categoryId.trim(),
        limitAmount: parseFloat(row.limitAmount.replace(/,/g, "")),
      }));
    const categoryLimits = Array.from(
      new Map(limits.map((l) => [l.categoryId, l.limitAmount])).entries(),
    ).map(([categoryId, limitAmount]) => ({ categoryId, limitAmount }));

    setSavingTemplate(true);
    try {
      if (editTemplateId) {
        const res = await fetch(
          `/api/budget-templates/${editTemplateId}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, totalBudget, categoryLimits }),
          },
        );
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(
            (j as { error?: string }).error ?? "Failed to update",
          );
        }
        toast.success(t("settings.budget.saveSuccess"));
        setCreateTemplateOpen(false);
        setEditTemplateId(null);
        fetchTemplates();
      } else {
        const res = await fetch("/api/budget-templates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, totalBudget, categoryLimits }),
        });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(
            (j as { error?: string }).error ?? "Failed to create",
          );
        }
        toast.success(t("settings.budget.saveSuccess"));
        setCreateTemplateOpen(false);
        fetchTemplates();
      }
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : t("common.errors.generic"),
      );
    } finally {
      setSavingTemplate(false);
    }
  }

  async function handleDeleteTemplate() {
    if (!deleteTemplateId) return;
    setDeletingTemplate(true);
    try {
      const res = await fetch(
        `/api/budget-templates/${deleteTemplateId}`,
        { method: "DELETE" },
      );
      if (!res.ok) throw new Error("Failed to delete");
      toast.success(t("settings.budget.deleteSuccess"));
      setDeleteTemplateId(null);
      fetchTemplates();
    } catch {
      toast.error(t("common.errors.generic"));
    } finally {
      setDeletingTemplate(false);
    }
  }

  async function handleSaveEditCategoryBudget() {
    if (!editCategoryBudgetId) return;
    const num = parseFloat(editCategoryBudgetAmount.replace(/,/g, ""));
    if (!Number.isFinite(num) || num <= 0) {
      toast.error(
        t("settings.budget.categoryLimit") + " must be a positive number",
      );
      return;
    }
    setSavingEditCategory(true);
    try {
      const res = await fetch(
        `/api/budgets/categories/${editCategoryBudgetId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ limitAmount: num }),
        },
      );
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(
          (j as { error?: string }).error ?? "Failed to update",
        );
      }
      toast.success(t("settings.budget.saveSuccess"));
      setEditCategoryBudgetId(null);
      setEditCategoryBudgetAmount("");
      fetchBudget();
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : t("common.errors.generic"),
      );
    } finally {
      setSavingEditCategory(false);
    }
  }

  async function handleAddCategoryBudget() {
    const num = parseFloat(newCategoryAmount.replace(/,/g, ""));
    if (!newCategoryId || !Number.isFinite(num) || num <= 0) {
      toast.error(
        t("settings.budget.categoryLimit") +
          " — category and amount required",
      );
      return;
    }
    setSavingCategory(true);
    try {
      let monthId = budgetMonthId;
      if (!monthId) {
        const createRes = await fetch("/api/budgets/month", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ year, month, totalBudget: null }),
        });
        if (!createRes.ok) throw new Error("Failed to create month");
        const created = (await createRes.json()) as { id: string };
        monthId = created.id;
      }
      const res = await fetch("/api/budgets/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          budgetMonthId: monthId,
          categoryId: newCategoryId,
          limitAmount: num,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(
          (j as { error?: string }).error ?? "Failed to save",
        );
      }
      toast.success(t("settings.budget.saveSuccess"));
      setNewCategoryId("");
      setNewCategoryAmount("");
      setAddCategoryOpen(false);
      fetchBudget();
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : t("common.errors.generic"),
      );
    } finally {
      setSavingCategory(false);
    }
  }

  async function handleDeleteCategoryBudget(id: string) {
    setDeleting(true);
    try {
      const res = await fetch(`/api/budgets/categories/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success(t("settings.budget.deleteSuccess"));
      setDeleteCategoryId(null);
      fetchBudget();
    } catch {
      toast.error(t("common.errors.generic"));
    } finally {
      setDeleting(false);
    }
  }

  const totalBudgetNum = budget?.totalBudget ?? null;
  const totalSpent = budget?.totalSpent ?? 0;
  const remaining =
    totalBudgetNum != null ? totalBudgetNum - totalSpent : null;

  return (
    <div className="space-y-6 pt-4 sm:pt-8">
      {/* Back link */}
      <Link
        href="/dashboard/settings"
        className="inline-flex items-center gap-1 text-sm text-[#6B5E4E] hover:text-[#3D3020] dark:text-stone-400 dark:hover:text-stone-100"
      >
        <ChevronLeft className="h-4 w-4" />
        {t("common.actions.back")}
      </Link>

      {/* Header + Month navigation */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <header className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#D4C9B0] bg-[#F5F0E8] dark:border-stone-700 dark:bg-stone-800">
            <Wallet className="h-5 w-5 text-[#5C6B52] dark:text-stone-300" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">
              {t("settings.budget.title")}
            </h1>
            <p className="text-sm text-[#6B5E4E] dark:text-stone-400">
              {t("settings.budget.description")}
            </p>
          </div>
        </header>

        <div className="inline-flex items-center gap-1 self-start rounded-lg border border-[#D4C9B0] bg-[#FDFAF4] p-1 dark:border-stone-700 dark:bg-stone-900">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={goToPreviousMonth}
            aria-label={t("common.actions.back")}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <select
            value={month}
            onChange={(e) => setMonth(parseInt(e.target.value, 10))}
            className="h-8 appearance-none bg-transparent px-1.5 text-sm font-medium outline-none cursor-pointer text-[#3D3020] dark:text-stone-100"
            aria-label={t("settings.budget.month")}
          >
            {MONTHS.map((m) => (
              <option key={m} value={m}>
                {new Date(year, m - 1, 1).toLocaleString(undefined, {
                  month: "short",
                })}
              </option>
            ))}
          </select>
          <select
            value={year}
            onChange={(e) => setYear(parseInt(e.target.value, 10))}
            className="h-8 appearance-none bg-transparent px-1 text-sm font-medium outline-none cursor-pointer text-[#3D3020] dark:text-stone-100"
            aria-label={t("settings.budget.year")}
          >
            {[year - 2, year - 1, year, year + 1, year + 2].map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={goToNextMonth}
            aria-label={t("settings.budget.month")}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Budget Overview */}
      <section className="rounded-lg border border-[#D4C9B0] bg-[#F5F0E8]/50 p-6 dark:border-stone-700 dark:bg-stone-900/30">
        <h2 className="text-sm font-medium text-[#3D3020] dark:text-stone-100">
          {t("settings.budget.totalBudget")}
        </h2>

        {loadingBudget ? (
          <div className="mt-4 space-y-4">
            <Skeleton className="h-3 w-full rounded-full" />
            <div className="grid gap-3 sm:grid-cols-3">
              <Skeleton className="h-20 rounded-lg" />
              <Skeleton className="h-20 rounded-lg" />
              <Skeleton className="h-20 rounded-lg" />
            </div>
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            {totalBudgetNum != null && totalBudgetNum > 0 ? (
              <>
                {/* Progress bar */}
                <div className="space-y-1.5">
                  <div className="flex items-baseline justify-between text-sm">
                    <span className="font-medium text-[#3D3020] dark:text-stone-100">
                      ฿{formatAmount(totalSpent)}
                    </span>
                    <span className="text-[#A09080] dark:text-stone-400">
                      ฿{formatAmount(totalBudgetNum)}
                    </span>
                  </div>
                  <div className="h-3 w-full overflow-hidden rounded-full bg-[#E8E0D0] dark:bg-stone-700">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${indicatorColor(budget?.totalIndicator ?? "normal")}`}
                      style={{
                        width: `${Math.min(100, (budget?.totalProgress ?? 0) * 100)}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Stats grid */}
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-lg border border-[#D4C9B0]/50 bg-[#FDFAF4] p-3 dark:border-stone-700/50 dark:bg-stone-900/40">
                    <p className="text-xs font-medium text-[#A09080] dark:text-stone-400">
                      {t("settings.budget.totalSpent")}
                    </p>
                    <p className="mt-1 text-lg font-semibold text-[#3D3020] dark:text-stone-100">
                      ฿{formatAmount(totalSpent)}
                    </p>
                  </div>
                  <div className="rounded-lg border border-[#D4C9B0]/50 bg-[#FDFAF4] p-3 dark:border-stone-700/50 dark:bg-stone-900/40">
                    <p className="text-xs font-medium text-[#A09080] dark:text-stone-400">
                      {t("settings.budget.remaining")}
                    </p>
                    <p
                      className={`mt-1 text-lg font-semibold ${
                        remaining != null && remaining < 0
                          ? "text-red-600 dark:text-red-400"
                          : "text-[#3D3020] dark:text-stone-100"
                      }`}
                    >
                      ฿
                      {formatAmount(
                        remaining != null ? Math.abs(remaining) : 0,
                      )}
                    </p>
                  </div>
                  <div className="rounded-lg border border-[#D4C9B0]/50 bg-[#FDFAF4] p-3 dark:border-stone-700/50 dark:bg-stone-900/40">
                    <p className="text-xs font-medium text-[#A09080] dark:text-stone-400">
                      {t("settings.budget.progress")}
                    </p>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="text-lg font-semibold text-[#3D3020] dark:text-stone-100">
                        {Math.round(
                          (budget?.totalProgress ?? 0) * 100,
                        )}
                        %
                      </span>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${indicatorBadgeClass(budget?.totalIndicator ?? "normal")}`}
                      >
                        {indicatorLabel(
                          budget?.totalIndicator ?? "normal",
                          t,
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-sm text-[#6B5E4E] dark:text-stone-400">
                {t("settings.budget.setBudget")}
              </p>
            )}

            {/* Total budget input */}
            <div
              className={
                totalBudgetNum != null && totalBudgetNum > 0
                  ? "border-t border-[#D4C9B0]/50 pt-4 dark:border-stone-700/50"
                  : ""
              }
            >
              <div className="flex flex-wrap items-end gap-3">
                <div className="space-y-1.5">
                  <Label
                    htmlFor="total-budget-input"
                    className="text-xs font-medium text-[#6B5E4E] dark:text-stone-400"
                  >
                    {t("settings.budget.totalBudget")} (฿)
                  </Label>
                  <Input
                    key={`total-${year}-${month}-${totalBudgetNum}`}
                    id="total-budget-input"
                    type="text"
                    inputMode="decimal"
                    placeholder="0"
                    defaultValue={
                      totalBudgetNum != null
                        ? formatAmount(totalBudgetNum)
                        : ""
                    }
                    className="w-40 font-mono"
                  />
                </div>
                <Button
                  onClick={handleSaveTotalBudget}
                  disabled={savingTotal}
                  size="sm"
                >
                  {savingTotal ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    t("common.actions.save")
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Category budgets */}
      <section className="rounded-lg border border-[#D4C9B0] bg-[#F5F0E8]/50 p-6 dark:border-stone-700 dark:bg-stone-900/30">
        <div className="flex items-center justify-between gap-2 mb-4">
          <h2 className="text-sm font-medium text-[#3D3020] dark:text-stone-100">
            {t("settings.budget.categoryLimit")}
          </h2>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAddCategoryOpen(true)}
          >
            <Plus className="h-4 w-4" />
            {t("settings.budget.addCategoryBudget")}
          </Button>
        </div>

        {loadingBudget ? (
          <div className="space-y-3">
            <Skeleton className="h-24 w-full rounded-lg" />
            <Skeleton className="h-24 w-full rounded-lg" />
          </div>
        ) : (budget?.categoryBudgets?.length ?? 0) === 0 ? (
          <div className="rounded-lg border border-dashed border-[#D4C9B0] p-8 text-center dark:border-stone-700">
            <Wallet className="mx-auto h-8 w-8 text-[#A09080] dark:text-stone-500" />
            <p className="mt-2 text-sm text-[#6B5E4E] dark:text-stone-400">
              {t("settings.budget.noCategoryBudgets")}
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => setAddCategoryOpen(true)}
            >
              <Plus className="h-4 w-4" />
              {t("settings.budget.addCategoryBudget")}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {(budget?.categoryBudgets ?? []).map((cb) => (
              <div
                key={cb.id}
                className="rounded-lg border border-[#D4C9B0] bg-[#FDFAF4] p-4 dark:border-stone-700 dark:bg-stone-900/60"
              >
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-medium text-[#3D3020] dark:text-stone-100">
                    {cb.categoryName ??
                      t("settings.budget.categoryLimit")}
                  </h3>
                  <div className="flex items-center gap-0.5">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => {
                        setEditCategoryBudgetId(cb.id);
                        setEditCategoryBudgetAmount(
                          formatAmount(cb.limitAmount),
                        );
                      }}
                      aria-label={t("settings.budget.editCategoryBudget")}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950 dark:hover:text-red-400"
                      onClick={() => setDeleteCategoryId(cb.id)}
                      aria-label={t("settings.budget.deleteCategoryBudget")}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-xs text-[#6B5E4E] dark:text-stone-400">
                    ฿{formatAmount(cb.spent)} / ฿
                    {formatAmount(cb.limitAmount)}
                  </span>
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${indicatorBadgeClass(cb.indicator)}`}
                  >
                    {indicatorLabel(cb.indicator, t)}
                  </span>
                </div>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-[#E8E0D0] dark:bg-stone-700">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${indicatorColor(cb.indicator)}`}
                    style={{
                      width: `${Math.min(100, cb.progress * 100)}%`,
                    }}
                  />
                </div>
                <p className="mt-1 text-right text-xs text-[#A09080] dark:text-stone-400">
                  {Math.round(cb.progress * 100)}%
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Templates */}
      <section className="rounded-lg border border-[#D4C9B0] bg-[#F5F0E8]/50 p-6 dark:border-stone-700 dark:bg-stone-900/30">
        <div className="flex items-center justify-between gap-2 mb-4">
          <h2 className="text-sm font-medium text-[#3D3020] dark:text-stone-100">
            {t("settings.budget.templates")}
          </h2>
          <Button variant="outline" size="sm" onClick={openCreateTemplate}>
            <Plus className="h-4 w-4" />
            {t("settings.budget.addTemplate")}
          </Button>
        </div>

        {/* Apply template callout */}
        {!loadingTemplates && templates.length > 0 && (
          <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-[#5C6B52]/30 bg-[#5C6B52]/5 p-3 dark:border-stone-600 dark:bg-stone-800/30">
            <span className="text-xs font-medium text-[#3D3020] dark:text-stone-200">
              {t("settings.budget.applyTemplate")}:
            </span>
            <select
              value={applyTemplateId}
              onChange={(e) => setApplyTemplateId(e.target.value)}
              className="h-8 min-w-[140px] flex-1 rounded-md border border-[#D4C9B0] bg-[#FDFAF4] px-2.5 text-sm outline-none focus:ring-2 focus:ring-ring dark:border-stone-700 dark:bg-stone-900"
              aria-label={t("settings.budget.applyTemplate")}
            >
              <option value="">
                {t("settings.budget.templates")}…
              </option>
              {templates.map((tm) => (
                <option key={tm.id} value={tm.id}>
                  {tm.name}
                </option>
              ))}
            </select>
            <Button
              size="sm"
              onClick={handleApplyTemplate}
              disabled={!applyTemplateId || applying}
            >
              {applying ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                t("settings.budget.applyTemplate")
              )}
            </Button>
          </div>
        )}

        {loadingTemplates ? (
          <div className="space-y-2">
            <Skeleton className="h-12 w-full rounded-md" />
            <Skeleton className="h-12 w-full rounded-md" />
          </div>
        ) : templates.length === 0 ? (
          <p className="text-sm text-[#6B5E4E] dark:text-stone-400">
            {t("settings.budget.noTemplates")}
          </p>
        ) : (
          <ul className="space-y-2">
            {templates.map((tm) => (
              <li
                key={tm.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-[#D4C9B0] bg-[#FDFAF4] px-3 py-2.5 dark:border-stone-700 dark:bg-stone-900/60"
              >
                <div className="min-w-0">
                  <span className="text-sm font-medium text-[#3D3020] dark:text-stone-100">
                    {tm.name}
                  </span>
                  <span className="ml-2 text-xs text-[#A09080] dark:text-stone-400">
                    {tm.totalBudget != null
                      ? `฿${formatAmount(tm.totalBudget)}`
                      : ""}
                    {tm.categoryLimits.length > 0 &&
                      ` · ${tm.categoryLimits.length} ${t("settings.budget.categoryLimit")}(s)`}
                  </span>
                </div>
                <div className="flex items-center gap-0.5">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => openEditTemplate(tm)}
                    aria-label={t("settings.budget.editTemplate")}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => setDeleteTemplateId(tm.id)}
                    aria-label={t("settings.budget.deleteTemplate")}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Create / Edit template dialog */}
      <Dialog
        open={createTemplateOpen}
        onOpenChange={(open) => {
          if (!open) {
            setCreateTemplateOpen(false);
            setEditTemplateId(null);
          }
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md max-md:inset-0 max-md:translate-none max-md:h-dvh max-md:max-h-none max-md:w-full max-md:max-w-none max-md:rounded-none">
          <DialogHeader>
            <DialogTitle>
              {editTemplateId
                ? t("settings.budget.editTemplate")
                : t("settings.budget.createTemplate")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="template-form-name">
                {t("settings.budget.templateName")}
              </Label>
              <Input
                id="template-form-name"
                value={templateFormName}
                onChange={(e) => setTemplateFormName(e.target.value)}
                placeholder={t("settings.budget.templateName")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="template-form-total">
                {t("settings.budget.totalBudget")} (฿)
              </Label>
              <Input
                id="template-form-total"
                type="text"
                inputMode="decimal"
                placeholder="0"
                value={templateFormTotalBudget}
                onChange={(e) =>
                  setTemplateFormTotalBudget(e.target.value)
                }
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>
                  {t("settings.budget.categoryLimit")}
                </Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addTemplateLimitRow}
                >
                  <Plus className="h-4 w-4" />
                  {t("settings.budget.addLimitRow")}
                </Button>
              </div>
              <ul className="space-y-2">
                {templateFormCategoryLimits.map((row, index) => (
                  <li
                    key={index}
                    className="flex flex-wrap items-center gap-2"
                  >
                    <select
                      value={row.categoryId}
                      onChange={(e) =>
                        updateTemplateLimitRow(
                          index,
                          "categoryId",
                          e.target.value,
                        )
                      }
                      className="h-9 flex-1 min-w-[120px] rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="">—</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                    <Input
                      type="text"
                      inputMode="decimal"
                      placeholder="0"
                      className="w-28 font-mono"
                      value={row.limitAmount}
                      onChange={(e) =>
                        updateTemplateLimitRow(
                          index,
                          "limitAmount",
                          e.target.value,
                        )
                      }
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      onClick={() => removeTemplateLimitRow(index)}
                      disabled={
                        templateFormCategoryLimits.length <= 1
                      }
                      aria-label={t("common.actions.delete")}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCreateTemplateOpen(false);
                setEditTemplateId(null);
              }}
            >
              {t("common.actions.cancel")}
            </Button>
            <Button
              onClick={handleSaveTemplate}
              disabled={savingTemplate}
            >
              {savingTemplate ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                t("common.actions.save")
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete template confirm */}
      <AlertDialog
        open={deleteTemplateId !== null}
        onOpenChange={(open) => !open && setDeleteTemplateId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("settings.budget.deleteTemplate")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("settings.budget.templateDeleteConfirm")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingTemplate}>
              {t("common.actions.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteTemplate}
              disabled={deletingTemplate}
              className="bg-red-600 hover:bg-red-700"
            >
              {deletingTemplate ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                t("common.actions.delete")
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add category budget dialog */}
      <Dialog open={addCategoryOpen} onOpenChange={setAddCategoryOpen}>
        <DialogContent className="sm:max-w-md max-md:inset-0 max-md:translate-none max-md:h-dvh max-md:max-h-none max-md:w-full max-md:max-w-none max-md:rounded-none">
          <DialogHeader>
            <DialogTitle>
              {t("settings.budget.addCategoryBudget")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{t("settings.categories.title")}</Label>
              <select
                value={newCategoryId}
                onChange={(e) => setNewCategoryId(e.target.value)}
                className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">
                  {t("settings.budget.categoryLimit")}
                </option>
                {categories
                  .filter((c) => !existingCategoryIds.has(c.id))
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>
                {t("settings.budget.categoryLimit")} (฿)
              </Label>
              <Input
                type="text"
                inputMode="decimal"
                placeholder="0"
                value={newCategoryAmount}
                onChange={(e) => setNewCategoryAmount(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAddCategoryOpen(false)}
            >
              {t("common.actions.cancel")}
            </Button>
            <Button
              onClick={handleAddCategoryBudget}
              disabled={savingCategory}
            >
              {savingCategory ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                t("common.actions.save")
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit category budget dialog */}
      <Dialog
        open={editCategoryBudgetId !== null}
        onOpenChange={(open) => {
          if (!open) {
            setEditCategoryBudgetId(null);
            setEditCategoryBudgetAmount("");
          }
        }}
      >
        <DialogContent className="sm:max-w-md max-md:inset-0 max-md:translate-none max-md:h-dvh max-md:max-h-none max-md:w-full max-md:max-w-none max-md:rounded-none">
          <DialogHeader>
            <DialogTitle>
              {t("settings.budget.editCategoryBudget")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-category-limit">
                {t("settings.budget.categoryLimit")} (฿)
              </Label>
              <Input
                id="edit-category-limit"
                type="text"
                inputMode="decimal"
                placeholder="0"
                value={editCategoryBudgetAmount}
                onChange={(e) =>
                  setEditCategoryBudgetAmount(e.target.value)
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEditCategoryBudgetId(null);
                setEditCategoryBudgetAmount("");
              }}
            >
              {t("common.actions.cancel")}
            </Button>
            <Button
              onClick={handleSaveEditCategoryBudget}
              disabled={savingEditCategory}
            >
              {savingEditCategory ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                t("common.actions.save")
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete category budget confirm */}
      <AlertDialog
        open={deleteCategoryId !== null}
        onOpenChange={(open) => !open && setDeleteCategoryId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("settings.budget.deleteCategoryBudget")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("settings.budget.deleteCategoryBudgetConfirm")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {t("common.actions.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                deleteCategoryId &&
                handleDeleteCategoryBudget(deleteCategoryId)
              }
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                t("common.actions.delete")
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
