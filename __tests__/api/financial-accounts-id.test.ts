/**
 * @jest-environment node
 */
const mockGetServerSession = jest.fn();
const mockFindFirst = jest.fn();
const mockUpdate = jest.fn();
const mockUpdateMany = jest.fn();
const mockDelete = jest.fn();
const mockTxCount = jest.fn();
const mockTxFindFirst = jest.fn();
const mockGetAccountBalance = jest.fn();
const mockGetCurrentOutstanding = jest.fn();
const mockGetAvailableCredit = jest.fn();
const mockGetLatestStatement = jest.fn();
const mockCreateActivityLog = jest.fn();

jest.mock("next-auth", () => ({
  getServerSession: (...args: unknown[]) => mockGetServerSession(...args),
}));

jest.mock("@/auth", () => ({ authOptions: {} }));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    financialAccount: {
      findFirst: (...args: unknown[]) => mockFindFirst(...args),
      update: (...args: unknown[]) => mockUpdate(...args),
      updateMany: (...args: unknown[]) => mockUpdateMany(...args),
      delete: (...args: unknown[]) => mockDelete(...args),
    },
    transaction: {
      findFirst: (...args: unknown[]) => mockTxFindFirst(...args),
      count: (...args: unknown[]) => mockTxCount(...args),
    },
  },
}));

jest.mock("@/lib/balance", () => ({
  getAccountBalance: (...args: unknown[]) => mockGetAccountBalance(...args),
}));

jest.mock("@/lib/credit-card", () => ({
  getCurrentOutstanding: (...args: unknown[]) => mockGetCurrentOutstanding(...args),
  getAvailableCredit: (...args: unknown[]) => mockGetAvailableCredit(...args),
  getLatestStatement: (...args: unknown[]) => mockGetLatestStatement(...args),
}));

jest.mock("@/lib/activity-log", () => ({
  createActivityLog: (...args: unknown[]) => mockCreateActivityLog(...args),
  ActivityLogAction: {
    FINANCIAL_ACCOUNT_UPDATED: "FINANCIAL_ACCOUNT_UPDATED",
    FINANCIAL_ACCOUNT_DISABLED: "FINANCIAL_ACCOUNT_DISABLED",
    FINANCIAL_ACCOUNT_DELETED: "FINANCIAL_ACCOUNT_DELETED",
    FINANCIAL_ACCOUNT_RESTORED: "FINANCIAL_ACCOUNT_RESTORED",
  },
}));

jest.mock("@/lib/cache", () => ({
  revalidateTag: jest.fn(),
}));

jest.mock("@/lib/account-number", () => ({
  getAccountNumberForMasking: jest.fn(() => "1234"),
  getFullAccountNumber: jest.fn(() => "1234567890"),
  processAccountNumberForStorage: jest.fn(
    (num: string | null, mode: string) => ({
      accountNumber: num,
      accountNumberMode: mode,
    }),
  ),
}));

jest.mock("@/lib/financial-accounts", () => ({
  isAccountIncomplete: jest.fn(() => false),
}));

import { GET, PATCH, DELETE } from "@/app/api/financial-accounts/[id]/route";
import { PATCH as DISABLE } from "@/app/api/financial-accounts/[id]/disable/route";
import { PATCH as RESTORE } from "@/app/api/financial-accounts/[id]/restore/route";
import { createRequest, createMockSession, createParams, TEST_USER_ID } from "../helpers/api-helper";

const mockAccount = {
  id: "acc-1",
  userId: TEST_USER_ID,
  name: "Main Bank",
  type: "BANK",
  initialBalance: 10000,
  isActive: true,
  isDefault: false,
  isHidden: false,
  lastCheckedAt: null,
  createdAt: new Date("2025-01-01"),
  bankName: "SCB",
  accountNumber: "1234567890",
  accountNumberMode: "FULL",
  creditLimit: null,
  statementClosingDay: null,
  dueDay: null,
  interestRate: null,
  cardAccountType: null,
  cardNetwork: null,
};

beforeEach(() => {
  jest.clearAllMocks();
  mockGetServerSession.mockResolvedValue(createMockSession());
  mockCreateActivityLog.mockResolvedValue(undefined);
});

