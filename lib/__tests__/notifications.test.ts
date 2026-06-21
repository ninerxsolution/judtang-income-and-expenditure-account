/**
 * Unit tests for lib/notifications.ts (unified persisted model).
 */

// ---------------------------------------------------------------------------
// Mock prisma
// ---------------------------------------------------------------------------
const mockNotificationCreate = jest.fn();
const mockNotificationFindMany = jest.fn();
const mockNotificationUpdateMany = jest.fn();
const mockNotificationDeleteMany = jest.fn();
const mockNotificationCount = jest.fn();
const mockFinancialAccountFindMany = jest.fn();
const mockUserFindUnique = jest.fn();
const mockBudgetTemplateCount = jest.fn();
const mockPrefFindMany = jest.fn();
const mockPrefFindUnique = jest.fn();

jest.mock("@/lib/prisma", () => ({
  prisma: {
    notification: {
      create: (...args: unknown[]) => mockNotificationCreate(...args),
      findMany: (...args: unknown[]) => mockNotificationFindMany(...args),
      updateMany: (...args: unknown[]) => mockNotificationUpdateMany(...args),
      deleteMany: (...args: unknown[]) => mockNotificationDeleteMany(...args),
      count: (...args: unknown[]) => mockNotificationCount(...args),
    },
    financialAccount: {
      findMany: (...args: unknown[]) => mockFinancialAccountFindMany(...args),
    },
    user: {
      findUnique: (...args: unknown[]) => mockUserFindUnique(...args),
    },
    budgetTemplate: {
      count: (...args: unknown[]) => mockBudgetTemplateCount(...args),
    },
    notificationPreference: {
      findMany: (...args: unknown[]) => mockPrefFindMany(...args),
      findUnique: (...args: unknown[]) => mockPrefFindUnique(...args),
    },
  },
}));

jest.mock("@/lib/recurring-transactions", () => ({
  getDueRecurringTransactions: jest.fn(),
}));

jest.mock("@/lib/budget", () => ({
  getBudgetForMonth: jest.fn(),
  getBudgetIndicator: (progress: number) => {
    if (progress > 1) return "over";
    if (progress >= 1) return "full";
    return "near";
  },
}));

jest.mock("@/lib/financial-accounts", () => ({
  isAccountIncomplete: jest.fn(),
}));

import { Prisma } from "@prisma/client";
import {
  notify,
  listNotifications,
  markNotificationsRead,
  markAllNotificationsRead,
  countUnreadNotifications,
  deleteNotifications,
  generateNotifications,
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
  // Defaults: no preferences (registry defaults apply), nothing due.
  mockPrefFindMany.mockResolvedValue([]);
  mockPrefFindUnique.mockResolvedValue(null);
  mockNotificationCreate.mockResolvedValue({});
  mockNotificationDeleteMany.mockResolvedValue({ count: 0 });
});

// ---------------------------------------------------------------------------
// notify
// ---------------------------------------------------------------------------

describe("notify", () => {
  it("persists an in-app row by default and reports created", async () => {
    const result = await notify("user-1", "EVENT_IMPORT_DONE", {
      payload: { createdCount: 5 },
      link: "/dashboard/transactions",
    });
    expect(result).toEqual({ created: true });
    expect(mockNotificationCreate).toHaveBeenCalledWith({
      data: {
        userId: "user-1",
        type: "EVENT_IMPORT_DONE",
        payload: { createdCount: 5 },
        link: "/dashboard/transactions",
        dedupeKey: null,
      },
    });
  });

  it("treats a duplicate dedupeKey (P2002) as not-created, not an error", async () => {
    mockNotificationCreate.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("dup", { code: "P2002", clientVersion: "x" }),
    );
    const result = await notify("user-1", "ALERT_BUDGET", { dedupeKey: "budget-total:2026-6" });
    expect(result).toEqual({ created: false });
  });

  it("does not persist when the category's inApp channel is off", async () => {
    mockPrefFindUnique.mockResolvedValue({ inApp: false, email: false, push: false });
    const result = await notify("user-1", "EVENT_IMPORT_DONE", { payload: {} });
    expect(result).toEqual({ created: false });
    expect(mockNotificationCreate).not.toHaveBeenCalled();
  });

  it("never throws when the DB rejects for an unknown reason", async () => {
    mockNotificationCreate.mockRejectedValue(new Error("DB down"));
    await expect(notify("user-1", "EVENT_SLIP_DONE")).resolves.toEqual({ created: false });
  });
});

// ---------------------------------------------------------------------------
// list / mark / count / delete
// ---------------------------------------------------------------------------

describe("listNotifications", () => {
  const now = new Date();
  const rows = [
    { id: "n-1", type: "EVENT_IMPORT_DONE", payload: { createdCount: 3 }, link: "/x", readAt: null, createdAt: now },
    { id: "n-2", type: "ALERT_BUDGET", payload: null, link: null, readAt: now, createdAt: now },
  ];

  it("maps rows through", async () => {
    mockNotificationFindMany.mockResolvedValue(rows);
    const result = await listNotifications("user-1");
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ id: "n-1", readAt: null });
  });

  it("respects unreadOnly and default limit", async () => {
    mockNotificationFindMany.mockResolvedValue([]);
    await listNotifications("user-1", { unreadOnly: true });
    expect(mockNotificationFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ readAt: null }), take: 50 }),
    );
  });
});

