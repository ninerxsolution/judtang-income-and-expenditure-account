const mockCreate = jest.fn();

jest.mock("@/lib/prisma", () => ({
  prisma: {
    activityLog: {
      create: (...args: unknown[]) => mockCreate(...args),
    },
  },
}));

import { createActivityLog, ActivityLogAction } from "../activity-log";

beforeEach(() => jest.clearAllMocks());

describe("ActivityLogAction", () => {
  it("exports expected action constants", () => {
    expect(ActivityLogAction.USER_REGISTERED).toBe("USER_REGISTERED");
    expect(ActivityLogAction.TRANSACTION_CREATED).toBe("TRANSACTION_CREATED");
    expect(ActivityLogAction.FINANCIAL_ACCOUNT_CREATED).toBe("FINANCIAL_ACCOUNT_CREATED");
    expect(ActivityLogAction.CREDIT_CARD_PAYMENT).toBe("CREDIT_CARD_PAYMENT");
    expect(ActivityLogAction.BUDGET_TEMPLATE_CREATED).toBe("BUDGET_TEMPLATE_CREATED");
    expect(ActivityLogAction.RECURRING_TRANSACTION_CREATED).toBe("RECURRING_TRANSACTION_CREATED");
  });
});

describe("createActivityLog", () => {
  it("creates log with all params", async () => {
    mockCreate.mockResolvedValue({});
    await createActivityLog({
      userId: "user-1",
      action: "TRANSACTION_CREATED",
      entityType: "transaction",
      entityId: "tx-1",
      details: { amount: 100 },
    });
    expect(mockCreate).toHaveBeenCalledWith({
      data: {
        userId: "user-1",
        action: "TRANSACTION_CREATED",
        entityType: "transaction",
        entityId: "tx-1",
        details: { amount: 100 },
      },
    });
  });

  it("sets optional fields to null when not provided", async () => {
    mockCreate.mockResolvedValue({});
    await createActivityLog({ userId: "user-1", action: "USER_LOGGED_IN" });
    expect(mockCreate).toHaveBeenCalledWith({
      data: {
        userId: "user-1",
        action: "USER_LOGGED_IN",
        entityType: null,
        entityId: null,
        details: undefined,
      },
    });
  });

  it("does not throw when prisma fails", async () => {
    mockCreate.mockRejectedValue(new Error("DB error"));
    await expect(
      createActivityLog({ userId: "user-1", action: "TEST" })
    ).resolves.toBeUndefined();
  });
});
