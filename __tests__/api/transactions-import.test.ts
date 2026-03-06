/**
 * @jest-environment node
 */
const mockGetServerSession = jest.fn();
const mockTransactionFindMany = jest.fn();
const mockTransactionCreate = jest.fn();
const mockTransactionUpdate = jest.fn();
const mockCategoryFindUnique = jest.fn();
const mockCategoryCreate = jest.fn();

jest.mock("next-auth", () => ({
  getServerSession: (...args: unknown[]) => mockGetServerSession(...args),
}));

jest.mock("@/auth", () => ({
  authOptions: {},
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    transaction: {
      findMany: (...args: unknown[]) => mockTransactionFindMany(...args),
      create: (...args: unknown[]) => mockTransactionCreate(...args),
      update: (...args: unknown[]) => mockTransactionUpdate(...args),
    },
    category: {
      findUnique: (...args: unknown[]) => mockCategoryFindUnique(...args),
      create: (...args: unknown[]) => mockCategoryCreate(...args),
    },
    $transaction: jest.fn((fn: (tx: unknown) => Promise<{ createdCount: number; updatedCount: number }>) => {
      const mockTx = {
        transaction: {
          create: (...args: unknown[]) => mockTransactionCreate(...args),
          update: (...args: unknown[]) => mockTransactionUpdate(...args),
        },
        category: {
          findUnique: (...args: unknown[]) => mockCategoryFindUnique(...args),
          create: (...args: unknown[]) => mockCategoryCreate(...args),
        },
      };
      return fn(mockTx);
    }),
  },
}));

jest.mock("@/lib/financial-accounts", () => ({
  ensureUserHasDefaultFinancialAccount: jest.fn().mockResolvedValue({ id: "default-acc-1" }),
}));

jest.mock("@/lib/activity-log", () => ({
  createActivityLog: jest.fn(),
  ActivityLogAction: { TRANSACTION_IMPORT: "TRANSACTION_IMPORT" },
}));

jest.mock("@/lib/cache", () => ({
  revalidateTag: jest.fn(),
}));

import { POST } from "@/app/api/transactions/import/route";
import { createMockSession } from "../helpers/api-helper";

beforeEach(() => {
  jest.clearAllMocks();
  mockGetServerSession.mockResolvedValue(null);
  mockTransactionFindMany.mockResolvedValue([]);
  mockTransactionCreate.mockResolvedValue({ id: "tx-1" });
  mockTransactionUpdate.mockResolvedValue({});
  mockCategoryFindUnique.mockResolvedValue(null);
  mockCategoryCreate.mockResolvedValue({ id: "cat-1" });
});

describe("POST /api/transactions/import", () => {
  it("returns 401 when not authenticated", async () => {
    mockGetServerSession.mockResolvedValue(null);
    const req = new Request("http://localhost/api/transactions/import", {
      method: "POST",
      headers: { "Content-Type": "text/csv" },
      body: "id,type,amount,occurredAt\n,EXPENSE,100,2026-01-15T00:00:00.000Z",
    });
    const res = await POST(req);
    const data = await res.json();
    expect(res.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns 400 when no CSV content provided", async () => {
    mockGetServerSession.mockResolvedValue(createMockSession());
    const req = new Request("http://localhost/api/transactions/import", {
      method: "POST",
      body: "",
    });
    const res = await POST(req);
    const data = await res.json();
    expect(res.status).toBe(400);
    expect(data.error).toContain("No CSV");
  });

  it("returns 200 with createdCount when valid CSV with new row", async () => {
    mockGetServerSession.mockResolvedValue(createMockSession());
    const header = "id,type,amount,category,note,occurredAt,createdAt,financialAccountId,transferAccountId,categoryId";
    const row = ",EXPENSE,100.00,Food,Lunch,2025-01-15T10:00:00.000Z,,,,";
    const csv = `${header}\n${row}`;
    const req = new Request("http://localhost/api/transactions/import", {
      method: "POST",
      headers: { "Content-Type": "text/csv; charset=utf-8" },
      body: csv,
    });
    const res = await POST(req);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.createdCount).toBe(1);
    expect(data.totalRows).toBe(1);
    expect(data.errorCount).toBe(0);
  });
});