describe("read-state mutators", () => {
  it("markNotificationsRead sets readAt scoped to user", async () => {
    mockNotificationUpdateMany.mockResolvedValue({ count: 2 });
    await markNotificationsRead("user-1", ["n-1", "n-2"]);
    expect(mockNotificationUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: { in: ["n-1", "n-2"] }, userId: "user-1", readAt: null }),
        data: { readAt: expect.any(Date) },
      }),
    );
  });

  it("markNotificationsRead no-ops on empty ids", async () => {
    await markNotificationsRead("user-1", []);
    expect(mockNotificationUpdateMany).not.toHaveBeenCalled();
  });

  it("markAllNotificationsRead clears all unread", async () => {
    mockNotificationUpdateMany.mockResolvedValue({ count: 5 });
    await markAllNotificationsRead("user-1");
    expect(mockNotificationUpdateMany).toHaveBeenCalledWith({
      where: { userId: "user-1", readAt: null },
      data: { readAt: expect.any(Date) },
    });
  });

  it("deleteNotifications removes by id scoped to user", async () => {
    mockNotificationDeleteMany.mockResolvedValue({ count: 1 });
    await deleteNotifications("user-1", ["n-1"]);
    expect(mockNotificationDeleteMany).toHaveBeenCalledWith({
      where: { id: { in: ["n-1"] }, userId: "user-1" },
    });
  });
});

describe("countUnreadNotifications", () => {
  it("counts unread rows", async () => {
    mockNotificationCount.mockResolvedValue(7);
    expect(await countUnreadNotifications("user-1")).toBe(7);
    expect(mockNotificationCount).toHaveBeenCalledWith({ where: { userId: "user-1", readAt: null } });
  });
});

// ---------------------------------------------------------------------------
// generateNotifications (idempotent + auto-resolve)
// ---------------------------------------------------------------------------

const emptyBudget = {
  budgetMonth: null,
  totalSpent: 0,
  totalBudget: null,
  totalProgress: 0,
  totalIndicator: "normal" as const,
  categoryBudgets: [],
};

function makeDueItem(isPaid: boolean) {
  return {
    id: "rt-1",
    userId: "user-1",
    name: "Rent",
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
  } as unknown as Awaited<ReturnType<typeof getDueRecurringTransactions>>[number];
}

describe("generateNotifications", () => {
  beforeEach(() => {
    mockGetDueRecurring.mockResolvedValue([]);
    mockGetBudgetForMonth.mockResolvedValue(emptyBudget);
    mockFinancialAccountFindMany.mockResolvedValue([]);
    mockIsAccountIncomplete.mockReturnValue(false);
    mockUserFindUnique.mockResolvedValue({ deleteAfter: null, status: "ACTIVE" });
    mockBudgetTemplateCount.mockResolvedValue(0);
    // existing-keys lookup returns nothing by default
    mockNotificationFindMany.mockResolvedValue([]);
  });

  it("creates a recurring-due alert when unpaid items exist", async () => {
    mockGetDueRecurring.mockResolvedValue([makeDueItem(false), makeDueItem(false)]);
    await generateNotifications("user-1");
    expect(mockNotificationCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: "ALERT_RECURRING_DUE",
          dedupeKey: expect.stringMatching(/^recurring-due:/),
        }),
      }),
    );
  });

  it("does NOT recreate an alert whose dedupeKey already exists", async () => {
    mockGetDueRecurring.mockResolvedValue([makeDueItem(false)]);
    // Echo back every queried dedupeKey as already-existing.
    mockNotificationFindMany.mockImplementation((args: { where?: { dedupeKey?: { in?: string[] } } }) => {
      const keys = args?.where?.dedupeKey?.in ?? [];
      return Promise.resolve(keys.map((k) => ({ dedupeKey: k })));
    });
    await generateNotifications("user-1");
    expect(mockNotificationCreate).not.toHaveBeenCalled();
  });

  it("auto-resolves stale unread alerts", async () => {
    await generateNotifications("user-1"); // no candidates
    expect(mockNotificationDeleteMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: "user-1", readAt: null }),
      }),
    );
  });

  it("nudges ALERT_NO_BUDGET only when the user has budget templates", async () => {
    mockBudgetTemplateCount.mockResolvedValue(2);
    await generateNotifications("user-1");
    expect(mockNotificationCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ type: "ALERT_NO_BUDGET" }),
      }),
    );
  });

  it("does not nudge ALERT_NO_BUDGET when the user has no templates", async () => {
    mockBudgetTemplateCount.mockResolvedValue(0);
    await generateNotifications("user-1");
    const calledTypes = mockNotificationCreate.mock.calls.map((c) => c[0]?.data?.type);
    expect(calledTypes).not.toContain("ALERT_NO_BUDGET");
  });
});
