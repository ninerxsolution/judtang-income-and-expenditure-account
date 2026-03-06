/**
 * @jest-environment node
 */
const mockGetServerSession = jest.fn();
const mockGetSummaryByCategory = jest.fn();
const mockGetSummaryByMonth = jest.fn();
const mockFindMany = jest.fn();

jest.mock("next-auth", () => ({
  getServerSession: (...args: unknown[]) => mockGetServerSession(...args),
}));

jest.mock("@/auth", () => ({ authOptions: {} }));

jest.mock("@/lib/transactions", () => ({
  getSummaryByCategory: (...args: unknown[]) => mockGetSummaryByCategory(...args),
  getSummaryByMonth: (...args: unknown[]) => mockGetSummaryByMonth(...args),
}));

jest.mock("@/lib/date-range", () => ({
  getDateRangeInTimezone: jest.fn((dateStr: string) => {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr.trim());
    if (!match) return null;
    return {
      from: new Date(`${dateStr}T00:00:00Z`),
      to: new Date(`${dateStr}T23:59:59.999Z`),
    };
  }),
  toDateStringInTimezone: jest.fn((d: Date) => d.toISOString().slice(0, 10)),
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    transaction: {
      findMany: (...args: unknown[]) => mockFindMany(...args),
    },
  },
}));

jest.mock("@/lib/cache", () => ({
  unstable_cache: (fn: (...args: unknown[]) => Promise<unknown>) => fn,
  cacheKey: () => ["test"],
  CACHE_REVALIDATE_SECONDS: 45,
}));

import { GET as GET_BY_CATEGORY } from "@/app/api/transactions/summary-by-category/route";
import { GET as GET_BY_MONTH } from "@/app/api/transactions/summary-by-month/route";
import { GET as GET_YEAR_SUMMARY } from "@/app/api/transactions/year-summary/route";
import { GET as GET_MONTH_SUMMARY } from "@/app/api/transactions/month-summary/route";
import { GET as GET_CALENDAR } from "@/app/api/transactions/calendar-summary/route";
import { createRequest, createMockSession } from "../helpers/api-helper";

beforeEach(() => {
  jest.clearAllMocks();
  mockGetServerSession.mockResolvedValue(createMockSession());
});

describe("GET /api/transactions/summary-by-category", () => {
  it("returns 401 when not authenticated", async () => {
    mockGetServerSession.mockResolvedValue(null);
    const req = createRequest("http://localhost/api/transactions/summary-by-category?from=2025-01-01&to=2025-01-31");
    const res = await GET_BY_CATEGORY(req);
    expect(res.status).toBe(401);
  });

  it("returns 400 when from/to are missing", async () => {
    const req = createRequest("http://localhost/api/transactions/summary-by-category");
    const res = await GET_BY_CATEGORY(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 when from is invalid", async () => {
    const req = createRequest("http://localhost/api/transactions/summary-by-category?from=invalid&to=2025-01-31");
    const res = await GET_BY_CATEGORY(req);
    expect(res.status).toBe(400);
  });

  it("returns summary data for valid date range", async () => {
    const mockResult = [{ categoryId: "cat-1", name: "Food", total: 5000 }];
    mockGetSummaryByCategory.mockResolvedValue(mockResult);
    const req = createRequest("http://localhost/api/transactions/summary-by-category?from=2025-01-01&to=2025-01-31");
    const res = await GET_BY_CATEGORY(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toEqual(mockResult);
  });

  it("passes financialAccountId filter", async () => {
    mockGetSummaryByCategory.mockResolvedValue([]);
    const req = createRequest(
      "http://localhost/api/transactions/summary-by-category?from=2025-01-01&to=2025-01-31&financialAccountId=acc-1",
    );
    const res = await GET_BY_CATEGORY(req);
    expect(res.status).toBe(200);
    expect(mockGetSummaryByCategory).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ financialAccountId: "acc-1" }),
    );
  });
});

