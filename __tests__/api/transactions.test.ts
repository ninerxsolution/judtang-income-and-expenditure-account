/**
 * @jest-environment node
 */
const mockGetServerSession = jest.fn();
const mockFindFirst = jest.fn();
const mockFindMany = jest.fn();
const mockGetTransactionById = jest.fn();
const mockUpdateTransaction = jest.fn();
const mockDeleteTransaction = jest.fn();

jest.mock("next-auth", () => ({
  getServerSession: (...args: unknown[]) => mockGetServerSession(...args),
}));

jest.mock("@/auth", () => ({
  authOptions: {},
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    financialAccount: {
      findFirst: (...args: unknown[]) => mockFindFirst(...args),
    },
    transaction: {
      findMany: (...args: unknown[]) => mockFindMany(...args),
    },
  },
}));

jest.mock("@/lib/financial-accounts", () => ({
  ensureUserHasDefaultFinancialAccount: jest.fn().mockResolvedValue({ id: "acc-1" }),
  isAccountIncomplete: jest.fn().mockReturnValue(false),
}));

jest.mock("@/lib/transactions", () => ({
  createTransaction: jest.fn().mockResolvedValue({
    id: "tx-1",
    type: "EXPENSE",
    status: "POSTED",
    amount: 100,
    occurredAt: new Date(),
    createdAt: new Date(),
    financialAccountId: "acc-1",
    transferAccountId: null,
    categoryId: null,
    category: null,
    note: null,
    postedDate: null,
  }),
  listTransactionsByUser: jest.fn().mockResolvedValue([]),
  getTransactionById: (...args: unknown[]) => mockGetTransactionById(...args),
  updateTransaction: (...args: unknown[]) => mockUpdateTransaction(...args),
  deleteTransaction: (...args: unknown[]) => mockDeleteTransaction(...args),
  TransactionType: {
    INCOME: "INCOME",
    EXPENSE: "EXPENSE",
    TRANSFER: "TRANSFER",
    PAYMENT: "PAYMENT",
    INTEREST: "INTEREST",
    ADJUSTMENT: "ADJUSTMENT",
  },
}));

jest.mock("@/lib/credit-card", () => ({
  recordPayment: jest.fn(),
}));

jest.mock("@/lib/cache", () => ({
  unstable_cache: (fn: (...args: unknown[]) => Promise<unknown>) => fn,
  cacheKey: () => ["transactions"],
  CACHE_REVALIDATE_SECONDS: 45,
  revalidateTag: jest.fn(),
}));

import { POST, GET } from "@/app/api/transactions/route";
import { GET as GET_ID, PATCH, DELETE } from "@/app/api/transactions/[id]/route";
import { createRequest, createMockSession, createParams } from "../helpers/api-helper";

