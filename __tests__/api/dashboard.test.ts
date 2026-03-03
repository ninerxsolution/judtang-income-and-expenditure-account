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
  },
}));

jest.mock("@/lib/transactions", () => ({
  getTransactionsSummary: jest.fn().mockResolvedValue({
    totalIncome: 0,
    totalExpense: 0,
    totalTransfer: 0,
    totalPayment: 0,
    totalInterest: 0,
    totalAdjustment: 0,
  }),
  listTransactionsByUser: jest.fn().mockResolvedValue([]),
}));

jest.mock("@/lib/balance", () => ({
  getTotalBalance: jest.fn().mockResolvedValue(0),
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
  });
});
