const mockFindUnique = jest.fn();
const mockStatementFindFirst = jest.fn();
const mockStatementCreate = jest.fn();
const mockTxFindMany = jest.fn();
const mockTxUpdateMany = jest.fn();

jest.mock("@/lib/prisma", () => ({
  prisma: {
    financialAccount: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
    },
    creditCardStatement: {
      findFirst: (...args: unknown[]) => mockStatementFindFirst(...args),
      create: (...args: unknown[]) => mockStatementCreate(...args),
    },
    transaction: {
      findMany: (...args: unknown[]) => mockTxFindMany(...args),
      updateMany: (...args: unknown[]) => mockTxUpdateMany(...args),
    },
  },
}));

jest.mock("@prisma/client", () => ({
  TransactionType: { EXPENSE: "EXPENSE", INTEREST: "INTEREST" },
  TransactionStatus: { POSTED: "POSTED" },
}));

import {
  getPeriodForClosingDate,
  getActiveStatementPeriod,
  closeStatement,
  getLatestStatement,
} from "../statement";
import { startOfDay, endOfDay, subMonths, addDays } from "date-fns";

beforeEach(() => jest.clearAllMocks());

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

  describe("getActiveStatementPeriod", () => {
    it("returns null when account not found", async () => {
      mockFindUnique.mockResolvedValue(null);
      const result = await getActiveStatementPeriod("cc-1");
      expect(result).toBeNull();
    });

    it("returns null when account is not CREDIT_CARD", async () => {
      mockFindUnique.mockResolvedValue({ type: "BANK", statementClosingDay: 25, dueDay: 10 });
      const result = await getActiveStatementPeriod("cc-1");
      expect(result).toBeNull();
    });

    it("returns null when statementClosingDay is null", async () => {
      mockFindUnique.mockResolvedValue({ type: "CREDIT_CARD", statementClosingDay: null, dueDay: 10 });
      const result = await getActiveStatementPeriod("cc-1");
      expect(result).toBeNull();
    });

    it("returns null when dueDay is null", async () => {
      mockFindUnique.mockResolvedValue({ type: "CREDIT_CARD", statementClosingDay: 25, dueDay: null });
      const result = await getActiveStatementPeriod("cc-1");
      expect(result).toBeNull();
    });

    it("returns statement period for configured credit card", async () => {
      mockFindUnique.mockResolvedValue({
        type: "CREDIT_CARD",
        statementClosingDay: 25,
        dueDay: 10,
      });
      const result = await getActiveStatementPeriod("cc-1");
      expect(result).not.toBeNull();
      expect(result!.periodStart).toBeInstanceOf(Date);
      expect(result!.periodEnd).toBeInstanceOf(Date);
      expect(result!.closingDate).toBeInstanceOf(Date);
      expect(result!.dueDate).toBeInstanceOf(Date);
    });
  });

  describe("closeStatement", () => {
    it("throws when account not found", async () => {
      mockFindUnique.mockResolvedValue(null);
      await expect(closeStatement("cc-1", new Date())).rejects.toThrow("not a credit card");
    });

    it("throws when account is not CREDIT_CARD", async () => {
      mockFindUnique.mockResolvedValue({ type: "BANK" });
      await expect(closeStatement("cc-1", new Date())).rejects.toThrow("not a credit card");
    });

    it("throws when statement cycle not configured", async () => {
      mockFindUnique.mockResolvedValue({
        type: "CREDIT_CARD",
        statementClosingDay: null,
        dueDay: null,
        userId: "u-1",
      });
      await expect(closeStatement("cc-1", new Date())).rejects.toThrow("cycle not configured");
    });

    it("throws when statement already exists for period", async () => {
      mockFindUnique.mockResolvedValue({
        type: "CREDIT_CARD",
        statementClosingDay: 25,
        dueDay: 10,
        userId: "u-1",
      });
      mockStatementFindFirst.mockResolvedValue({ id: "existing-stmt" });
      await expect(closeStatement("cc-1", new Date("2025-06-25"))).rejects.toThrow("already closed");
    });

    it("creates statement successfully", async () => {
      mockFindUnique.mockResolvedValue({
        type: "CREDIT_CARD",
        statementClosingDay: 25,
        dueDay: 10,
        userId: "u-1",
      });
      mockStatementFindFirst.mockResolvedValue(null);
      mockTxFindMany.mockResolvedValue([
        { id: "tx-1", amount: 3000 },
        { id: "tx-2", amount: 2000 },
      ]);
      mockStatementCreate.mockResolvedValue({ id: "stmt-1" });
      mockTxUpdateMany.mockResolvedValue({ count: 2 });

      const result = await closeStatement("cc-1", new Date("2025-06-25"));
      expect(result.id).toBe("stmt-1");
      expect(mockStatementCreate).toHaveBeenCalled();
      expect(mockTxUpdateMany).toHaveBeenCalled();
    });
  });

  describe("getLatestStatement", () => {
    it("returns latest statement", async () => {
      const stmt = { id: "stmt-1", closingDate: new Date() };
      mockStatementFindFirst.mockResolvedValue(stmt);
      const result = await getLatestStatement("cc-1");
      expect(result).toEqual(stmt);
    });

    it("returns null when no statements", async () => {
      mockStatementFindFirst.mockResolvedValue(null);
      const result = await getLatestStatement("cc-1");
      expect(result).toBeNull();
    });
  });
});
