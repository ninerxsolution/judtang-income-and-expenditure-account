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

const mockGetDaily = jest.fn().mockResolvedValue([
  { date: "2026-04-01", spent: 100 },
  { date: "2026-04-02", spent: 0 },
]);

jest.mock("@/lib/transactions", () => ({
  getDailyExpenseByDateInRange: (...args: unknown[]) => mockGetDaily(...args),
}));

jest.mock("@/lib/cache", () => ({
  unstable_cache: (fn: (...args: unknown[]) => Promise<unknown>) => fn,
  cacheKey: () => ["spending-efficiency"],
  CACHE_REVALIDATE_SECONDS: 45,
}));

import { GET } from "@/app/api/spending-efficiency/route";
import { createMockSession, TEST_USER_ID } from "../helpers/api-helper";

beforeEach(() => {
  jest.clearAllMocks();
});

describe("GET /api/spending-efficiency", () => {
  it("returns 401 when not authenticated", async () => {
    mockGetServerSession.mockResolvedValue(null);

    const req = new Request("http://localhost/api/spending-efficiency?from=2026-04-01&to=2026-04-30");
    const res = await GET(req);
    const data = (await res.json()) as { error: string };

    expect(res.status).toBe(401);
    expect(data).toEqual({ error: "Unauthorized" });
  });

  it("returns 400 when from or to missing", async () => {
    mockGetServerSession.mockResolvedValue(createMockSession());

    const req = new Request("http://localhost/api/spending-efficiency?from=2026-04-01");
    const res = await GET(req);
    const data = (await res.json()) as { error: string };

    expect(res.status).toBe(400);
    expect(data.error).toContain("from and to");
  });

  it("returns days when authenticated and params valid", async () => {
    mockGetServerSession.mockResolvedValue(createMockSession());

    const req = new Request(
      "http://localhost/api/spending-efficiency?from=2026-04-01&to=2026-04-02&timezone=Asia/Bangkok",
    );
    const res = await GET(req);
    const data = (await res.json()) as { days: { date: string; spent: number }[] };

    expect(res.status).toBe(200);
    expect(data.days).toEqual([
      { date: "2026-04-01", spent: 100 },
      { date: "2026-04-02", spent: 0 },
    ]);
    expect(mockGetDaily).toHaveBeenCalledWith(
      TEST_USER_ID,
      "2026-04-01",
      "2026-04-02",
      "Asia/Bangkok",
      [],
    );
  });

  it("passes excludedCategoryIds to aggregate function", async () => {
    mockGetServerSession.mockResolvedValue(createMockSession());

    const req = new Request(
      "http://localhost/api/spending-efficiency?from=2026-04-01&to=2026-04-02&timezone=Asia/Bangkok&excludedCategoryIds=cat-1,cat-2",
    );
    const res = await GET(req);
    const data = (await res.json()) as { days: { date: string; spent: number }[] };

    expect(res.status).toBe(200);
    expect(data.days).toHaveLength(2);
    expect(mockGetDaily).toHaveBeenCalledWith(
      TEST_USER_ID,
      "2026-04-01",
      "2026-04-02",
      "Asia/Bangkok",
      ["cat-1", "cat-2"],
    );
  });
});