describe("GET /api/transactions/summary-by-month", () => {
  it("returns 401 when not authenticated", async () => {
    mockGetServerSession.mockResolvedValue(null);
    const req = createRequest("http://localhost/api/transactions/summary-by-month?year=2025");
    const res = await GET_BY_MONTH(req);
    expect(res.status).toBe(401);
  });

  it("returns 400 when year is missing", async () => {
    const req = createRequest("http://localhost/api/transactions/summary-by-month");
    const res = await GET_BY_MONTH(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 when year is not a number", async () => {
    const req = createRequest("http://localhost/api/transactions/summary-by-month?year=abc");
    const res = await GET_BY_MONTH(req);
    expect(res.status).toBe(400);
  });

  it("returns summary data for valid year", async () => {
    const mockResult = [{ month: 1, income: 50000, expense: 30000 }];
    mockGetSummaryByMonth.mockResolvedValue(mockResult);
    const req = createRequest("http://localhost/api/transactions/summary-by-month?year=2025");
    const res = await GET_BY_MONTH(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toEqual(mockResult);
  });
});

describe("GET /api/transactions/year-summary", () => {
  it("returns 401 when not authenticated", async () => {
    mockGetServerSession.mockResolvedValue(null);
    const req = createRequest("http://localhost/api/transactions/year-summary?fromYear=2024&toYear=2025");
    const res = await GET_YEAR_SUMMARY(req);
    expect(res.status).toBe(401);
  });

  it("returns 400 when fromYear/toYear are missing", async () => {
    const req = createRequest("http://localhost/api/transactions/year-summary");
    const res = await GET_YEAR_SUMMARY(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 when only fromYear is provided", async () => {
    const req = createRequest("http://localhost/api/transactions/year-summary?fromYear=2024");
    const res = await GET_YEAR_SUMMARY(req);
    expect(res.status).toBe(400);
  });

  it("returns year summary data", async () => {
    mockFindMany.mockResolvedValue([
      { occurredAt: new Date("2024-06-15"), type: "INCOME" },
      { occurredAt: new Date("2025-03-10"), type: "EXPENSE" },
    ]);
    const req = createRequest("http://localhost/api/transactions/year-summary?fromYear=2024&toYear=2025");
    const res = await GET_YEAR_SUMMARY(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
  });
});

describe("GET /api/transactions/month-summary", () => {
  it("returns 401 when not authenticated", async () => {
    mockGetServerSession.mockResolvedValue(null);
    const req = createRequest("http://localhost/api/transactions/month-summary?year=2025");
    const res = await GET_MONTH_SUMMARY(req);
    expect(res.status).toBe(401);
  });

  it("returns 400 when year is missing", async () => {
    const req = createRequest("http://localhost/api/transactions/month-summary");
    const res = await GET_MONTH_SUMMARY(req);
    expect(res.status).toBe(400);
  });

  it("returns month summary data", async () => {
    mockFindMany.mockResolvedValue([
      { occurredAt: new Date("2025-01-15"), type: "INCOME" },
      { occurredAt: new Date("2025-01-20"), type: "EXPENSE" },
      { occurredAt: new Date("2025-03-10"), type: "TRANSFER" },
    ]);
    const req = createRequest("http://localhost/api/transactions/month-summary?year=2025");
    const res = await GET_MONTH_SUMMARY(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
  });
});

describe("GET /api/transactions/calendar-summary", () => {
  it("returns 401 when not authenticated", async () => {
    mockGetServerSession.mockResolvedValue(null);
    const req = createRequest("http://localhost/api/transactions/calendar-summary?from=2025-01-01&to=2025-01-31");
    const res = await GET_CALENDAR(req);
    expect(res.status).toBe(401);
  });

  it("returns 400 when from/to are missing", async () => {
    const req = createRequest("http://localhost/api/transactions/calendar-summary");
    const res = await GET_CALENDAR(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 when only from is provided", async () => {
    const req = createRequest("http://localhost/api/transactions/calendar-summary?from=2025-01-01");
    const res = await GET_CALENDAR(req);
    expect(res.status).toBe(400);
  });

  it("returns calendar summary data", async () => {
    mockFindMany.mockResolvedValue([
      { occurredAt: new Date("2025-01-15"), type: "EXPENSE" },
      { occurredAt: new Date("2025-01-15"), type: "INCOME" },
      { occurredAt: new Date("2025-01-20"), type: "EXPENSE" },
    ]);
    const req = createRequest("http://localhost/api/transactions/calendar-summary?from=2025-01-01&to=2025-01-31");
    const res = await GET_CALENDAR(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
  });

  it("supports financialAccountId filter", async () => {
    mockFindMany.mockResolvedValue([]);
    const req = createRequest(
      "http://localhost/api/transactions/calendar-summary?from=2025-01-01&to=2025-01-31&financialAccountId=acc-1",
    );
    const res = await GET_CALENDAR(req);
    expect(res.status).toBe(200);
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ financialAccountId: "acc-1" }),
      }),
    );
  });
});
