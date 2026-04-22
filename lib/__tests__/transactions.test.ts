const mockTransactionCreate = jest.fn();
const mockTransactionFindFirst = jest.fn();
const mockTransactionUpdate = jest.fn();
const mockTransactionDelete = jest.fn();
const mockFinancialAccountFindUnique = jest.fn();
const mockFinancialAccountFindFirst = jest.fn();
const mockCategoryFindUnique = jest.fn();

jest.mock("@/lib/prisma", () => ({
  prisma: {
    transaction: {
      create: (...args: unknown[]) => mockTransactionCreate(...args),
      findFirst: (...args: unknown[]) => mockTransactionFindFirst(...args),
      findMany: jest.fn(),
      update: (...args: unknown[]) => mockTransactionUpdate(...args),
      delete: (...args: unknown[]) => mockTransactionDelete(...args),
    },
    financialAccount: {
      findUnique: (...args: unknown[]) => mockFinancialAccountFindUnique(...args),
      findFirst: (...args: unknown[]) => mockFinancialAccountFindFirst(...args),
    },
    category: {
      findUnique: (...args: unknown[]) => mockCategoryFindUnique(...args),
    },
  },
}));

jest.mock("@/lib/activity-log", () => ({
  createActivityLog: jest.fn(),
  ActivityLogAction: {},
}));

jest.mock("@/lib/credit-card", () => ({
  recomputeOutstanding: jest.fn(),
}));

import {
  createTransaction,
  getTransactionById,
  updateTransaction,
  deleteTransaction,
  TransactionType,
} from "../transactions";

const baseParams = {
  userId: "user-1",
  type: TransactionType.EXPENSE,
  amount: 100,
  financialAccountId: "acc-1",
  occurredAt: new Date("2025-01-15"),
};

beforeEach(() => {
  jest.clearAllMocks();
  mockTransactionCreate.mockResolvedValue({
    id: "tx-1",
    type: "EXPENSE",
    status: "POSTED",
    amount: 100,
    financialAccountId: "acc-1",
    occurredAt: baseParams.occurredAt,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  mockFinancialAccountFindUnique.mockResolvedValue({ type: "CASH", name: "Main" });
  mockFinancialAccountFindFirst.mockResolvedValue({
    currency: "THB",
    type: "CASH",
    name: "Main",
  });
  mockCategoryFindUnique.mockResolvedValue(null);
});

describe("createTransaction", () => {
  it("throws when userId is empty", async () => {
    await expect(
      createTransaction({ ...baseParams, userId: "" })
    ).rejects.toThrow("userId is required");
  });

  it("throws when type is invalid", async () => {
    await expect(
      createTransaction({ ...baseParams, type: "INVALID" as typeof TransactionType.EXPENSE })
    ).rejects.toThrow("Invalid transaction type");
  });

  it("throws when amount is not positive", async () => {
    await expect(
      createTransaction({ ...baseParams, amount: 0 })
    ).rejects.toThrow("Amount must be a positive number");

    await expect(
      createTransaction({ ...baseParams, amount: -10 })
    ).rejects.toThrow("Amount must be a positive number");
  });

  it("throws when financialAccountId is missing", async () => {
    await expect(
      createTransaction({ ...baseParams, financialAccountId: "" })
    ).rejects.toThrow("financialAccountId is required");
  });

  it("throws when TRANSFER without transferAccountId", async () => {
    await expect(
      createTransaction({
        ...baseParams,
        type: TransactionType.TRANSFER,
        transferAccountId: null,
      })
    ).rejects.toThrow("transferAccountId is required for TRANSFER");
  });

  it("throws when TRANSFER with same from and to account", async () => {
    await expect(
      createTransaction({
        ...baseParams,
        type: TransactionType.TRANSFER,
        transferAccountId: "acc-1",
      })
    ).rejects.toThrow("transferAccountId must be different from financialAccountId");
  });

  it("throws when occurredAt is invalid", async () => {
    await expect(
      createTransaction({
        ...baseParams,
        occurredAt: new Date("invalid"),
      })
    ).rejects.toThrow("occurredAt must be a valid Date");
  });

  it("creates transaction on success", async () => {
    const result = await createTransaction(baseParams);

    expect(result).toHaveProperty("id");
    expect(result.type).toBe("EXPENSE");
    expect(mockTransactionCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: "user-1",
          type: "EXPENSE",
          amount: 100,
          financialAccountId: "acc-1",
          currency: "THB",
          exchangeRate: 1,
          baseAmount: 100,
        }),
      })
    );
  });
});

