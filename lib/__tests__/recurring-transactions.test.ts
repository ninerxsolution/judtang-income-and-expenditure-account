const mockRecurringCreate = jest.fn();
const mockRecurringFindMany = jest.fn();
const mockRecurringFindFirst = jest.fn();
const mockRecurringUpdate = jest.fn();
const mockRecurringDelete = jest.fn();
const mockTransactionCreate = jest.fn();

jest.mock("@/lib/prisma", () => ({
  prisma: {
    recurringTransaction: {
      create: (...args: unknown[]) => mockRecurringCreate(...args),
      findMany: (...args: unknown[]) => mockRecurringFindMany(...args),
      findFirst: (...args: unknown[]) => mockRecurringFindFirst(...args),
      update: (...args: unknown[]) => mockRecurringUpdate(...args),
      delete: (...args: unknown[]) => mockRecurringDelete(...args),
    },
    transaction: {
      create: (...args: unknown[]) => mockTransactionCreate(...args),
    },
  },
}));

jest.mock("@/lib/activity-log", () => ({
  createActivityLog: jest.fn(),
  ActivityLogAction: {
    RECURRING_TRANSACTION_CREATED: "RECURRING_TRANSACTION_CREATED",
    RECURRING_TRANSACTION_UPDATED: "RECURRING_TRANSACTION_UPDATED",
    RECURRING_TRANSACTION_DELETED: "RECURRING_TRANSACTION_DELETED",
    TRANSACTION_CREATED: "TRANSACTION_CREATED",
  },
}));

jest.mock("@/lib/cache", () => ({
  revalidateTag: jest.fn(),
}));

import {
  createRecurringTransaction,
  updateRecurringTransaction,
  deleteRecurringTransaction,
  confirmRecurringTransaction,
  RecurringFrequency,
} from "../recurring-transactions";

const baseCreate = {
  userId: "user-1",
  name: "ค่าห้อง",
  type: "EXPENSE" as const,
  amount: 5000,
  frequency: RecurringFrequency.MONTHLY,
  startDate: new Date("2025-01-01"),
};

const mockTemplate = {
  id: "rec-1",
  userId: "user-1",
  name: "ค่าห้อง",
  type: "EXPENSE",
  amount: 5000,
  frequency: "MONTHLY",
  dayOfMonth: 1,
  monthOfYear: null,
  isActive: true,
  startDate: new Date("2025-01-01"),
  endDate: null,
  categoryId: null,
  financialAccountId: null,
  note: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  categoryRef: null,
  financialAccount: null,
};

beforeEach(() => {
  jest.clearAllMocks();
  mockRecurringCreate.mockResolvedValue(mockTemplate);
  mockRecurringFindFirst.mockResolvedValue(mockTemplate);
  mockRecurringUpdate.mockResolvedValue(mockTemplate);
  mockRecurringDelete.mockResolvedValue(mockTemplate);
  mockTransactionCreate.mockResolvedValue({
    id: "tx-1",
    type: "EXPENSE",
    status: "POSTED",
    amount: 5000,
    occurredAt: new Date(),
    financialAccount: null,
    categoryRef: null,
    recurringTransaction: mockTemplate,
  });
});

describe("createRecurringTransaction", () => {
  it("creates a recurring transaction successfully", async () => {
    const result = await createRecurringTransaction(baseCreate);
    expect(mockRecurringCreate).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({ id: "rec-1", name: "ค่าห้อง" });
  });

  it("throws when type is not INCOME or EXPENSE", async () => {
    await expect(
      createRecurringTransaction({
        ...baseCreate,
        type: "TRANSFER" as "INCOME" | "EXPENSE",
      }),
    ).rejects.toThrow("Recurring transactions only support INCOME or EXPENSE type");
  });

  it("throws when amount is zero or negative", async () => {
    await expect(createRecurringTransaction({ ...baseCreate, amount: 0 })).rejects.toThrow(
      "Amount must be a positive number",
    );
    await expect(createRecurringTransaction({ ...baseCreate, amount: -100 })).rejects.toThrow(
      "Amount must be a positive number",
    );
  });

  it("throws when YEARLY frequency is missing monthOfYear", async () => {
    await expect(
      createRecurringTransaction({
        ...baseCreate,
        frequency: RecurringFrequency.YEARLY,
        monthOfYear: undefined,
      }),
    ).rejects.toThrow("monthOfYear is required for YEARLY frequency");
  });

  it("succeeds for YEARLY with monthOfYear set", async () => {
    const result = await createRecurringTransaction({
      ...baseCreate,
      frequency: RecurringFrequency.YEARLY,
      monthOfYear: 3,
    });
    expect(result).toBeDefined();
  });
});

describe("updateRecurringTransaction", () => {
  it("updates successfully", async () => {
    await updateRecurringTransaction("user-1", "rec-1", { name: "ค่าเช่า" });
    expect(mockRecurringUpdate).toHaveBeenCalledTimes(1);
  });

  it("throws when record not found", async () => {
    mockRecurringFindFirst.mockResolvedValueOnce(null);
    await expect(
      updateRecurringTransaction("user-1", "rec-999", { name: "new" }),
    ).rejects.toThrow("Recurring transaction not found");
  });

  it("throws when amount is invalid", async () => {
    await expect(
      updateRecurringTransaction("user-1", "rec-1", { amount: -50 }),
    ).rejects.toThrow("Amount must be a positive number");
  });
});

describe("deleteRecurringTransaction", () => {
  it("deletes successfully", async () => {
    await deleteRecurringTransaction("user-1", "rec-1");
    expect(mockRecurringDelete).toHaveBeenCalledTimes(1);
  });

  it("throws when record not found", async () => {
    mockRecurringFindFirst.mockResolvedValueOnce(null);
    await expect(deleteRecurringTransaction("user-1", "rec-999")).rejects.toThrow(
      "Recurring transaction not found",
    );
  });
});

describe("confirmRecurringTransaction", () => {
  const confirmParams = {
    amount: 5000,
    occurredAt: new Date("2025-03-01"),
    financialAccountId: "acc-1",
  };

  it("creates a transaction linked to recurring template", async () => {
    const result = await confirmRecurringTransaction("user-1", "rec-1", confirmParams);
    expect(mockTransactionCreate).toHaveBeenCalledTimes(1);
    const call = mockTransactionCreate.mock.calls[0][0];
    expect(call.data.recurringTransactionId).toBe("rec-1");
    expect(result).toBeDefined();
  });

  it("throws when recurring transaction not found", async () => {
    mockRecurringFindFirst.mockResolvedValueOnce(null);
    await expect(
      confirmRecurringTransaction("user-1", "rec-999", confirmParams),
    ).rejects.toThrow("Recurring transaction not found");
  });

  it("throws when amount is invalid", async () => {
    await expect(
      confirmRecurringTransaction("user-1", "rec-1", { ...confirmParams, amount: 0 }),
    ).rejects.toThrow("Amount must be a positive number");
  });
});
