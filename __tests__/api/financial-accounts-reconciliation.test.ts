/**
 * @jest-environment node
 */
const mockGetServerSession = jest.fn();
const mockFindFirst = jest.fn();
const mockCreateActivityLog = jest.fn();
const mockGetAccountBalance = jest.fn();
const mockReconFindMany = jest.fn();
const mockReconCount = jest.fn();
const mockTxCreate = jest.fn();
const mockTxAccountUpdate = jest.fn();
const mockDollarTransaction = jest.fn();

jest.mock("next-auth", () => ({
  getServerSession: (...args: unknown[]) => mockGetServerSession(...args),
}));

jest.mock("@/auth", () => ({ authOptions: {} }));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    financialAccount: {
      findFirst: (...args: unknown[]) => mockFindFirst(...args),
      update: (...args: unknown[]) => mockTxAccountUpdate(...args),
    },
    balanceReconciliation: {
      findMany: (...args: unknown[]) => mockReconFindMany(...args),
      count: (...args: unknown[]) => mockReconCount(...args),
      create: (...args: unknown[]) => mockTxCreate(...args),
    },
    $transaction: (arg: unknown) => mockDollarTransaction(arg),
  },
}));

jest.mock("@/lib/balance", () => ({
  getAccountBalance: (...args: unknown[]) => mockGetAccountBalance(...args),
}));

jest.mock("@/lib/activity-log", () => ({
  createActivityLog: (...args: unknown[]) => mockCreateActivityLog(...args),
  ActivityLogAction: {
    BALANCE_RECONCILIATION_RECORDED: "BALANCE_RECONCILIATION_RECORDED",
  },
}));

jest.mock("@/lib/cache", () => ({
  revalidateTag: jest.fn(),
}));

import { Prisma } from "@prisma/client";
import { GET, POST } from "@/app/api/financial-accounts/[id]/reconciliation/route";
import { createRequest, createMockSession, createParams, TEST_USER_ID } from "../helpers/api-helper";

const bankAccount = {
  id: "acc-bank",
  userId: TEST_USER_ID,
  type: "BANK",
  cardAccountType: null,
  currency: "THB",
};

const creditCardAccount = {
  id: "acc-cc",
  userId: TEST_USER_ID,
  type: "CREDIT_CARD",
  cardAccountType: "credit",
  currency: "THB",
};

const debitCardAccount = {
  id: "acc-debit",
  userId: TEST_USER_ID,
  type: "CREDIT_CARD",
  cardAccountType: "debit",
  currency: "THB",
};

beforeEach(() => {
  jest.clearAllMocks();
  mockDollarTransaction.mockImplementation((arg: unknown) => {
    if (Array.isArray(arg)) {
      return Promise.all(arg as Promise<unknown>[]);
    }
    return Promise.reject(new Error("expected array $transaction"));
  });
  mockGetServerSession.mockResolvedValue(createMockSession());
  mockCreateActivityLog.mockResolvedValue(undefined);
  mockGetAccountBalance.mockResolvedValue(1000);
  mockTxCreate.mockResolvedValue({
    id: "rec-1",
    checkedAt: new Date("2026-05-01T12:00:00.000Z"),
    appBalance: 1000,
    statedBalance: 1005,
    difference: 5,
    currency: "THB",
    note: null,
  });
  mockTxAccountUpdate.mockResolvedValue({});
});

