/**
 * @jest-environment node
 */
const mockAggregate = jest.fn();
const mockGroupBy = jest.fn();
const mockBudgetMonthFindUnique = jest.fn();
const mockBudgetMonthFindMany = jest.fn();

jest.mock("@/lib/prisma", () => ({
  prisma: {
    transaction: {
      aggregate: (...args: unknown[]) => mockAggregate(...args),
      groupBy: (...args: unknown[]) => mockGroupBy(...args),
    },
    budgetMonth: {
      findUnique: (...args: unknown[]) => mockBudgetMonthFindUnique(...args),
      findMany: (...args: unknown[]) => mockBudgetMonthFindMany(...args),
    },
  },
}));

import {
  getBudgetIndicator,
  getMonthDateRange,
  getTotalExpenseForMonth,
  getExpenseByCategoryForMonth,
  getBudgetForMonth,
  getBudgetCoverageForYear,
} from "../budget";

beforeEach(() => jest.clearAllMocks());

describe("budget", () => {
  describe("getBudgetIndicator", () => {
    it("returns normal when progress < 0.7", () => {
      expect(getBudgetIndicator(0)).toBe("normal");
      expect(getBudgetIndicator(0.5)).toBe("normal");
      expect(getBudgetIndicator(0.69)).toBe("normal");
    });

    it("returns warning when 0.7 <= progress < 0.9", () => {
      expect(getBudgetIndicator(0.7)).toBe("warning");
      expect(getBudgetIndicator(0.8)).toBe("warning");
      expect(getBudgetIndicator(0.89)).toBe("warning");
    });

    it("returns critical when 0.9 <= progress < 1", () => {
      expect(getBudgetIndicator(0.9)).toBe("critical");
      expect(getBudgetIndicator(0.95)).toBe("critical");
      expect(getBudgetIndicator(0.99)).toBe("critical");
    });

    it("returns over when progress >= 1", () => {
      expect(getBudgetIndicator(1)).toBe("over");
      expect(getBudgetIndicator(1.2)).toBe("over");
    });
  });

  describe("getMonthDateRange", () => {
    it("returns start and end of month for month 1-12", () => {
      const { from, to } = getMonthDateRange(2026, 1);
      expect(from.getFullYear()).toBe(2026);
      expect(from.getMonth()).toBe(0);
      expect(from.getDate()).toBe(1);
      expect(from.getHours()).toBe(0);
      expect(from.getMinutes()).toBe(0);
      expect(to.getFullYear()).toBe(2026);
      expect(to.getMonth()).toBe(0);
      expect(to.getDate()).toBe(31);
      expect(to.getHours()).toBe(23);
      expect(to.getMinutes()).toBe(59);
    });

    it("returns correct last day for February (non-leap)", () => {
      const { to } = getMonthDateRange(2025, 2);
      expect(to.getDate()).toBe(28);
    });

    it("returns correct last day for February (leap year)", () => {
      const { to } = getMonthDateRange(2024, 2);
      expect(to.getDate()).toBe(29);
    });

    it("returns correct range for December", () => {
      const { from, to } = getMonthDateRange(2026, 12);
      expect(from.getMonth()).toBe(11);
      expect(from.getDate()).toBe(1);
      expect(to.getMonth()).toBe(11);
      expect(to.getDate()).toBe(31);
    });
  });

  describe("getTotalExpenseForMonth", () => {
    it("returns 0 when no expenses", async () => {
      mockAggregate.mockResolvedValue({ _sum: { amount: null } });
      const result = await getTotalExpenseForMonth("user-1", 2025, 6);
      expect(result).toBe(0);
    });

    it("returns sum of expenses", async () => {
      mockAggregate.mockResolvedValue({ _sum: { amount: 15000 } });
      const result = await getTotalExpenseForMonth("user-1", 2025, 6);
      expect(result).toBe(15000);
    });
  });

  describe("getExpenseByCategoryForMonth", () => {
    it("returns empty map when no expenses", async () => {
      mockGroupBy.mockResolvedValue([]);
      const result = await getExpenseByCategoryForMonth("user-1", 2025, 6);
      expect(result.size).toBe(0);
    });

    it("returns map with category totals", async () => {
      mockGroupBy.mockResolvedValue([
        { categoryId: "cat-1", _sum: { amount: 5000 } },
        { categoryId: null, _sum: { amount: 2000 } },
      ]);
      const result = await getExpenseByCategoryForMonth("user-1", 2025, 6);
      expect(result.get("cat-1")).toBe(5000);
      expect(result.get(null)).toBe(2000);
    });
  });

  describe("getBudgetForMonth", () => {
    it("returns structure with null budgetMonth when none exists", async () => {
      mockBudgetMonthFindUnique.mockResolvedValue(null);
      mockAggregate.mockResolvedValue({ _sum: { amount: 3000 } });
      mockGroupBy.mockResolvedValue([]);
      const result = await getBudgetForMonth("user-1", 2025, 6);
      expect(result.budgetMonth).toBeNull();
      expect(result.totalSpent).toBe(3000);
      expect(result.totalBudget).toBeNull();
      expect(result.totalProgress).toBe(0);
      expect(result.categoryBudgets).toEqual([]);
    });

    it("calculates progress when budget exists", async () => {
      mockBudgetMonthFindUnique.mockResolvedValue({
        id: "bm-1",
        year: 2025,
        month: 6,
        totalBudget: 50000,
        createdAt: new Date(),
        updatedAt: new Date(),
        categoryBudgets: [
          {
            id: "bc-1",
            categoryId: "cat-1",
            limitAmount: 10000,
            category: { id: "cat-1", name: "Food" },
          },
        ],
      });
      mockAggregate.mockResolvedValue({ _sum: { amount: 35000 } });
      mockGroupBy.mockResolvedValue([
        { categoryId: "cat-1", _sum: { amount: 8000 } },
      ]);

      const result = await getBudgetForMonth("user-1", 2025, 6);
      expect(result.totalBudget).toBe(50000);
      expect(result.totalSpent).toBe(35000);
      expect(result.totalProgress).toBe(0.7);
      expect(result.totalIndicator).toBe("warning");
      expect(result.categoryBudgets).toHaveLength(1);
      expect(result.categoryBudgets[0].spent).toBe(8000);
      expect(result.categoryBudgets[0].remaining).toBe(2000);
    });
  });

  describe("getBudgetCoverageForYear", () => {
    it("returns all 12 months with configured states", async () => {
      const updatedAt = new Date("2026-03-05T12:00:00.000Z");
      mockBudgetMonthFindMany.mockResolvedValue([
        {
          month: 1,
          totalBudget: 15000,
          updatedAt,
          _count: { categoryBudgets: 0 },
        },
        {
          month: 2,
          totalBudget: null,
          updatedAt,
          _count: { categoryBudgets: 2 },
        },
        {
          month: 3,
          totalBudget: 0,
          updatedAt,
          _count: { categoryBudgets: 0 },
        },
      ]);

      const result = await getBudgetCoverageForYear("user-1", 2026);

      expect(result.year).toBe(2026);
      expect(result.months).toHaveLength(12);
      expect(result.configuredMonthCount).toBe(2);
      expect(result.months[0]).toEqual({
        month: 1,
        hasTotalBudget: true,
        categoryBudgetCount: 0,
        isConfigured: true,
        updatedAt,
      });
      expect(result.months[1]).toEqual({
        month: 2,
        hasTotalBudget: false,
        categoryBudgetCount: 2,
        isConfigured: true,
        updatedAt,
      });
      expect(result.months[2]).toEqual({
        month: 3,
        hasTotalBudget: false,
        categoryBudgetCount: 0,
        isConfigured: false,
        updatedAt,
      });
      expect(result.months[11]).toEqual({
        month: 12,
        hasTotalBudget: false,
        categoryBudgetCount: 0,
        isConfigured: false,
        updatedAt: null,
      });
    });
  });
});
