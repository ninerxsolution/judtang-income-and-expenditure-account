jest.mock("@/lib/prisma", () => ({ prisma: {} }));

import { getPeriodForClosingDate } from "../statement";
import { startOfDay, endOfDay, subMonths, addDays } from "date-fns";

describe("statement", () => {
  describe("getPeriodForClosingDate", () => {
    it("returns period with correct structure", () => {
      const closingDate = new Date("2025-02-28");
      const result = getPeriodForClosingDate(closingDate, 28, 15);

      expect(result).toHaveProperty("periodStart");
      expect(result).toHaveProperty("periodEnd");
      expect(result).toHaveProperty("closingDate");
      expect(result).toHaveProperty("dueDate");
    });
    it("periodStart is day after previous closing", () => {
      const closingDate = new Date("2025-02-28");
      const result = getPeriodForClosingDate(closingDate, 28, 15);

      const expectedPrevClosing = subMonths(startOfDay(closingDate), 1);
      const expectedPeriodStart = startOfDay(addDays(expectedPrevClosing, 1));
      expect(result.periodStart.getTime()).toBe(expectedPeriodStart.getTime());
    });
    it("periodEnd is end of closing date", () => {
      const closingDate = new Date("2025-02-28");
      const result = getPeriodForClosingDate(closingDate, 28, 15);

      const expectedEnd = endOfDay(closingDate);
      expect(result.periodEnd.getTime()).toBe(expectedEnd.getTime());
    });
    it("dueDate is in next month when dueDay <= statementClosingDay", () => {
      const closingDate = new Date("2025-02-28");
      const result = getPeriodForClosingDate(closingDate, 28, 15);

      expect(result.dueDate.getMonth()).toBe(2);
      expect(result.dueDate.getDate()).toBe(15);
    });
    it("dueDate is in same month when dueDay > statementClosingDay", () => {
      const closingDate = new Date("2025-02-28");
      const result = getPeriodForClosingDate(closingDate, 15, 28);

      expect(result.dueDate.getMonth()).toBe(1);
      expect(result.dueDate.getDate()).toBe(28);
    });
  });
});