describe("GET /api/financial-accounts/[id]", () => {
  it("returns 401 when not authenticated", async () => {
    mockGetServerSession.mockResolvedValue(null);
    const req = createRequest("http://localhost/api/financial-accounts/acc-1");
    const res = await GET(req, { params: createParams({ id: "acc-1" }) });
    expect(res.status).toBe(401);
  });

  it("returns 404 when account not found", async () => {
    mockFindFirst.mockResolvedValue(null);
    const req = createRequest("http://localhost/api/financial-accounts/acc-999");
    const res = await GET(req, { params: createParams({ id: "acc-999" }) });
    expect(res.status).toBe(404);
  });

  it("returns account details for BANK type", async () => {
    mockFindFirst.mockResolvedValue(mockAccount);
    mockGetAccountBalance.mockResolvedValue(15000);
    mockTxFindFirst.mockResolvedValue({ occurredAt: new Date("2025-06-01") });
    mockTxCount.mockResolvedValue(42);

    const req = createRequest("http://localhost/api/financial-accounts/acc-1");
    const res = await GET(req, { params: createParams({ id: "acc-1" }) });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.id).toBe("acc-1");
    expect(data.name).toBe("Main Bank");
    expect(data.balance).toBe(15000);
    expect(data.transactionCount).toBe(42);
  });

  it("returns credit card details for CREDIT_CARD type", async () => {
    const ccAccount = {
      ...mockAccount,
      type: "CREDIT_CARD",
      creditLimit: 50000,
      statementClosingDay: 25,
      dueDay: 10,
      interestRate: 18.5,
    };
    mockFindFirst.mockResolvedValue(ccAccount);
    mockGetAccountBalance.mockResolvedValue(-3000);
    mockTxFindFirst.mockResolvedValue(null);
    mockTxCount.mockResolvedValue(10);
    mockGetCurrentOutstanding.mockResolvedValue(3000);
    mockGetAvailableCredit.mockResolvedValue(47000);
    mockGetLatestStatement.mockResolvedValue({
      id: "stmt-1",
      closingDate: new Date("2025-06-25"),
      dueDate: new Date("2025-07-10"),
      statementBalance: 5000,
      paidAmount: 2000,
      isPaid: false,
    });

    const req = createRequest("http://localhost/api/financial-accounts/acc-1");
    const res = await GET(req, { params: createParams({ id: "acc-1" }) });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.creditLimit).toBe(50000);
    expect(data.currentOutstanding).toBe(3000);
    expect(data.availableCredit).toBe(47000);
    expect(data.latestStatement).toMatchObject({ id: "stmt-1", isPaid: false });
  });
});

describe("PATCH /api/financial-accounts/[id]", () => {
  it("returns 401 when not authenticated", async () => {
    mockGetServerSession.mockResolvedValue(null);
    const req = createRequest("http://localhost/api/financial-accounts/acc-1", {
      method: "PATCH",
      body: { name: "Updated" },
    });
    const res = await PATCH(req, { params: createParams({ id: "acc-1" }) });
    expect(res.status).toBe(401);
  });

  it("returns 404 when account not found", async () => {
    mockFindFirst.mockResolvedValue(null);
    const req = createRequest("http://localhost/api/financial-accounts/acc-1", {
      method: "PATCH",
      body: { name: "Updated" },
    });
    const res = await PATCH(req, { params: createParams({ id: "acc-1" }) });
    expect(res.status).toBe(404);
  });

  it("updates account name", async () => {
    mockFindFirst.mockResolvedValue(mockAccount);
    mockUpdate.mockResolvedValue({ ...mockAccount, name: "Updated Bank", createdAt: new Date("2025-01-01") });
    const req = createRequest("http://localhost/api/financial-accounts/acc-1", {
      method: "PATCH",
      body: { name: "Updated Bank" },
    });
    const res = await PATCH(req, { params: createParams({ id: "acc-1" }) });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.name).toBe("Updated Bank");
  });

  it("returns current account when no valid fields provided", async () => {
    mockFindFirst.mockResolvedValue(mockAccount);
    const req = createRequest("http://localhost/api/financial-accounts/acc-1", {
      method: "PATCH",
      body: {},
    });
    const res = await PATCH(req, { params: createParams({ id: "acc-1" }) });
    expect(res.status).toBe(200);
  });

  it("returns 400 on invalid JSON", async () => {
    mockFindFirst.mockResolvedValue(mockAccount);
    const req = new Request("http://localhost/api/financial-accounts/acc-1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: "bad json",
    });
    const res = await PATCH(req, { params: createParams({ id: "acc-1" }) });
    expect(res.status).toBe(400);
  });

  it("clears other defaults when setting isDefault=true", async () => {
    mockFindFirst.mockResolvedValue(mockAccount);
    mockUpdateMany.mockResolvedValue({ count: 1 });
    mockUpdate.mockResolvedValue({
      ...mockAccount,
      isDefault: true,
      createdAt: new Date("2025-01-01"),
    });
    const req = createRequest("http://localhost/api/financial-accounts/acc-1", {
      method: "PATCH",
      body: { isDefault: true },
    });
    const res = await PATCH(req, { params: createParams({ id: "acc-1" }) });
    expect(res.status).toBe(200);
    expect(mockUpdateMany).toHaveBeenCalled();
  });

  it("returns 500 when update fails", async () => {
    mockFindFirst.mockResolvedValue(mockAccount);
    mockUpdate.mockRejectedValue(new Error("DB error"));
    const req = createRequest("http://localhost/api/financial-accounts/acc-1", {
      method: "PATCH",
      body: { name: "Fail" },
    });
    const res = await PATCH(req, { params: createParams({ id: "acc-1" }) });
    expect(res.status).toBe(500);
  });
});