const mockTransaction = {
  id: "tx-1",
  type: "EXPENSE",
  status: "POSTED",
  amount: { toNumber: () => 100 },
  financialAccountId: "acc-1",
  transferAccountId: null,
  categoryId: null,
  category: null,
  note: null,
  occurredAt: new Date(),
  postedDate: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

beforeEach(() => {
  jest.clearAllMocks();
  mockFindFirst.mockResolvedValue({
    id: "acc-1",
    userId: "test-user-id",
    type: "CASH",
    bankName: null,
    accountNumber: null,
    creditLimit: null,
    interestRate: null,
    cardType: null,
  });
  mockFindMany.mockResolvedValue([]);
  mockGetTransactionById.mockResolvedValue(null);
  mockUpdateTransaction.mockResolvedValue(null);
  mockDeleteTransaction.mockResolvedValue(null);
});

describe("POST /api/transactions", () => {
  it("returns 401 when not authenticated", async () => {
    mockGetServerSession.mockResolvedValue(null);

    const req = createRequest("http://localhost/api/transactions", {
      method: "POST",
      body: { type: "EXPENSE", amount: 100 },
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data).toEqual({ error: "Unauthorized" });
  });

  it("returns 400 when type is invalid", async () => {
    mockGetServerSession.mockResolvedValue(createMockSession());

    const req = createRequest("http://localhost/api/transactions", {
      method: "POST",
      body: { type: "INVALID", amount: 100 },
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain("type");
  });

  it("returns 400 when amount is invalid", async () => {
    mockGetServerSession.mockResolvedValue(createMockSession());

    const req = createRequest("http://localhost/api/transactions", {
      method: "POST",
      body: { type: "EXPENSE", amount: -10 },
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toMatch(/amount|positive/);
  });

  it("returns 200 and creates transaction", async () => {
    mockGetServerSession.mockResolvedValue(createMockSession());

    const req = createRequest("http://localhost/api/transactions", {
      method: "POST",
      body: { type: "EXPENSE", amount: 100 },
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toHaveProperty("id");
    expect(data.type).toBe("EXPENSE");
    expect(data.amount).toBe(100);
  });
});

describe("GET /api/transactions", () => {
  it("returns 401 when not authenticated", async () => {
    mockGetServerSession.mockResolvedValue(null);

    const req = new Request("http://localhost/api/transactions");
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data).toEqual({ error: "Unauthorized" });
  });

  it("returns transactions list when authenticated", async () => {
    mockGetServerSession.mockResolvedValue(createMockSession());

    const req = new Request("http://localhost/api/transactions");
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
  });
});

describe("GET /api/transactions/[id]", () => {
  it("returns 401 when not authenticated", async () => {
    mockGetServerSession.mockResolvedValue(null);

    const res = await GET_ID(new Request("http://localhost"), {
      params: createParams({ id: "tx-1" }),
    });
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data).toEqual({ error: "Unauthorized" });
  });

  it("returns 400 when id is missing", async () => {
    mockGetServerSession.mockResolvedValue(createMockSession());

    const res = await GET_ID(new Request("http://localhost"), {
      params: createParams({ id: "" }),
    });
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data).toEqual({ error: "Missing id" });
  });

  it("returns 404 when transaction not found", async () => {
    mockGetServerSession.mockResolvedValue(createMockSession());
    mockGetTransactionById.mockResolvedValue(null);

    const res = await GET_ID(new Request("http://localhost"), {
      params: createParams({ id: "tx-nonexistent" }),
    });
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data).toEqual({ error: "Transaction not found" });
  });

  it("returns 200 with transaction when found", async () => {
    mockGetServerSession.mockResolvedValue(createMockSession());
    mockGetTransactionById.mockResolvedValue(mockTransaction);

    const res = await GET_ID(new Request("http://localhost"), {
      params: createParams({ id: "tx-1" }),
    });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.id).toBe("tx-1");
    expect(data.type).toBe("EXPENSE");
    expect(data.amount).toBe(100);
  });
});

describe("PATCH /api/transactions/[id]", () => {
  it("returns 401 when not authenticated", async () => {
    mockGetServerSession.mockResolvedValue(null);

    const req = createRequest("http://localhost/api/transactions/tx-1", {
      method: "PATCH",
      body: { amount: 200 },
    });
    const res = await PATCH(req, { params: createParams({ id: "tx-1" }) });
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data).toEqual({ error: "Unauthorized" });
  });

  it("returns 400 when body is invalid JSON", async () => {
    mockGetServerSession.mockResolvedValue(createMockSession());

    const req = new Request("http://localhost/api/transactions/tx-1", {
      method: "PATCH",
      body: "invalid json",
      headers: { "Content-Type": "application/json" },
    });
    const res = await PATCH(req, { params: createParams({ id: "tx-1" }) });
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data).toEqual({ error: "Invalid JSON" });
  });

  it("returns 404 when transaction not found", async () => {
    mockGetServerSession.mockResolvedValue(createMockSession());
    mockUpdateTransaction.mockRejectedValue(new Error("Transaction not found"));

    const req = createRequest("http://localhost/api/transactions/tx-nonexistent", {
      method: "PATCH",
      body: { amount: 200 },
    });
    const res = await PATCH(req, { params: createParams({ id: "tx-nonexistent" }) });
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toBe("Transaction not found");
  });

  it("returns 200 and updates transaction", async () => {
    mockGetServerSession.mockResolvedValue(createMockSession());
    mockUpdateTransaction.mockResolvedValue({
      ...mockTransaction,
      amount: { toNumber: () => 200 },
    });

    const req = createRequest("http://localhost/api/transactions/tx-1", {
      method: "PATCH",
      body: { amount: 200 },
    });
    const res = await PATCH(req, { params: createParams({ id: "tx-1" }) });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.amount).toBe(200);
  });
});

describe("DELETE /api/transactions/[id]", () => {
  it("returns 401 when not authenticated", async () => {
    mockGetServerSession.mockResolvedValue(null);

    const res = await DELETE(new Request("http://localhost"), {
      params: createParams({ id: "tx-1" }),
    });
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data).toEqual({ error: "Unauthorized" });
  });

  it("returns 400 when id is missing", async () => {
    mockGetServerSession.mockResolvedValue(createMockSession());

    const res = await DELETE(new Request("http://localhost"), {
      params: createParams({ id: "" }),
    });
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data).toEqual({ error: "Missing id" });
  });

  it("returns 404 when transaction not found", async () => {
    mockGetServerSession.mockResolvedValue(createMockSession());
    mockDeleteTransaction.mockResolvedValue(null);

    const res = await DELETE(new Request("http://localhost"), {
      params: createParams({ id: "tx-nonexistent" }),
    });
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data).toEqual({ error: "Transaction not found" });
  });

  it("returns 200 when deleted successfully", async () => {
    mockGetServerSession.mockResolvedValue(createMockSession());
    mockDeleteTransaction.mockResolvedValue(mockTransaction);

    const res = await DELETE(new Request("http://localhost"), {
      params: createParams({ id: "tx-1" }),
    });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toEqual({ ok: true });
  });
});
