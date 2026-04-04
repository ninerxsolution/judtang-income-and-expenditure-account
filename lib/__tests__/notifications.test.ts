/**
 * Unit tests for lib/notifications.ts
 */

// ---------------------------------------------------------------------------
// Mock prisma
// ---------------------------------------------------------------------------
const mockNotificationCreate = jest.fn();
const mockNotificationFindMany = jest.fn();
const mockNotificationUpdateMany = jest.fn();
const mockNotificationCount = jest.fn();
const mockFinancialAccountFindMany = jest.fn();

jest.mock("@/lib/prisma", () => ({
  prisma: {
    notification: {
      create: (...args: unknown[]) => mockNotificationCreate(...args),
      findMany: (...args: unknown[]) => mockNotificationFindMany(...args),
      updateMany: (...args: unknown[]) => mockNotificationUpdateMany(...args),
      count: (...args: unknown[]) => mockNotificationCount(...args),
    },
    financialAccount: {
      findMany: (...args: unknown[]) => mockFinancialAccountFindMany(...args),
    },
  },
}));

// Mock domain helpers used by computeVirtualAlerts
jest.mock("@/lib/recurring-transactions", () => ({
  getDueRecurringTransactions: jest.fn(),
}));

jest.mock("@/lib/budget", () => ({
  getBudgetForMonth: jest.fn(),
  getBudgetIndicator: (progress: number) => {
    if (progress > 1) return "over";
    if (progress >= 1) return "full";
    if (progress >= 0.9) return "critical";
    if (progress >= 0.7) return "warning";
    return "normal";
  },
}));

jest.mock("@/lib/financial-accounts", () => ({
  isAccountIncomplete: jest.fn(),
}));

import {
  createNotification,
  listPersistedNotifications,
  markNotificationsRead,
  markAllNotificationsRead,
  countUnreadNotifications,
  computeVirtualAlerts,
  mergeNotifications,
  VirtualNotificationType,
} from "../notifications";
import { getDueRecurringTransactions } from "@/lib/recurring-transactions";
import { getBudgetForMonth } from "@/lib/budget";
import { isAccountIncomplete } from "@/lib/financial-accounts";

const mockGetDueRecurring = getDueRecurringTransactions as jest.MockedFunction<
  typeof getDueRecurringTransactions
>;
const mockGetBudgetForMonth = getBudgetForMonth as jest.MockedFunction<typeof getBudgetForMonth>;
const mockIsAccountIncomplete = isAccountIncomplete as jest.MockedFunction<typeof isAccountIncomplete>;

beforeEach(() => {
  jest.clearAllMocks();
});

// ---------------------------------------------------------------------------
// createNotification
// ---------------------------------------------------------------------------

describe("createNotification", () => {
  it("creates notification in DB with given params", async () => {
    mockNotificationCreate.mockResolvedValue({});
    await createNotification("user-1", "EVENT_IMPORT_DONE", { createdCount: 5 }, "/dashboard/tools");
    expect(mockNotificationCreate).toHaveBeenCalledWith({
      data: {
        userId: "user-1",
        type: "EVENT_IMPORT_DONE",
        payload: { createdCount: 5 },
        link: "/dashboard/tools",
      },
    });
  });

  it("does not throw when prisma fails", async () => {
    mockNotificationCreate.mockRejectedValue(new Error("DB error"));
    await expect(createNotification("user-1", "EVENT_SLIP_DONE")).resolves.toBeUndefined();
  });

  it("stores null link when not provided", async () => {
    mockNotificationCreate.mockResolvedValue({});
    await createNotification("user-1", "EVENT_CARD_PAYMENT", { amount: 100 });
    expect(mockNotificationCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ link: null }),
      }),
    );
  });
});

// ---------------------------------------------------------------------------
// listPersistedNotifications
// ---------------------------------------------------------------------------

describe("listPersistedNotifications", () => {
  const now = new Date();
  const mockRows = [
    { id: "n-1", type: "EVENT_IMPORT_DONE", payload: { createdCount: 3 }, link: "/dashboard/tools", readAt: null, createdAt: now },
    { id: "n-2", type: "EVENT_SLIP_DONE", payload: null, link: null, readAt: now, createdAt: now },
  ];

  it("returns notifications mapped with kind: persisted", async () => {
    mockNotificationFindMany.mockResolvedValue(mockRows);
    const result = await listPersistedNotifications("user-1");
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ id: "n-1", kind: "persisted", readAt: null });
    expect(result[1]).toMatchObject({ id: "n-2", kind: "persisted" });
  });

  it("respects unreadOnly flag", async () => {
    mockNotificationFindMany.mockResolvedValue([mockRows[0]]);
    await listPersistedNotifications("user-1", { unreadOnly: true });
    expect(mockNotificationFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ readAt: null }),
      }),
    );
  });

  it("uses default limit of 50", async () => {
    mockNotificationFindMany.mockResolvedValue([]);
    await listPersistedNotifications("user-1");
    expect(mockNotificationFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 50 }),
    );
  });
});