describe("DELETE /api/financial-accounts/[id]", () => {
  it("returns 401 when not authenticated", async () => {
    mockGetServerSession.mockResolvedValue(null);
    const req = createRequest("http://localhost/api/financial-accounts/acc-1", { method: "DELETE" });
    const res = await DELETE(req, { params: createParams({ id: "acc-1" }) });
    expect(res.status).toBe(401);
  });

  it("returns 404 when account not found", async () => {
    mockFindFirst.mockResolvedValue(null);
    const req = createRequest("http://localhost/api/financial-accounts/acc-1", { method: "DELETE" });
    const res = await DELETE(req, { params: createParams({ id: "acc-1" }) });
    expect(res.status).toBe(404);
  });

  it("returns 400 when trying to delete default account", async () => {
    mockFindFirst.mockResolvedValue({ ...mockAccount, isDefault: true });
    const req = createRequest("http://localhost/api/financial-accounts/acc-1", { method: "DELETE" });
    const res = await DELETE(req, { params: createParams({ id: "acc-1" }) });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("default");
  });

  it("soft-deletes (disables) account with transactions", async () => {
    mockFindFirst.mockResolvedValue(mockAccount);
    mockTxCount.mockResolvedValue(5);
    mockUpdate.mockResolvedValue({ ...mockAccount, isActive: false });
    const req = createRequest("http://localhost/api/financial-accounts/acc-1", { method: "DELETE" });
    const res = await DELETE(req, { params: createParams({ id: "acc-1" }) });
    expect(res.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalled();
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it("hard-deletes account without transactions", async () => {
    mockFindFirst.mockResolvedValue(mockAccount);
    mockTxCount.mockResolvedValue(0);
    mockDelete.mockResolvedValue(mockAccount);
    const req = createRequest("http://localhost/api/financial-accounts/acc-1", { method: "DELETE" });
    const res = await DELETE(req, { params: createParams({ id: "acc-1" }) });
    expect(res.status).toBe(200);
    expect(mockDelete).toHaveBeenCalled();
  });
});

describe("PATCH /api/financial-accounts/[id]/disable", () => {
  it("returns 401 when not authenticated", async () => {
    mockGetServerSession.mockResolvedValue(null);
    const req = createRequest("http://localhost/api/financial-accounts/acc-1/disable", { method: "PATCH" });
    const res = await DISABLE(req, { params: createParams({ id: "acc-1" }) });
    expect(res.status).toBe(401);
  });

  it("returns 404 when account not found", async () => {
    mockFindFirst.mockResolvedValue(null);
    const req = createRequest("http://localhost/api/financial-accounts/acc-1/disable", { method: "PATCH" });
    const res = await DISABLE(req, { params: createParams({ id: "acc-1" }) });
    expect(res.status).toBe(404);
  });

  it("returns 400 when account is already disabled", async () => {
    mockFindFirst.mockResolvedValue({ ...mockAccount, isActive: false });
    const req = createRequest("http://localhost/api/financial-accounts/acc-1/disable", { method: "PATCH" });
    const res = await DISABLE(req, { params: createParams({ id: "acc-1" }) });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("already disabled");
  });

  it("returns 400 when trying to disable default account", async () => {
    mockFindFirst.mockResolvedValue({ ...mockAccount, isDefault: true });
    const req = createRequest("http://localhost/api/financial-accounts/acc-1/disable", { method: "PATCH" });
    const res = await DISABLE(req, { params: createParams({ id: "acc-1" }) });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("default");
  });

  it("disables the account", async () => {
    mockFindFirst.mockResolvedValue(mockAccount);
    mockUpdate.mockResolvedValue({ ...mockAccount, isActive: false });
    const req = createRequest("http://localhost/api/financial-accounts/acc-1/disable", { method: "PATCH" });
    const res = await DISABLE(req, { params: createParams({ id: "acc-1" }) });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
  });
});

describe("PATCH /api/financial-accounts/[id]/restore", () => {
  it("returns 401 when not authenticated", async () => {
    mockGetServerSession.mockResolvedValue(null);
    const req = createRequest("http://localhost/api/financial-accounts/acc-1/restore", { method: "PATCH" });
    const res = await RESTORE(req, { params: createParams({ id: "acc-1" }) });
    expect(res.status).toBe(401);
  });

  it("returns 404 when account not found", async () => {
    mockFindFirst.mockResolvedValue(null);
    const req = createRequest("http://localhost/api/financial-accounts/acc-1/restore", { method: "PATCH" });
    const res = await RESTORE(req, { params: createParams({ id: "acc-1" }) });
    expect(res.status).toBe(404);
  });

  it("returns 400 when account is already active", async () => {
    mockFindFirst.mockResolvedValue({ ...mockAccount, isActive: true });
    const req = createRequest("http://localhost/api/financial-accounts/acc-1/restore", { method: "PATCH" });
    const res = await RESTORE(req, { params: createParams({ id: "acc-1" }) });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("already active");
  });

  it("restores the account", async () => {
    mockFindFirst.mockResolvedValue({ ...mockAccount, isActive: false });
    mockUpdate.mockResolvedValue({ ...mockAccount, isActive: true });
    const req = createRequest("http://localhost/api/financial-accounts/acc-1/restore", { method: "PATCH" });
    const res = await RESTORE(req, { params: createParams({ id: "acc-1" }) });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
  });
});
