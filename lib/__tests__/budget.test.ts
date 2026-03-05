/**
 * @jest-environment node
 */
jest.mock("@/lib/prisma", () => ({
  prisma: {},
}));

import {
  getBudgetIndicator,
  getMonthDateRange,
} from "../budget";

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
});