describe("POST /api/financial-accounts/[id]/reconciliation", () => {
  it("returns 401 when not authenticated", async () => {
    mockGetServerSession.mockResolvedValue(null);
    const req = createRequest("http://localhost/api/financial-accounts/acc-bank/reconciliation", {
      method: "POST",
      body: { statedBalance: 100 },
    });
    const res = await POST(req, { params: createParams({ id: "acc-bank" }) });
    expect(res.status).toBe(401);
  });

  it("returns 404 when account not found", async () => {
    mockFindFirst.mockResolvedValue(null);
    const req = createRequest("http://localhost/api/financial-accounts/acc-x/reconciliation", {
      method: "POST",
      body: { statedBalance: 100 },
    });
    const res = await POST(req, { params: createParams({ id: "acc-x" }) });
    expect(res.status).toBe(404);
  });

  it("returns 400 for credit card (non-debit)", async () => {
    mockFindFirst.mockResolvedValue(creditCardAccount);
    const req = createRequest("http://localhost/api/financial-accounts/acc-cc/reconciliation", {
      method: "POST",
      body: { statedBalance: 100 },
    });
    const res = await POST(req, { params: createParams({ id: "acc-cc" }) });
    expect(res.status).toBe(400);
    expect(mockTxCreate).not.toHaveBeenCalled();
  });

  it("creates reconciliation and updates lastCheckedAt for BANK", async () => {
    mockFindFirst.mockResolvedValue(bankAccount);
    const req = createRequest("http://localhost/api/financial-accounts/acc-bank/reconciliation", {
      method: "POST",
      body: { statedBalance: 1005, note: "May statement" },
    });
    const res = await POST(req, { params: createParams({ id: "acc-bank" }) });
    expect(res.status).toBe(200);
    const data = (await res.json()) as { statedBalance: number; difference: number };
    expect(data.statedBalance).toBe(1005);
    expect(data.difference).toBe(5);
    expect(mockTxCreate).toHaveBeenCalled();
    expect(mockTxAccountUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "acc-bank" },
        data: expect.objectContaining({ lastCheckedAt: expect.any(Date) }) as Record<string, unknown>,
      }),
    );
    expect(mockCreateActivityLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "BALANCE_RECONCILIATION_RECORDED",
        entityId: "acc-bank",
      }),
    );
  });

  it("allows debit card account", async () => {
    mockFindFirst.mockResolvedValue(debitCardAccount);
    const req = createRequest("http://localhost/api/financial-accounts/acc-debit/reconciliation", {
      method: "POST",
      body: { statedBalance: 1000 },
    });
    const res = await POST(req, { params: createParams({ id: "acc-debit" }) });
    expect(res.status).toBe(200);
    expect(mockTxCreate).toHaveBeenCalled();
  });

  it("returns 400 when statedBalance is invalid", async () => {
    mockFindFirst.mockResolvedValue(bankAccount);
    const req = createRequest("http://localhost/api/financial-accounts/acc-bank/reconciliation", {
      method: "POST",
      body: { statedBalance: "not-a-number" },
    });
    const res = await POST(req, { params: createParams({ id: "acc-bank" }) });
    expect(res.status).toBe(400);
  });

  it("returns 503 with errorCode when reconciliation table is missing (P2021)", async () => {
    mockFindFirst.mockResolvedValue(bankAccount);
    mockDollarTransaction.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError("Table does not exist", {
        code: "P2021",
        clientVersion: "test",
      }),
    );
    const req = createRequest("http://localhost/api/financial-accounts/acc-bank/reconciliation", {
      method: "POST",
      body: { statedBalance: 1000 },
    });
    const res = await POST(req, { params: createParams({ id: "acc-bank" }) });
    expect(res.status).toBe(503);
    const data = (await res.json()) as { errorCode?: string };
    expect(data.errorCode).toBe("RECONCILIATION_TABLE_MISSING");
  });

  it("returns 503 when balanceReconciliation delegate is missing (stale Prisma client)", async () => {
    const mockModule = jest.requireMock<{ prisma: Record<string, unknown> }>("@/lib/prisma");
    const saved = mockModule.prisma.balanceReconciliation;
    mockModule.prisma.balanceReconciliation = undefined;
    try {
      mockFindFirst.mockResolvedValue(bankAccount);
      const req = createRequest("http://localhost/api/financial-accounts/acc-bank/reconciliation", {
        method: "POST",
        body: { statedBalance: 1000 },
      });
      const res = await POST(req, { params: createParams({ id: "acc-bank" }) });
      expect(res.status).toBe(503);
      const data = (await res.json()) as { errorCode?: string };
      expect(data.errorCode).toBe("RECONCILIATION_PRISMA_CLIENT_STALE");
      expect(mockDollarTransaction).not.toHaveBeenCalled();
    } finally {
      mockModule.prisma.balanceReconciliation = saved;
    }
  });

  it("returns 503 from catch when create throws stale-client TypeError", async () => {
    mockFindFirst.mockResolvedValue(bankAccount);
    mockDollarTransaction.mockRejectedValueOnce(
      new TypeError("Cannot read properties of undefined (reading 'create')"),
    );
    const req = createRequest("http://localhost/api/financial-accounts/acc-bank/reconciliation", {
      method: "POST",
      body: { statedBalance: 1000 },
    });
    const res = await POST(req, { params: createParams({ id: "acc-bank" }) });
    expect(res.status).toBe(503);
    const data = (await res.json()) as { errorCode?: string };
    expect(data.errorCode).toBe("RECONCILIATION_PRISMA_CLIENT_STALE");
  });
});

describe("GET /api/financial-accounts/[id]/reconciliation", () => {
  it("returns 401 when not authenticated", async () => {
    mockGetServerSession.mockResolvedValue(null);
    const req = createRequest("http://localhost/api/financial-accounts/acc-bank/reconciliation");
    const res = await GET(req, { params: createParams({ id: "acc-bank" }) });
    expect(res.status).toBe(401);
  });

  it("returns 400 for credit card (non-debit)", async () => {
    mockFindFirst.mockResolvedValue(creditCardAccount);
    const req = createRequest("http://localhost/api/financial-accounts/acc-cc/reconciliation");
    const res = await GET(req, { params: createParams({ id: "acc-cc" }) });
    expect(res.status).toBe(400);
  });

  it("returns 503 when balanceReconciliation delegate is missing (stale Prisma client)", async () => {
    const mockModule = jest.requireMock<{ prisma: Record<string, unknown> }>("@/lib/prisma");
    const saved = mockModule.prisma.balanceReconciliation;
    mockModule.prisma.balanceReconciliation = undefined;
    try {
      mockFindFirst.mockResolvedValue(bankAccount);
      const req = createRequest("http://localhost/api/financial-accounts/acc-bank/reconciliation");
      const res = await GET(req, { params: createParams({ id: "acc-bank" }) });
      expect(res.status).toBe(503);
      const data = (await res.json()) as { errorCode?: string };
      expect(data.errorCode).toBe("RECONCILIATION_PRISMA_CLIENT_STALE");
    } finally {
      mockModule.prisma.balanceReconciliation = saved;
    }
  });

  it("returns items and total for eligible account", async () => {
    mockFindFirst.mockResolvedValue(bankAccount);
    mockReconFindMany.mockResolvedValue([
      {
        id: "r1",
        checkedAt: new Date("2026-05-01T10:00:00.000Z"),
        appBalance: 100,
        statedBalance: 100,
        difference: 0,
        currency: "THB",
        note: null,
      },
    ]);
    mockReconCount.mockResolvedValue(1);
    const req = createRequest("http://localhost/api/financial-accounts/acc-bank/reconciliation");
    const res = await GET(req, { params: createParams({ id: "acc-bank" }) });
    expect(res.status).toBe(200);
    const data = (await res.json()) as { items: unknown[]; total: number };
    expect(data.total).toBe(1);
    expect(data.items).toHaveLength(1);
  });
});
