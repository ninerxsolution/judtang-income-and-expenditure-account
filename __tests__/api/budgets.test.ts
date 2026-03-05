/**
 * @jest-environment node
 */
const mockGetServerSession = jest.fn();

jest.mock("next-auth", () => ({
  getServerSession: (...args: unknown[]) => mockGetServerSession(...args),
}));

jest.mock("@/auth", () => ({
  authOptions: {},
}));

jest.mock("@/lib/budget", () => ({
  getBudgetForMonth: jest.fn().mockResolvedValue({
    budgetMonth: {
      id: "bm-1",
      year: 2026,
      month: 3,
      totalBudget: 30000,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    totalSpent: 15000,
    totalBudget: 30000,
    totalProgress: 0.5,
    totalIndicator: "normal",
    categoryBudgets: [],
  }),
}));

import { GET } from "@/app/api/budgets/route";
import { createMockSession } from "../helpers/api-helper";

beforeEach(() => {
  jest.clearAllMocks();
});

describe("GET /api/budgets", () => {
  it("returns 401 when not authenticated", async () => {
    mockGetServerSession.mockResolvedValue(null);

    const res = await GET(new Request("http://localhost/api/budgets"));
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data).toEqual({ error: "Unauthorized" });
  });

  it("returns 400 when year or month invalid", async () => {
    mockGetServerSession.mockResolvedValue(createMockSession());

    const res = await GET(
      new Request("http://localhost/api/budgets?year=invalid&month=3")
    );
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain("year");
  });

  it("returns budget data when authenticated with valid params", async () => {
    mockGetServerSession.mockResolvedValue(createMockSession());

    const res = await GET(
      new Request("http://localhost/api/budgets?year=2026&month=3")
    );
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.totalSpent).toBe(15000);
    expect(data.totalBudget).toBe(30000);
    expect(data.totalProgress).toBe(0.5);
    expect(data.totalIndicator).toBe("normal");
  });
});