describe("getTransactionById", () => {
  it("returns null when userId is empty", async () => {
    const result = await getTransactionById("", "tx-1");
    expect(result).toBeNull();
    expect(mockTransactionFindFirst).not.toHaveBeenCalled();
  });

  it("returns null when id is empty", async () => {
    const result = await getTransactionById("user-1", "");
    expect(result).toBeNull();
    expect(mockTransactionFindFirst).not.toHaveBeenCalled();
  });

  it("returns null when transaction not found", async () => {
    mockTransactionFindFirst.mockResolvedValue(null);

    const result = await getTransactionById("user-1", "tx-nonexistent");
    expect(result).toBeNull();
  });

  it("returns transaction when found", async () => {
    const tx = {
      id: "tx-1",
      type: "EXPENSE",
      amount: 100,
      userId: "user-1",
      financialAccountId: "acc-1",
      occurredAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockTransactionFindFirst.mockResolvedValue(tx);

    const result = await getTransactionById("user-1", "tx-1");
    expect(result).toEqual(tx);
  });
});

describe("updateTransaction", () => {
  it("throws when transaction not found", async () => {
    mockTransactionFindFirst.mockResolvedValue(null);

    await expect(
      updateTransaction("user-1", "tx-nonexistent", { amount: 200 })
    ).rejects.toThrow("Transaction not found");
  });

  it("updates and returns transaction on success", async () => {
    const existing = {
      id: "tx-1",
      type: "EXPENSE",
      amount: 100,
      userId: "user-1",
      financialAccountId: "acc-1",
      transferAccountId: null,
      categoryId: null,
      category: null,
      note: null,
      occurredAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      currency: "THB",
      exchangeRate: 1,
      baseAmount: 100,
      transferGroupId: null,
      transferLeg: null,
    };
    mockTransactionFindFirst.mockResolvedValueOnce(existing);
    mockTransactionUpdate.mockResolvedValue({
      ...existing,
      amount: 200,
      currency: "THB",
      exchangeRate: 1,
      baseAmount: 200,
    });

    const result = await updateTransaction("user-1", "tx-1", { amount: 200 });

    expect(result.amount).toBe(200);
    expect(mockTransactionUpdate).toHaveBeenCalled();
  });
});

describe("deleteTransaction", () => {
  it("returns false when transaction not found", async () => {
    mockTransactionFindFirst.mockReset();
    mockTransactionFindFirst.mockResolvedValue(null);

    const result = await deleteTransaction("user-1", "tx-nonexistent");
    expect(result).toBe(false);
    expect(mockTransactionDelete).not.toHaveBeenCalled();
  });

  it("deletes and returns true on success", async () => {
    const existing = {
      id: "tx-1",
      type: "EXPENSE",
      amount: 100,
      userId: "user-1",
      financialAccountId: "acc-1",
      transferAccountId: null,
      categoryId: null,
      category: null,
      note: null,
      occurredAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      currency: "THB",
      exchangeRate: 1,
      baseAmount: 100,
      transferGroupId: null,
      transferLeg: null,
    };
    mockTransactionFindFirst.mockReset();
    mockTransactionFindFirst.mockResolvedValue(existing);
    mockTransactionDelete.mockResolvedValue(existing);
    mockFinancialAccountFindUnique.mockResolvedValue({ type: "CASH", name: "Main" });

    const result = await deleteTransaction("user-1", "tx-1");
    expect(result).toBe(true);
    expect(mockTransactionDelete).toHaveBeenCalledWith({ where: { id: "tx-1" } });
  });
});