// ---------------------------------------------------------------------------
// markNotificationsRead
// ---------------------------------------------------------------------------

describe("markNotificationsRead", () => {
  it("calls updateMany with given ids and sets readAt", async () => {
    mockNotificationUpdateMany.mockResolvedValue({ count: 2 });
    await markNotificationsRead("user-1", ["n-1", "n-2"]);
    expect(mockNotificationUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: { in: ["n-1", "n-2"] }, userId: "user-1" }),
        data: expect.objectContaining({ readAt: expect.any(Date) }),
      }),
    );
  });

  it("does nothing for empty ids array", async () => {
    await markNotificationsRead("user-1", []);
    expect(mockNotificationUpdateMany).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// markAllNotificationsRead
// ---------------------------------------------------------------------------

describe("markAllNotificationsRead", () => {
  it("marks all unread for user", async () => {
    mockNotificationUpdateMany.mockResolvedValue({ count: 5 });
    await markAllNotificationsRead("user-1");
    expect(mockNotificationUpdateMany).toHaveBeenCalledWith({
      where: { userId: "user-1", readAt: null },
      data: { readAt: expect.any(Date) },
    });
  });
});

// ---------------------------------------------------------------------------
// countUnreadNotifications
// ---------------------------------------------------------------------------

describe("countUnreadNotifications", () => {
  it("returns count of unread notifications", async () => {
    mockNotificationCount.mockResolvedValue(7);
    const result = await countUnreadNotifications("user-1");
    expect(result).toBe(7);
    expect(mockNotificationCount).toHaveBeenCalledWith({
      where: { userId: "user-1", readAt: null },
    });
  });
});

// ---------------------------------------------------------------------------
// computeVirtualAlerts
// ---------------------------------------------------------------------------

describe("computeVirtualAlerts", () => {
  function makeDueItem(isPaid: boolean, name = "Rent") {
    return {
      id: "rt-1",
      userId: "user-1",
      name,
      type: "EXPENSE" as const,
      amount: 1000,
      isPaid,
      isActive: true,
      frequency: "MONTHLY" as const,
      startDate: new Date(),
      endDate: null,
      dayOfMonth: 1,
      monthOfYear: null,
      categoryId: null,
      financialAccountId: null,
      note: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      categoryRef: null,
      financialAccount: null,
      transactions: [],
    };
  }

  const emptyBudget = {
    budgetMonth: null,
    totalSpent: 0,
    totalBudget: null,
    totalProgress: 0,
    totalIndicator: "normal" as const,
    categoryBudgets: [],
  };

  beforeEach(() => {
    mockGetDueRecurring.mockResolvedValue([]);
    mockGetBudgetForMonth.mockResolvedValue(emptyBudget);
    mockFinancialAccountFindMany.mockResolvedValue([]);
    mockIsAccountIncomplete.mockReturnValue(false);
  });

  it("returns ALERT_RECURRING_DUE when there are unpaid due items", async () => {
    mockGetDueRecurring.mockResolvedValue([makeDueItem(false), makeDueItem(false, "Electricity")]);
    const alerts = await computeVirtualAlerts("user-1");
    const recurringAlert = alerts.find((a) => a.type === VirtualNotificationType.ALERT_RECURRING_DUE);
    expect(recurringAlert).toBeDefined();
    expect(recurringAlert?.payload.count).toBe(2);
    expect(recurringAlert?.kind).toBe("virtual");
    expect(recurringAlert?.readAt).toBeNull();
  });

  it("does NOT return ALERT_RECURRING_DUE when all items are paid", async () => {
    mockGetDueRecurring.mockResolvedValue([makeDueItem(true)]);
    const alerts = await computeVirtualAlerts("user-1");
    expect(alerts.some((a) => a.type === VirtualNotificationType.ALERT_RECURRING_DUE)).toBe(false);
  });

  it("returns ALERT_CARD_DUE for credit cards due within 7 days", async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    mockFinancialAccountFindMany.mockResolvedValue([
      {
        id: "card-1",
        name: "KBank Visa",
        type: "CREDIT_CARD",
        dueDay: tomorrow.getDate(),
        accountNumber: "1234",
        bankName: "kbank",
        creditLimit: 50000,
        interestRate: 18,
        cardAccountType: "credit",
        statementClosingDay: 15,
      },
    ]);
    const alerts = await computeVirtualAlerts("user-1");
    const cardAlert = alerts.find((a) => a.type === VirtualNotificationType.ALERT_CARD_DUE);
    expect(cardAlert).toBeDefined();
    expect(cardAlert?.payload.accountName).toBe("KBank Visa");
    expect(Number(cardAlert?.payload.daysRemaining)).toBeGreaterThanOrEqual(0);
  });

  it("does NOT return ALERT_CARD_DUE for cards due far in the future", async () => {
    const farFuture = new Date();
    farFuture.setDate(farFuture.getDate() + 30);
    mockFinancialAccountFindMany.mockResolvedValue([
      {
        id: "card-2",
        name: "Kasikorn Platinum",
        type: "CREDIT_CARD",
        dueDay: farFuture.getDate(),
        accountNumber: "5678",
        bankName: "kbank",
        creditLimit: 100000,
        interestRate: 18,
        cardAccountType: "credit",
        statementClosingDay: 10,
      },
    ]);
    const alerts = await computeVirtualAlerts("user-1");
    expect(alerts.some((a) => a.type === VirtualNotificationType.ALERT_CARD_DUE)).toBe(false);
  });

  it("returns ALERT_BUDGET when total budget is over limit", async () => {
    mockGetBudgetForMonth.mockResolvedValue({
      ...emptyBudget,
      budgetMonth: { id: "bm-1", year: 2026, month: 3, totalBudget: 10000, createdAt: new Date(), updatedAt: new Date() },
      totalBudget: 10000,
      totalSpent: 11000,
      totalProgress: 1.1,
      totalIndicator: "over" as const,
    });
    const alerts = await computeVirtualAlerts("user-1");
    const budgetAlert = alerts.find((a) => a.type === VirtualNotificationType.ALERT_BUDGET && !a.payload.categoryName);
    expect(budgetAlert).toBeDefined();
    expect(budgetAlert?.payload.isOver).toBe(true);
  });

  it("returns ALERT_INCOMPLETE_ACCOUNT for incomplete accounts", async () => {
    mockFinancialAccountFindMany.mockResolvedValue([
      { id: "acc-1", name: "My Bank", type: "BANK", dueDay: null, accountNumber: null, bankName: null, creditLimit: null, interestRate: null, cardAccountType: null, statementClosingDay: null },
    ]);
    mockIsAccountIncomplete.mockReturnValue(true);
    const alerts = await computeVirtualAlerts("user-1");
    const incompleteAlert = alerts.find((a) => a.type === VirtualNotificationType.ALERT_INCOMPLETE_ACCOUNT);
    expect(incompleteAlert).toBeDefined();
    expect(incompleteAlert?.payload.accountName).toBe("My Bank");
  });

  it("returns empty array when everything is fine", async () => {
    const alerts = await computeVirtualAlerts("user-1");
    expect(alerts).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// mergeNotifications
// ---------------------------------------------------------------------------

describe("mergeNotifications", () => {
  it("sorts notifications newest first", () => {
    const older = new Date("2026-03-10T10:00:00Z");
    const newer = new Date("2026-03-12T10:00:00Z");
    const persisted = [{ id: "p-1", type: "EVENT_IMPORT_DONE", payload: null, link: null, readAt: null, createdAt: older, kind: "persisted" as const }];
    const virtual = [{ id: "v-1", type: "ALERT_RECURRING_DUE", payload: { count: 1 }, link: "/dashboard/recurring", readAt: null, createdAt: newer, kind: "virtual" as const }];
    const merged = mergeNotifications(persisted, virtual);
    expect(merged[0].id).toBe("v-1");
    expect(merged[1].id).toBe("p-1");
  });

  it("returns all items from both lists", () => {
    const now = new Date();
    const persisted = [{ id: "p-1", type: "EVENT_SLIP_DONE", payload: null, link: null, readAt: null, createdAt: now, kind: "persisted" as const }];
    const virtual = [
      { id: "v-1", type: "ALERT_CARD_DUE", payload: { accountId: "card-1", accountName: "Visa", last4: "1234", dueDate: now.toISOString(), daysRemaining: 2, isOverdue: false }, link: null, readAt: null, createdAt: now, kind: "virtual" as const },
      { id: "v-2", type: "ALERT_BUDGET", payload: { year: 2026, month: 3, categoryName: null, progress: 1.1, isOver: true, indicator: "over" }, link: null, readAt: null, createdAt: now, kind: "virtual" as const },
    ];
    const merged = mergeNotifications(persisted, virtual);
    expect(merged).toHaveLength(3);
  });
});
