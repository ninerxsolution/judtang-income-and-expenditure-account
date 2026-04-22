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

jest.mock("@/lib/transactions", () => ({
  getTransactionsSummary: jest.fn().mockResolvedValue({
    income: 1000,
    expense: 500,
  }),
}));

jest.mock("@/lib/balance", () => ({
  getTotalBalanceMeta: jest.fn().mockResolvedValue({ thb: 500, approximate: false }),
}));

jest.mock("@/lib/cache", () => ({
  unstable_cache: (fn: (...args: unknown[]) => Promise<unknown>) => fn,
  cacheKey: () => ["transactions-summary"],
  CACHE_REVALIDATE_SECONDS: 45,
}));

import { GET } from "@/app/api/transactions/summary/route";
import { createMockSession } from "../helpers/api-helper";

beforeEach(() => {
  jest.clearAllMocks();
});

describe("GET /api/transactions/summary", () => {
  it("returns 401 when not authenticated", async () => {
    mockGetServerSession.mockResolvedValue(null);

    const req = new Request("http://localhost/api/transactions/summary");
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data).toEqual({ error: "Unauthorized" });
  });

  it("returns summary when authenticated", async () => {
    mockGetServerSession.mockResolvedValue(createMockSession());

    const req = new Request("http://localhost/api/transactions/summary");
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toHaveProperty("income");
    expect(data).toHaveProperty("expense");
    expect(data).toHaveProperty("totalBalance");
    expect(data).toHaveProperty("totalBalanceApproximate");
  });
});
