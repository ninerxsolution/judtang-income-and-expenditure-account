const mockFindUnique = jest.fn();
const mockFindMany = jest.fn();
const mockAggregate = jest.fn();
const mockGetOutstandingAsOf = jest.fn();

jest.mock("@/lib/prisma", () => ({
  prisma: {
    financialAccount: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
      findMany: (...args: unknown[]) => mockFindMany(...args),
    },
    transaction: {
      aggregate: (...args: unknown[]) => mockAggregate(...args),
    },
  },
}));

jest.mock("@/lib/credit-card", () => ({
  getOutstandingAsOf: (...args: unknown[]) => mockGetOutstandingAsOf(...args),
}));

import { getAccountBalance, getTotalBalance } from "../balance";

beforeEach(() => {
  jest.clearAllMocks();
});

describe("getAccountBalance", () => {
  it("returns 0 when account not found", async () => {
    mockFindUnique.mockResolvedValue(null);
    const result = await getAccountBalance("non-existent");
    expect(result).toBe(0);
  });

  it("returns negative outstanding for CREDIT_CARD accounts", async () => {
    mockFindUnique.mockResolvedValue({ initialBalance: 0, type: "CREDIT_CARD" });
    mockGetOutstandingAsOf.mockResolvedValue(5000);
    const result = await getAccountBalance("cc-1");
    expect(result).toBe(-5000);
    expect(mockGetOutstandingAsOf).toHaveBeenCalledWith("cc-1", undefined);
  });

  it("returns -0 for CREDIT_CARD with no outstanding", async () => {
    mockFindUnique.mockResolvedValue({ initialBalance: 0, type: "CREDIT_CARD" });
    mockGetOutstandingAsOf.mockResolvedValue(0);
    const result = await getAccountBalance("cc-2");
    expect(result).toEqual(-0);
  });

  it("calculates balance for BANK account: initial + income - expense - transferOut + transferIn", async () => {
    mockFindUnique.mockResolvedValue({ initialBalance: 10000, type: "BANK" });
    mockAggregate
      .mockResolvedValueOnce({ _sum: { amount: 5000 } })   // income
      .mockResolvedValueOnce({ _sum: { amount: 3000 } })   // expense
      .mockResolvedValueOnce({ _sum: { amount: 1000 } })   // transferOut
      .mockResolvedValueOnce({ _sum: { amount: 2000 } });  // transferIn
    const result = await getAccountBalance("bank-1");
    expect(result).toBe(10000 + 5000 - 3000 - 1000 + 2000);
    expect(result).toBe(13000);
  });

  it("handles null sums (no transactions) as zero", async () => {
    mockFindUnique.mockResolvedValue({ initialBalance: 500, type: "WALLET" });
    mockAggregate
      .mockResolvedValueOnce({ _sum: { amount: null } })
      .mockResolvedValueOnce({ _sum: { amount: null } })
      .mockResolvedValueOnce({ _sum: { amount: null } })
      .mockResolvedValueOnce({ _sum: { amount: null } });
    const result = await getAccountBalance("wallet-1");
    expect(result).toBe(500);
  });

  it("handles zero initial balance", async () => {
    mockFindUnique.mockResolvedValue({ initialBalance: 0, type: "CASH" });
    mockAggregate
      .mockResolvedValueOnce({ _sum: { amount: 200 } })
      .mockResolvedValueOnce({ _sum: { amount: 100 } })
      .mockResolvedValueOnce({ _sum: { amount: null } })
      .mockResolvedValueOnce({ _sum: { amount: null } });
    const result = await getAccountBalance("cash-1");
    expect(result).toBe(100);
  });
});

describe("getTotalBalance", () => {
  it("returns 0 when user has no active accounts", async () => {
    mockFindMany.mockResolvedValue([]);
    const result = await getTotalBalance("user-1");
    expect(result).toBe(0);
  });

  it("sums balances of all active accounts", async () => {
    mockFindMany.mockResolvedValue([{ id: "a1" }, { id: "a2" }]);

    mockFindUnique
      .mockResolvedValueOnce({ initialBalance: 1000, type: "BANK" })
      .mockResolvedValueOnce({ initialBalance: 500, type: "WALLET" });
    mockAggregate
      .mockResolvedValueOnce({ _sum: { amount: null } })
      .mockResolvedValueOnce({ _sum: { amount: null } })
      .mockResolvedValueOnce({ _sum: { amount: null } })
      .mockResolvedValueOnce({ _sum: { amount: null } })
      .mockResolvedValueOnce({ _sum: { amount: null } })
      .mockResolvedValueOnce({ _sum: { amount: null } })
      .mockResolvedValueOnce({ _sum: { amount: null } })
      .mockResolvedValueOnce({ _sum: { amount: null } });

    const result = await getTotalBalance("user-1");
    expect(result).toBe(1500);
  });

  it("includes negative credit card balances in total", async () => {
    mockFindMany.mockResolvedValue([{ id: "bank-1" }, { id: "cc-1" }]);

    mockFindUnique
      .mockResolvedValueOnce({ initialBalance: 10000, type: "BANK" })
      .mockResolvedValueOnce({ initialBalance: 0, type: "CREDIT_CARD" });

    mockAggregate
      .mockResolvedValueOnce({ _sum: { amount: null } })
      .mockResolvedValueOnce({ _sum: { amount: null } })
      .mockResolvedValueOnce({ _sum: { amount: null } })
      .mockResolvedValueOnce({ _sum: { amount: null } });

    mockGetOutstandingAsOf.mockResolvedValue(3000);

    const result = await getTotalBalance("user-1");
    expect(result).toBe(10000 - 3000);
  });
});
