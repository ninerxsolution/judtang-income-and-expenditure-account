/**
 * Budget management: aggregation, progress calculation, template-apply.
 * Uses Transaction (EXPENSE only), BudgetMonth, BudgetCategory, BudgetTemplate.
 */
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const EXPENSE = "EXPENSE" as const;

/** Calendar month bounds in server local time (month 1–12). */
export function getMonthDateRange(year: number, month: number): { from: Date; to: Date } {
  const from = new Date(year, month - 1, 1, 0, 0, 0, 0);
  const to = new Date(year, month, 0, 23, 59, 59, 999);
  return { from, to };
}

/** Total expense for user in the given month (EXPENSE only). */
export async function getTotalExpenseForMonth(
  userId: string,
  year: number,
  month: number,
): Promise<number> {
  const { from, to } = getMonthDateRange(year, month);
  const result = await prisma.transaction.aggregate({
    where: {
      userId,
      type: EXPENSE,
      occurredAt: { gte: from, lte: to },
    },
    _sum: { amount: true },
  });
  return Number(result._sum.amount ?? 0);
}

/** Per-category expense for user in the given month. Keys: categoryId or "__uncategorized" for null. */
export async function getExpenseByCategoryForMonth(
  userId: string,
  year: number,
  month: number,
): Promise<Map<string | null, number>> {
  const { from, to } = getMonthDateRange(year, month);
  const rows = await prisma.transaction.groupBy({
    by: ["categoryId"],
    where: {
      userId,
      type: EXPENSE,
      occurredAt: { gte: from, lte: to },
    },
    _sum: { amount: true },
  });
  const map = new Map<string | null, number>();
  for (const r of rows) {
    const key = r.categoryId ?? null;
    map.set(key, Number(r._sum.amount ?? 0));
  }
  return map;
}

export type BudgetProgressIndicator = "normal" | "warning" | "critical" | "over";

/** Progress = spent / limit. PRD: <70% normal, 70–90% warning, >90% critical, >100% over. */
export function getBudgetIndicator(progress: number): BudgetProgressIndicator {
  if (progress >= 1) return "over";
  if (progress >= 0.9) return "critical";
  if (progress >= 0.7) return "warning";
  return "normal";
}

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

export type MonthBudgetWithActuals = {
  budgetMonth: {
    id: string;
    year: number;
    month: number;
    totalBudget: number | null;
    createdAt: Date;
    updatedAt: Date;
  } | null;
  totalSpent: number;
  totalBudget: number | null;
  totalProgress: number;
  totalIndicator: BudgetProgressIndicator;
  categoryBudgets: CategoryBudgetWithActual[];
};

/** Load budget for month and merge with actuals. Returns structure even when no BudgetMonth exists. */
export async function getBudgetForMonth(
  userId: string,
  year: number,
  month: number,
): Promise<MonthBudgetWithActuals> {
  const [budgetMonth, totalSpent, byCategory] = await Promise.all([
    prisma.budgetMonth.findUnique({
      where: { userId_year_month: { userId, year, month } },
      include: {
        categoryBudgets: {
          include: { category: { select: { id: true, name: true } } },
        },
      },
    }),
    getTotalExpenseForMonth(userId, year, month),
    getExpenseByCategoryForMonth(userId, year, month),
  ]);

  const totalBudget = budgetMonth?.totalBudget != null ? Number(budgetMonth.totalBudget) : null;
  const totalProgress =
    totalBudget != null && totalBudget > 0 ? totalSpent / totalBudget : 0;
  const totalIndicator = getBudgetIndicator(totalProgress);

  const categoryBudgets: CategoryBudgetWithActual[] = (budgetMonth?.categoryBudgets ?? []).map(
    (row) => {
      const categoryId = row.categoryId ?? null;
      const spent = Number(byCategory.get(categoryId) ?? 0);
      const limitAmount = Number(row.limitAmount);
      const remaining = Math.max(0, limitAmount - spent);
      const progress = limitAmount > 0 ? spent / limitAmount : 0;
      return {
        id: row.id,
        categoryId: row.categoryId,
        categoryName: row.category?.name ?? null,
        limitAmount,
        spent,
        remaining,
        progress,
        indicator: getBudgetIndicator(progress),
      };
    },
  );

  return {
    budgetMonth: budgetMonth
      ? {
          id: budgetMonth.id,
          year: budgetMonth.year,
          month: budgetMonth.month,
          totalBudget: budgetMonth.totalBudget != null ? Number(budgetMonth.totalBudget) : null,
          createdAt: budgetMonth.createdAt,
          updatedAt: budgetMonth.updatedAt,
        }
      : null,
    totalSpent,
    totalBudget,
    totalProgress,
    totalIndicator,
    categoryBudgets,
  };
}

/** Apply a template to a month: create/update BudgetMonth and BudgetCategory rows. Idempotent for same month (overwrites category limits from template). */
export async function applyTemplateToMonth(
  userId: string,
  templateId: string,
  year: number,
  month: number,
): Promise<{ budgetMonthId: string; appliedCategoryCount: number }> {
  const template = await prisma.budgetTemplate.findFirst({
    where: { id: templateId, userId, isActive: true },
    include: { categoryLimits: true },
  });
  if (!template) {
    throw new Error("Template not found or inactive");
  }

  const totalBudget = template.totalBudget != null ? new Prisma.Decimal(template.totalBudget) : null;

  const budgetMonth = await prisma.budgetMonth.upsert({
    where: { userId_year_month: { userId, year, month } },
    create: {
      userId,
      year,
      month,
      totalBudget,
    },
    update: { totalBudget },
  });

  // Replace category budgets for this month with template's category limits
  await prisma.budgetCategory.deleteMany({
    where: { budgetMonthId: budgetMonth.id },
  });

  let appliedCategoryCount = 0;
  if (template.categoryLimits.length > 0) {
    await prisma.budgetCategory.createMany({
      data: template.categoryLimits.map((cl) => ({
        budgetMonthId: budgetMonth.id,
        categoryId: cl.categoryId,
        limitAmount: cl.limitAmount,
      })),
    });
    appliedCategoryCount = template.categoryLimits.length;
  }

  return { budgetMonthId: budgetMonth.id, appliedCategoryCount };
}
