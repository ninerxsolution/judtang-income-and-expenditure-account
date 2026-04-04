import type { BudgetProgressIndicator } from "@/lib/budget-shared";

export type BudgetTemplate = {
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

export type CategoryBudgetWithActual = {
  id: string;
  categoryId: string | null;
  categoryName: string | null;
  limitAmount: number;
  spent: number;
  remaining: number;
  progress: number;
  indicator: BudgetProgressIndicator;
};

export type BudgetResponse = {
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
  totalIndicator: BudgetProgressIndicator;
  categoryBudgets: CategoryBudgetWithActual[];
};

export type BudgetCoverageMonth = {
  month: number;
  hasTotalBudget: boolean;
  categoryBudgetCount: number;
  isConfigured: boolean;
  updatedAt: string | null;
};

export type BudgetCoverageResponse = {
  year: number;
  configuredMonthCount: number;
  months: BudgetCoverageMonth[];
};

export type Category = { id: string; name: string };

export type TemplateFormCategoryRow = { categoryId: string; limitAmount: string };

export const BUDGET_PAGE_MONTHS = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12,
] as const;
