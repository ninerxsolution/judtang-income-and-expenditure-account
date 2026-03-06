import { applyInterest } from "../interest";

const mockFindFirst = jest.fn();
const mockUpdate = jest.fn();
const mockStatementFindFirst = jest.fn();

jest.mock("@/lib/prisma", () => ({
  prisma: {
    financialAccount: {
      findFirst: (...args: unknown[]) => mockFindFirst(...args),
      update: (...args: unknown[]) => mockUpdate(...args),
    },
    creditCardStatement: {
      findFirst: (...args: unknown[]) => mockStatementFindFirst(...args),
    },
  },
}));

jest.mock("@/lib/credit-card/outstanding", () => ({
  getCurrentOutstanding: jest.fn(),
  recomputeOutstanding: jest.fn(),
}));

jest.mock("@/lib/transactions", () => ({
  createTransaction: jest.fn(),
  TransactionType: { INTEREST: "INTEREST" },
}));

jest.mock("@/lib/financial-accounts", () => ({
  isAccountIncomplete: jest.fn(),
}));

jest.mock("@/lib/activity-log", () => ({
  createActivityLog: jest.fn(),
  ActivityLogAction: { CREDIT_CARD_INTEREST_APPLIED: "CREDIT_CARD_INTEREST_APPLIED" },
}));

import { getCurrentOutstanding, recomputeOutstanding } from "../outstanding";
import { createTransaction } from "@/lib/transactions";
import { isAccountIncomplete } from "@/lib/financial-accounts";

const mockGetCurrentOutstanding = getCurrentOutstanding as jest.MockedFunction<typeof getCurrentOutstanding>;
const mockRecomputeOutstanding = recomputeOutstanding as jest.MockedFunction<typeof recomputeOutstanding>;
const mockCreateTransaction = createTransaction as jest.MockedFunction<typeof createTransaction>;
const mockIsAccountIncomplete = isAccountIncomplete as jest.MockedFunction<typeof isAccountIncomplete>;

beforeEach(() => {
  jest.clearAllMocks();
  mockFindFirst.mockResolvedValue(null);
  mockStatementFindFirst.mockResolvedValue(null);
  mockGetCurrentOutstanding.mockResolvedValue(0);
  mockIsAccountIncomplete.mockReturnValue(false);
  mockCreateTransaction.mockResolvedValue({
    id: "tx-interest-1",
    type: "INTEREST",
    amount: 100,
    occurredAt: new Date(),
    financialAccountId: "cc-1",
  } as unknown as Awaited<ReturnType<typeof createTransaction>>);
  mockUpdate.mockResolvedValue({});
  mockRecomputeOutstanding.mockResolvedValue(undefined);
});

describe("applyInterest", () => {
  it("throws when account not found", async () => {
    mockFindFirst.mockResolvedValue(null);
    await expect(applyInterest("cc-1", "user-1")).rejects.toThrow("Not found");
    expect(mockCreateTransaction).not.toHaveBeenCalled();
  });

  it("throws when account is not CREDIT_CARD", async () => {
    mockFindFirst.mockResolvedValue({
      id: "cc-1",
      type: "BANK",
      interestRate: 18,
      interestCalculatedUntil: null,
      createdAt: new Date("2026-01-01"),
    });
    await expect(applyInterest("cc-1", "user-1")).rejects.toThrow("Not found");
  });

  it("throws when account is incomplete", async () => {
    mockFindFirst.mockResolvedValue({
      id: "cc-1",
      type: "CREDIT_CARD",
      interestRate: 18,
      interestCalculatedUntil: null,
      createdAt: new Date("2026-01-01"),
      bankName: null,
    });
    mockIsAccountIncomplete.mockReturnValue(true);
    await expect(applyInterest("cc-1", "user-1")).rejects.toThrow("incomplete");
    expect(mockCreateTransaction).not.toHaveBeenCalled();
  });

  it("returns applied false when outstanding is zero", async () => {
    mockFindFirst.mockResolvedValue({
      id: "cc-1",
      type: "CREDIT_CARD",
      interestRate: 18,
      interestCalculatedUntil: null,
      createdAt: new Date("2026-01-01"),
    });
    mockGetCurrentOutstanding.mockResolvedValue(0);
    const result = await applyInterest("cc-1", "user-1");
    expect(result.applied).toBe(false);
    expect(result.message).toContain("No outstanding");
    expect(mockCreateTransaction).not.toHaveBeenCalled();
  });

  it("creates INTEREST transaction and updates interestCalculatedUntil when outstanding > 0", async () => {
    const createdAt = new Date("2026-01-01T00:00:00.000Z");
    mockFindFirst.mockResolvedValue({
      id: "cc-1",
      type: "CREDIT_CARD",
      interestRate: 18,
      interestCalculatedUntil: null,
      createdAt,
    });
    mockGetCurrentOutstanding.mockResolvedValue(5000);
    mockStatementFindFirst.mockResolvedValue(null);
    const result = await applyInterest("cc-1", "user-1");
    expect(result.applied).toBe(true);
    expect(result.transactionId).toBe("tx-interest-1");
    expect(result.amount).toBeGreaterThan(0);
    expect(mockCreateTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-1",
        type: "INTEREST",
        financialAccountId: "cc-1",
        status: "POSTED",
      })
    );
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: "cc-1" },
      data: { interestCalculatedUntil: expect.any(Date) },
    });
    expect(mockRecomputeOutstanding).toHaveBeenCalledWith("cc-1");
  });
});
