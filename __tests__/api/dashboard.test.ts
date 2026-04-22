/**
 * @jest-environment node
 */
const mockGetServerSession = jest.fn();
const mockFindUnique = jest.fn();

jest.mock("next-auth", () => ({
  getServerSession: (...args: unknown[]) => mockGetServerSession(...args),
}));

jest.mock("@/auth", () => ({
  authOptions: {},
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
    },
    financialAccount: {
      count: jest.fn().mockResolvedValue(1),
    },
  },
}));

jest.mock("@/lib/transactions", () => ({
  getTransactionsSummary: jest.fn().mockResolvedValue({
    income: 0,
    expense: 0,
  }),
  listTransactionsByUser: jest.fn().mockResolvedValue([]),
  getExpenseWeekOverview: jest.fn().mockResolvedValue({
    todayExpense: 0,
    weekTotalExpense: 0,
    weekDays: Array.from({ length: 7 }, (_, i) => ({
      date: `2026-01-${String(i + 1).padStart(2, "0")}`,
      spent: 0,
      isToday: i === 3,
    })),
  }),
}));

jest.mock("@/lib/balance", () => ({
  getTotalBalanceMeta: jest.fn().mockResolvedValue({ thb: 0, approximate: false }),
}));

import { GET } from "@/app/api/dashboard/init/route";
import { createMockSession } from "../helpers/api-helper";

beforeEach(() => {
  jest.clearAllMocks();
  mockFindUnique.mockResolvedValue({
    name: "Test User",
    email: "test@example.com",
    image: null,
  });
});

describe("GET /api/dashboard/init", () => {
  it("returns 401 when not authenticated", async () => {
    mockGetServerSession.mockResolvedValue(null);

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data).toEqual({ error: "Unauthorized" });
  });

  it("returns dashboard data when authenticated", async () => {
    mockGetServerSession.mockResolvedValue(createMockSession());

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toHaveProperty("user");
    expect(data).toHaveProperty("summary");
    expect(data).toHaveProperty("appInfo");
    expect(data).toHaveProperty("recentTransactions");
    expect(data).toHaveProperty("accountCount");
    expect(data).toHaveProperty("spendingOverview");
    expect(data.accountCount).toBe(1);
  });
});
