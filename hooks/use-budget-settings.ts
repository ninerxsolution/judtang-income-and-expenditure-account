"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { formatYearForDisplay } from "@/lib/format-year";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import { useI18n } from "@/hooks/use-i18n";
import { formatAmount } from "@/lib/format";
import { readErrorMessageFromResponse } from "@/lib/fetch-json";
import { parseAmountInput } from "@/lib/parse-amount";
import { parseIntSearchParam } from "@/lib/url-params";
import {
  getRecentCategoryIds,
  saveRecentCategoryId,
  sortCategoriesByRecent,
} from "@/lib/recent-categories";
import type {
  BudgetTemplate,
  BudgetResponse,
  BudgetCoverageResponse,
  Category,
  TemplateFormCategoryRow,
} from "@/components/dashboard/budget/types";

export function useBudgetSettings() {
  const { t, language } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [templates, setTemplates] = useState<BudgetTemplate[]>([]);
  const [budget, setBudget] = useState<BudgetResponse | null>(null);
  const [coverage, setCoverage] = useState<BudgetCoverageResponse | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryMruTick, setCategoryMruTick] = useState(0);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [loadingBudget, setLoadingBudget] = useState(true);
  const [loadingCoverage, setLoadingCoverage] = useState(true);
  const [, setLoadingCategories] = useState(true);
  const [initializedFromQuery, setInitializedFromQuery] = useState(false);
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
  const [templateFormCategoryLimits, setTemplateFormCategoryLimits] = useState<
    TemplateFormCategoryRow[]
  >([{ categoryId: "", limitAmount: "" }]);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [editCategoryBudgetId, setEditCategoryBudgetId] = useState<string | null>(
    null,
  );
  const [editCategoryBudgetAmount, setEditCategoryBudgetAmount] = useState("");
  const [savingEditCategory, setSavingEditCategory] = useState(false);
  const [editTotalBudgetOpen, setEditTotalBudgetOpen] = useState(false);
  const [editTotalBudgetAmount, setEditTotalBudgetAmount] = useState("");
  const [deletingTemplate, setDeletingTemplate] = useState(false);
  const [templatesDialogOpen, setTemplatesDialogOpen] = useState(false);

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

  const fetchCoverage = useCallback(async () => {
    setLoadingCoverage(true);
    try {
      const res = await fetch(`/api/budgets/coverage?year=${year}`);
      if (!res.ok) throw new Error("Failed to load budget coverage");
      const data: BudgetCoverageResponse = await res.json();
      setCoverage(data);
    } catch {
      toast.error(t("common.errors.generic"));
    } finally {
      setLoadingCoverage(false);
    }
  }, [year, t]);

  const fetchCategories = useCallback(async () => {
    setLoadingCategories(true);
    try {
      const res = await fetch("/api/categories");
      if (!res.ok) throw new Error("Failed to load categories");
      const data: Category[] = await res.json();
      setCategories(data);
    } catch {
      toast.error(t("common.errors.generic"));
    } finally {
      setLoadingCategories(false);
    }
  }, [t]);

  useEffect(() => {
    void fetchTemplates();
  }, [fetchTemplates]);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const yearParam = parseIntSearchParam(searchParams.get("year"));
    const monthParam = parseIntSearchParam(searchParams.get("month"));

    if (yearParam != null) {
      setYear(yearParam);
    }
    if (monthParam != null && monthParam >= 1 && monthParam <= 12) {
      setMonth(monthParam);
    }

    setInitializedFromQuery(true);
  }, []);

  useEffect(() => {
    if (!initializedFromQuery) return;
    void fetchBudget();
  }, [fetchBudget, initializedFromQuery]);

  useEffect(() => {
    if (!initializedFromQuery) return;
    void fetchCoverage();
  }, [fetchCoverage, initializedFromQuery]);

  useEffect(() => {
    void fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    if (!initializedFromQuery) return;

    const searchParams = new URLSearchParams(window.location.search);
    searchParams.set("year", String(year));
    searchParams.set("month", String(month));

    const query = searchParams.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, {
      scroll: false,
    });
  }, [initializedFromQuery, month, pathname, router, year]);

  const budgetMonthId = budget?.budgetMonth?.id;

  const categoryRecentIds = useMemo(
    () => getRecentCategoryIds(),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- categories + tick re-snapshot MRU from localStorage
    [categories, categoryMruTick],
  );

  const sortedCategoriesForPicker = useMemo(
    () => sortCategoriesByRecent(categories, categoryRecentIds),
    [categories, categoryRecentIds],
  );

  const sortedAvailableCategoriesForBudget = useMemo(() => {
    const ids = new Set(
      (budget?.categoryBudgets ?? [])
        .map((cb) => cb.categoryId)
        .filter((id): id is string => Boolean(id)),
    );
    const available = categories.filter((c) => !ids.has(c.id));
    return sortCategoriesByRecent(available, categoryRecentIds);
  }, [categories, budget, categoryRecentIds]);

  const totalBudgetNum = budget?.totalBudget ?? null;
  const totalSpent = budget?.totalSpent ?? 0;

  const selectedPeriodLabel = useMemo(() => {
    const selectedMonthLabel = t(`summary.months.${month - 1}`);
    return `${selectedMonthLabel} ${formatYearForDisplay(year, language)}`;
  }, [t, month, year, language]);

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

  function openEditTotalBudgetDialog() {
    setEditTotalBudgetAmount(
      totalBudgetNum != null && totalBudgetNum > 0
        ? formatAmount(totalBudgetNum)
        : "",
    );
    setEditTotalBudgetOpen(true);
  }

  async function handleSaveTotalBudgetFromDialog() {
    const trimmed = editTotalBudgetAmount.replace(/,/g, "").trim();
    const num = trimmed === "" ? 0 : parseAmountInput(editTotalBudgetAmount);
    if (!Number.isFinite(num) || num < 0) {
      toast.error(t("settings.budget.errorTotalBudgetNonNegative"));
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
        const msg = await readErrorMessageFromResponse(res);
        throw new Error(msg ?? t("common.errors.generic"));
      }
      toast.success(t("settings.budget.saveSuccess"));
      setEditTotalBudgetOpen(false);
      setEditTotalBudgetAmount("");
      await Promise.all([fetchBudget(), fetchCoverage()]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("common.errors.generic"));
    } finally {
      setSavingTotal(false);
    }
  }

  async function handleApplyTemplate() {
    if (!applyTemplateId) {
      toast.error(t("settings.budget.errorSelectTemplate"));
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
        const msg = await readErrorMessageFromResponse(res);
        throw new Error(msg ?? t("common.errors.generic"));
      }
      toast.success(t("settings.budget.applyTemplateSuccess"));
      setApplyTemplateId("");
      await Promise.all([fetchBudget(), fetchCoverage()]);
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
    if (field === "categoryId" && value.trim()) {
      saveRecentCategoryId(value);
      setCategoryMruTick((tick) => tick + 1);
    }
    setTemplateFormCategoryLimits((prev) =>
      prev.map((row, i) => (i === index ? { ...row, [field]: value } : row)),
    );
  }

  async function handleSaveTemplate() {
    const name = templateFormName.trim();
    if (!name) {
      toast.error(t("settings.budget.errorTemplateNameRequired"));
      return;
    }
    const totalBudgetParsed =
      templateFormTotalBudget.trim() !== ""
        ? parseAmountInput(templateFormTotalBudget)
        : NaN;
    const totalBudget =
      Number.isFinite(totalBudgetParsed) && totalBudgetParsed > 0
        ? totalBudgetParsed
        : null;
    const limits = templateFormCategoryLimits
      .filter((row) => {
        const amt = parseAmountInput(row.limitAmount);
        return row.categoryId.trim() !== "" && Number.isFinite(amt) && amt > 0;
      })
      .map((row) => ({
        categoryId: row.categoryId.trim(),
        limitAmount: parseAmountInput(row.limitAmount),
      }));
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
          const msg = await readErrorMessageFromResponse(res);
          throw new Error(msg ?? t("common.errors.generic"));
        }
        toast.success(t("settings.budget.saveSuccess"));
        setCreateTemplateOpen(false);
        setEditTemplateId(null);
        void fetchTemplates();
      } else {
        const res = await fetch("/api/budget-templates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, totalBudget, categoryLimits }),
        });
        if (!res.ok) {
          const msg = await readErrorMessageFromResponse(res);
          throw new Error(msg ?? t("common.errors.generic"));
        }
        toast.success(t("settings.budget.saveSuccess"));
        setCreateTemplateOpen(false);
        void fetchTemplates();
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("common.errors.generic"));
    } finally {
      setSavingTemplate(false);
    }
  }

  async function handleDeleteTemplate() {
    if (!deleteTemplateId) return;
    setDeletingTemplate(true);
    try {
      const res = await fetch(`/api/budget-templates/${deleteTemplateId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success(t("settings.budget.deleteSuccess"));
      setDeleteTemplateId(null);
      void fetchTemplates();
    } catch {
      toast.error(t("common.errors.generic"));
    } finally {
      setDeletingTemplate(false);
    }
  }

  async function handleSaveEditCategoryBudget() {
    if (!editCategoryBudgetId) return;
    const num = parseAmountInput(editCategoryBudgetAmount);
    if (!Number.isFinite(num) || num <= 0) {
      toast.error(t("settings.budget.errorCategoryLimitPositive"));
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
        const msg = await readErrorMessageFromResponse(res);
        throw new Error(msg ?? t("common.errors.generic"));
      }
      toast.success(t("settings.budget.saveSuccess"));
      setEditCategoryBudgetId(null);
      setEditCategoryBudgetAmount("");
      await Promise.all([fetchBudget(), fetchCoverage()]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("common.errors.generic"));
    } finally {
      setSavingEditCategory(false);
    }
  }

  async function handleAddCategoryBudget() {
    const num = parseAmountInput(newCategoryAmount);
    if (!newCategoryId || !Number.isFinite(num) || num <= 0) {
      toast.error(t("settings.budget.errorCategoryBudgetAdd"));
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
        const msg = await readErrorMessageFromResponse(res);
        throw new Error(msg ?? t("common.errors.generic"));
      }
      toast.success(t("settings.budget.saveSuccess"));
      setNewCategoryId("");
      setNewCategoryAmount("");
      setAddCategoryOpen(false);
      await Promise.all([fetchBudget(), fetchCoverage()]);
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
      await Promise.all([fetchBudget(), fetchCoverage()]);
    } catch {
      toast.error(t("common.errors.generic"));
    } finally {
      setDeleting(false);
    }
  }

  return {
    t,
    language,
    year,
    month,
    setYear,
    setMonth,
    templates,
    budget,
    coverage,
    setCategoryMruTick,
    loadingTemplates,
    loadingBudget,
    loadingCoverage,
    initializedFromQuery,
    savingTotal,
    applyTemplateId,
    setApplyTemplateId,
    applying,
    addCategoryOpen,
    setAddCategoryOpen,
    newCategoryId,
    setNewCategoryId,
    newCategoryAmount,
    setNewCategoryAmount,
    savingCategory,
    deleteCategoryId,
    setDeleteCategoryId,
    deleting,
    createTemplateOpen,
    setCreateTemplateOpen,
    editTemplateId,
    setEditTemplateId,
    deleteTemplateId,
    setDeleteTemplateId,
    templateFormName,
    setTemplateFormName,
    templateFormTotalBudget,
    setTemplateFormTotalBudget,
    templateFormCategoryLimits,
    setTemplateFormCategoryLimits,
    savingTemplate,
    editCategoryBudgetId,
    setEditCategoryBudgetId,
    editCategoryBudgetAmount,
    setEditCategoryBudgetAmount,
    savingEditCategory,
    editTotalBudgetOpen,
    setEditTotalBudgetOpen,
    editTotalBudgetAmount,
    setEditTotalBudgetAmount,
    deletingTemplate,
    templatesDialogOpen,
    setTemplatesDialogOpen,
    sortedCategoriesForPicker,
    sortedAvailableCategoriesForBudget,
    goToPreviousMonth,
    goToNextMonth,
    openEditTotalBudgetDialog,
    handleSaveTotalBudgetFromDialog,
    handleApplyTemplate,
    openCreateTemplate,
    openEditTemplate,
    addTemplateLimitRow,
    removeTemplateLimitRow,
    updateTemplateLimitRow,
    handleSaveTemplate,
    handleDeleteTemplate,
    handleSaveEditCategoryBudget,
    handleAddCategoryBudget,
    handleDeleteCategoryBudget,
    totalBudgetNum,
    totalSpent,
    selectedPeriodLabel,
  };
}
