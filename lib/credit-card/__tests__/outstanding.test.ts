const mockAggregate = jest.fn();
const mockFindUnique = jest.fn();
const mockUpdate = jest.fn();

jest.mock("@/lib/prisma", () => ({
  prisma: {
    transaction: {
      aggregate: (...args: unknown[]) => mockAggregate(...args),
    },
    financialAccount: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
      update: (...args: unknown[]) => mockUpdate(...args),
    },
  },
}));

jest.mock("@prisma/client", () => ({
  TransactionType: {
    EXPENSE: "EXPENSE",
    INTEREST: "INTEREST",
    PAYMENT: "PAYMENT",
    ADJUSTMENT: "ADJUSTMENT",
    INCOME: "INCOME",
  },
  TransactionStatus: { POSTED: "POSTED", PENDING: "PENDING" },
}));

import {
  getCurrentOutstanding,
  getPendingAmount,
  getAvailableCredit,
  recomputeOutstanding,
} from "../outstanding";

beforeEach(() => jest.clearAllMocks());

describe("getCurrentOutstanding", () => {
  it("returns 0 when no transactions", async () => {
    mockAggregate
      .mockResolvedValueOnce({ _sum: { amount: null } })
      .mockResolvedValueOnce({ _sum: { amount: null } });
    expect(await getCurrentOutstanding("cc-1")).toBe(0);
  });

  it("calculates outstanding = expenses - credits", async () => {
    mockAggregate
      .mockResolvedValueOnce({ _sum: { amount: 10000 } })
      .mockResolvedValueOnce({ _sum: { amount: 3000 } });
    expect(await getCurrentOutstanding("cc-1")).toBe(7000);
  });

  it("returns 0 when credits exceed expenses", async () => {
    mockAggregate
      .mockResolvedValueOnce({ _sum: { amount: 1000 } })
      .mockResolvedValueOnce({ _sum: { amount: 5000 } });
    expect(await getCurrentOutstanding("cc-1")).toBe(0);
  });

  it("rounds to 2 decimal places", async () => {
    mockAggregate
      .mockResolvedValueOnce({ _sum: { amount: 100.555 } })
      .mockResolvedValueOnce({ _sum: { amount: 0 } });
    expect(await getCurrentOutstanding("cc-1")).toBe(100.56);
  });
});

describe("getPendingAmount", () => {
  it("returns 0 when no pending", async () => {
    mockAggregate.mockResolvedValue({ _sum: { amount: null } });
    expect(await getPendingAmount("cc-1")).toBe(0);
  });

  it("returns pending amount rounded", async () => {
    mockAggregate.mockResolvedValue({ _sum: { amount: 1234.567 } });
    expect(await getPendingAmount("cc-1")).toBe(1234.57);
  });
});

describe("getAvailableCredit", () => {
  it("returns null when account not found", async () => {
    mockFindUnique.mockResolvedValue(null);
    expect(await getAvailableCredit("cc-1")).toBeNull();
  });

  it("returns null when creditLimit is null", async () => {
    mockFindUnique.mockResolvedValue({ creditLimit: null });
    expect(await getAvailableCredit("cc-1")).toBeNull();
  });

  it("calculates available = limit - outstanding - pending", async () => {
    mockFindUnique.mockResolvedValue({ creditLimit: 50000 });
    mockAggregate
      .mockResolvedValueOnce({ _sum: { amount: 10000 } })
      .mockResolvedValueOnce({ _sum: { amount: 3000 } })
      .mockResolvedValueOnce({ _sum: { amount: 2000 } });
    expect(await getAvailableCredit("cc-1")).toBe(41000);
  });

  it("returns 0 when over limit", async () => {
    mockFindUnique.mockResolvedValue({ creditLimit: 5000 });
    mockAggregate
      .mockResolvedValueOnce({ _sum: { amount: 10000 } })
      .mockResolvedValueOnce({ _sum: { amount: 0 } })
      .mockResolvedValueOnce({ _sum: { amount: 0 } });
    expect(await getAvailableCredit("cc-1")).toBe(0);
  });
});

describe("recomputeOutstanding", () => {
  it("updates account with computed outstanding and available credit", async () => {
    mockFindUnique.mockResolvedValue({ creditLimit: 50000 });
    mockAggregate
      .mockResolvedValueOnce({ _sum: { amount: 5000 } })
      .mockResolvedValueOnce({ _sum: { amount: 1000 } })
      .mockResolvedValueOnce({ _sum: { amount: 5000 } })
      .mockResolvedValueOnce({ _sum: { amount: 1000 } })
      .mockResolvedValueOnce({ _sum: { amount: 500 } });
    mockUpdate.mockResolvedValue({});

    await recomputeOutstanding("cc-1");
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: "cc-1" },
      data: expect.objectContaining({
        currentOutstanding: expect.any(Number),
        availableCredit: expect.any(Number),
      }),
    });
  });
});
