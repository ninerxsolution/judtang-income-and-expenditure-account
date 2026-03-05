"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ChevronLeft, Wallet, Plus, Trash2, Loader2, Pencil } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

function indicatorLabel(indicator: string, t: (key: string) => string): string {
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
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [savingTotal, setSavingTotal] = useState(false);
  const [applyTemplateId, setApplyTemplateId] = useState<string>("");
  const [applying, setApplying] = useState(false);
  const [addCategoryOpen, setAddCategoryOpen] = useState(false);
  const [newCategoryId, setNewCategoryId] = useState("");
  const [newCategoryAmount, setNewCategoryAmount] = useState("");
  const [savingCategory, setSavingCategory] = useState(false);
  const [deleteCategoryId, setDeleteCategoryId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [createTemplateOpen, setCreateTemplateOpen] = useState(false);
  const [editTemplateId, setEditTemplateId] = useState<string | null>(null);
  const [deleteTemplateId, setDeleteTemplateId] = useState<string | null>(null);
  const [templateFormName, setTemplateFormName] = useState("");
  const [templateFormTotalBudget, setTemplateFormTotalBudget] = useState("");
  const [templateFormCategoryLimits, setTemplateFormCategoryLimits] = useState<Array<{ categoryId: string; limitAmount: string }>>([{ categoryId: "", limitAmount: "" }]);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [editCategoryBudgetId, setEditCategoryBudgetId] = useState<string | null>(null);
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
      const res = await fetch(
        `/api/budgets?year=${year}&month=${month}`,
      );
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

  async function handleSaveTotalBudget() {
    const value = budget?.totalBudget ?? 0;
    const input = document.getElementById("total-budget-input") as HTMLInputElement | null;
    const raw = input?.value?.replace(/,/g, "")?.trim();
    const num = raw ? parseFloat(raw) : 0;
    if (!Number.isFinite(num) || num < 0) {
      toast.error(t("settings.budget.totalBudget") + " must be a non-negative number");
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
        throw new Error(j.error ?? "Failed to save");
      }
      toast.success(t("settings.budget.saveSuccess"));
      fetchBudget();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("common.errors.generic"));
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
        throw new Error(j.error ?? "Failed to apply");
      }
      toast.success(t("settings.budget.applyTemplateSuccess"));
      setApplyTemplateId("");
      fetchBudget();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("common.errors.generic"));
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
    setTemplateFormTotalBudget(tm.totalBudget != null ? String(tm.totalBudget) : "");
    setTemplateFormCategoryLimits(
      tm.categoryLimits.length > 0
        ? tm.categoryLimits.map((cl) => ({ categoryId: cl.categoryId ?? "", limitAmount: String(cl.limitAmount) }))
        : [{ categoryId: "", limitAmount: "" }],
    );
    setCreateTemplateOpen(true);
  }

  function addTemplateLimitRow() {
    setTemplateFormCategoryLimits((prev) => [...prev, { categoryId: "", limitAmount: "" }]);
  }

  function removeTemplateLimitRow(index: number) {
    setTemplateFormCategoryLimits((prev) => prev.filter((_, i) => i !== index));
  }

  function updateTemplateLimitRow(index: number, field: "categoryId" | "limitAmount", value: string) {
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
      templateFormTotalBudget.trim() !== "" ? parseFloat(templateFormTotalBudget.replace(/,/g, "")) : NaN;
    const totalBudget =
      Number.isFinite(totalBudgetNum) && totalBudgetNum > 0 ? totalBudgetNum : null;
    const limits = templateFormCategoryLimits
      .filter((row) => row.categoryId.trim() !== "" && Number.isFinite(parseFloat(row.limitAmount.replace(/,/g, ""))) && parseFloat(row.limitAmount.replace(/,/g, "")) > 0)
      .map((row) => ({ categoryId: row.categoryId.trim(), limitAmount: parseFloat(row.limitAmount.replace(/,/g, "")) }));
    const categoryLimits = Array.from(
      new Map(limits.map((l) => [l.categoryId, l.limitAmount])).entries(),
    ).map(([categoryId, limitAmount]) => ({ categoryId, limitAmount }));

    setSavingTemplate(true);
    try {
      if (editTemplateId) {
        const res = await fetch(`/api/budget-templates/${editTemplateId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, totalBudget, categoryLimits }),
        });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j.error ?? "Failed to update");
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
          throw new Error(j.error ?? "Failed to create");
        }
        toast.success(t("settings.budget.saveSuccess"));
        setCreateTemplateOpen(false);
        fetchTemplates();
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("common.errors.generic"));
    } finally {
      setSavingTemplate(false);
    }
  }

  async function handleDeleteTemplate() {
    if (!deleteTemplateId) return;
    try {
      const res = await fetch(`/api/budget-templates/${deleteTemplateId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success(t("settings.budget.deleteSuccess"));
      setDeleteTemplateId(null);
      fetchTemplates();
    } catch {
      toast.error(t("common.errors.generic"));
    }
  }

  async function handleSaveEditCategoryBudget() {
    if (!editCategoryBudgetId) return;
    const num = parseFloat(editCategoryBudgetAmount.replace(/,/g, ""));
    if (!Number.isFinite(num) || num <= 0) {
      toast.error(t("settings.budget.categoryLimit") + " must be a positive number");
      return;
    }
    setSavingEditCategory(true);
    try {
      const res = await fetch(`/api/budgets/categories/${editCategoryBudgetId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limitAmount: num }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? "Failed to update");
      }
      toast.success(t("settings.budget.saveSuccess"));
      setEditCategoryBudgetId(null);
      setEditCategoryBudgetAmount("");
      fetchBudget();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("common.errors.generic"));
    } finally {
      setSavingEditCategory(false);
    }
  }

  async function handleAddCategoryBudget() {
    const num = parseFloat(newCategoryAmount.replace(/,/g, ""));
    if (!newCategoryId || !Number.isFinite(num) || num <= 0) {
      toast.error(t("settings.budget.categoryLimit") + " — category and amount required");
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
        throw new Error(j.error ?? "Failed to save");
      }
      toast.success(t("settings.budget.saveSuccess"));
      setNewCategoryId("");
      setNewCategoryAmount("");
      setAddCategoryOpen(false);
      fetchBudget();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("common.errors.generic"));
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

  return (
    <div className="space-y-6 pt-4 sm:pt-8">
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/settings"
          className="inline-flex items-center gap-1 text-sm text-[#6B5E4E] hover:text-[#3D3020] dark:text-stone-400 dark:hover:text-stone-100"
        >
          <ChevronLeft className="h-4 w-4" />
          {t("common.actions.back")}
        </Link>
      </div>

      <header className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#D4C9B0] bg-[#F5F0E8] dark:border-stone-700 dark:bg-stone-800">
          <Wallet className="h-5 w-5 text-[#5C6B52] dark:text-stone-300" />
        </div>
        <div>
          <h1 className="text-xl font-semibold">{t("settings.budget.title")}</h1>
          <p className="text-sm text-[#6B5E4E] dark:text-stone-400">
            {t("settings.budget.description")}
          </p>
        </div>
      </header>

      {/* Month selector */}
      <Card className="border-[#D4C9B0] dark:border-stone-700">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">
            {t("settings.budget.month")} / {t("settings.budget.year")}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Label htmlFor="budget-year" className="text-xs">
              {t("settings.budget.year")}
            </Label>
            <select
              id="budget-year"
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value, 10))}
              className="h-9 w-28 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus:ring-2 focus:ring-ring"
            >
              {[year - 2, year - 1, year, year + 1, year + 2].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="budget-month" className="text-xs">
              {t("settings.budget.month")}
            </Label>
            <select
              id="budget-month"
              value={month}
              onChange={(e) => setMonth(parseInt(e.target.value, 10))}
              className="h-9 w-36 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus:ring-2 focus:ring-ring"
            >
              {MONTHS.map((m) => (
                <option key={m} value={m}>
                  {new Date(year, m - 1, 1).toLocaleString(undefined, {
                    month: "long",
                  })}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Templates section */}
      <Card className="border-[#D4C9B0] dark:border-stone-700">
        <CardHeader className="pb-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-sm font-medium">
              {t("settings.budget.templates")}
            </CardTitle>
            <Button variant="outline" size="sm" onClick={openCreateTemplate}>
              {t("settings.budget.addTemplate")}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loadingTemplates ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading…
            </div>
          ) : templates.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("settings.budget.noTemplates")}</p>
          ) : (
            <ul className="space-y-2">
              {templates.map((tm) => (
                <li
                  key={tm.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-[#D4C9B0] dark:border-stone-700 p-2"
                >
                  <div className="min-w-0">
                    <span className="font-medium">{tm.name}</span>
                    <span className="ml-2 text-xs text-muted-foreground">
                      {tm.totalBudget != null
                        ? `${t("settings.budget.totalBudget")}: ${formatAmount(tm.totalBudget)}`
                        : ""}
                      {tm.categoryLimits.length > 0 &&
                        ` · ${tm.categoryLimits.length} ${t("settings.budget.categoryLimit")}(s)`}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
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
        </CardContent>
      </Card>

      {/* Apply template */}
      {!loadingTemplates && templates.length > 0 && (
        <Card className="border-[#D4C9B0] dark:border-stone-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              {t("settings.budget.applyTemplate")}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-2">
            <select
              value={applyTemplateId}
              onChange={(e) => setApplyTemplateId(e.target.value)}
              className="h-9 w-48 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">{t("settings.budget.templates")}</option>
              {templates.map((tm) => (
                <option key={tm.id} value={tm.id}>
                  {tm.name}
                </option>
              ))}
            </select>
            <Button
              onClick={handleApplyTemplate}
              disabled={!applyTemplateId || applying}
            >
              {applying ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                t("settings.budget.applyTemplate")
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Total budget card */}
      <Card className="border-[#D4C9B0] dark:border-stone-700">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">
            {t("settings.budget.totalBudget")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loadingBudget ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (
            <>
              <div className="flex flex-wrap items-end gap-2">
                <div className="space-y-1">
                  <Label htmlFor="total-budget-input" className="text-xs">
                    {t("settings.budget.totalBudget")} (฿)
                  </Label>
                  <Input
                    id="total-budget-input"
                    type="text"
                    inputMode="decimal"
                    placeholder="0"
                    defaultValue={totalBudgetNum != null ? formatAmount(totalBudgetNum) : ""}
                    className="w-40 font-mono"
                  />
                </div>
                <Button
                  onClick={handleSaveTotalBudget}
                  disabled={savingTotal}
                >
                  {savingTotal ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    t("common.actions.save")
                  )}
                </Button>
              </div>
              {totalBudgetNum != null && totalBudgetNum > 0 && (
                <div className="space-y-1">
                  <p className="text-sm">
                    {t("settings.budget.totalSpent")}: ฿ {formatAmount(totalSpent)} / ฿{" "}
                    {formatAmount(totalBudgetNum)}{" "}
                    <span
                      className={
                        budget?.totalIndicator === "over"
                          ? "text-red-600 dark:text-red-400"
                          : budget?.totalIndicator === "critical"
                            ? "text-orange-600 dark:text-orange-400"
                            : ""
                      }
                    >
                      ({Math.round((budget?.totalProgress ?? 0) * 100)}% —{" "}
                      {indicatorLabel(budget?.totalIndicator ?? "normal", t)})
                    </span>
                  </p>
                  <div className="h-2 w-full max-w-xs overflow-hidden rounded-full bg-[#E8E0D0] dark:bg-stone-700">
                    <div
                      className={`h-full ${indicatorColor(budget?.totalIndicator ?? "normal")}`}
                      style={{
                        width: `${Math.min(
                          100,
                          (budget?.totalProgress ?? 0) * 100,
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Category budgets */}
      <Card className="border-[#D4C9B0] dark:border-stone-700">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">
            {t("settings.budget.categoryLimit")}
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAddCategoryOpen(true)}
          >
            <Plus className="h-4 w-4" />
            {t("settings.budget.addCategoryBudget")}
          </Button>
        </CardHeader>
        <CardContent>
          {loadingBudget ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (budget?.categoryBudgets?.length ?? 0) === 0 ? (
            <p className="text-sm text-[#6B5E4E] dark:text-stone-400">
              {t("settings.budget.noCategoryBudgets")}
            </p>
          ) : (
            <ul className="space-y-3">
              {(budget?.categoryBudgets ?? []).map((cb) => (
                <li
                  key={cb.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-[#D4C9B0] bg-[#FDFAF4] px-3 py-2 dark:border-stone-700 dark:bg-stone-900/60"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">
                      {cb.categoryName ?? t("settings.budget.categoryLimit")}
                    </p>
                    <p className="text-xs text-[#6B5E4E] dark:text-stone-400">
                      ฿ {formatAmount(cb.spent)} / ฿ {formatAmount(cb.limitAmount)} (
                      {Math.round(cb.progress * 100)}% —{" "}
                      {indicatorLabel(cb.indicator, t)})
                    </p>
                    <div className="mt-1 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-[#E8E0D0] dark:bg-stone-700">
                      <div
                        className={`h-full ${indicatorColor(cb.indicator)}`}
                        style={{
                          width: `${Math.min(100, cb.progress * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => {
                        setEditCategoryBudgetId(cb.id);
                        setEditCategoryBudgetAmount(formatAmount(cb.limitAmount));
                      }}
                      aria-label={t("settings.budget.editCategoryBudget")}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950 dark:hover:text-red-400"
                      onClick={() => setDeleteCategoryId(cb.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

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
              <Label htmlFor="template-form-name">{t("settings.budget.templateName")}</Label>
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
                onChange={(e) => setTemplateFormTotalBudget(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>{t("settings.budget.categoryLimit")}</Label>
                <Button type="button" variant="outline" size="sm" onClick={addTemplateLimitRow}>
                  <Plus className="h-4 w-4" />
                  {t("settings.budget.addLimitRow")}
                </Button>
              </div>
              <ul className="space-y-2">
                {templateFormCategoryLimits.map((row, index) => (
                  <li key={index} className="flex flex-wrap items-center gap-2">
                    <select
                      value={row.categoryId}
                      onChange={(e) =>
                        updateTemplateLimitRow(index, "categoryId", e.target.value)
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
                        updateTemplateLimitRow(index, "limitAmount", e.target.value)
                      }
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      onClick={() => removeTemplateLimitRow(index)}
                      disabled={templateFormCategoryLimits.length <= 1}
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
            <Button onClick={handleSaveTemplate} disabled={savingTemplate}>
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
            <AlertDialogTitle>{t("settings.budget.deleteTemplate")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("settings.budget.templateDeleteConfirm")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingTemplate}>{t("common.actions.cancel")}</AlertDialogCancel>
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
            <DialogTitle>{t("settings.budget.addCategoryBudget")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{t("settings.categories.title")}</Label>
              <select
                value={newCategoryId}
                onChange={(e) => setNewCategoryId(e.target.value)}
                className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">{t("settings.budget.categoryLimit")}</option>
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
              <Label>{t("settings.budget.categoryLimit")} (฿)</Label>
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
            <Button onClick={handleAddCategoryBudget} disabled={savingCategory}>
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
            <DialogTitle>{t("settings.budget.editCategoryBudget")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-category-limit">{t("settings.budget.categoryLimit")} (฿)</Label>
              <Input
                id="edit-category-limit"
                type="text"
                inputMode="decimal"
                placeholder="0"
                value={editCategoryBudgetAmount}
                onChange={(e) => setEditCategoryBudgetAmount(e.target.value)}
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
            <Button onClick={handleSaveEditCategoryBudget} disabled={savingEditCategory}>
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
            <AlertDialogTitle>{t("common.actions.delete")}</AlertDialogTitle>
            <AlertDialogDescription>
              Remove this category budget for the selected month?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.actions.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                deleteCategoryId && handleDeleteCategoryBudget(deleteCategoryId)
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
