/**
 * @jest-environment node
 */
const mockGetServerSession = jest.fn();
const mockFindMany = jest.fn();
const mockFindFirst = jest.fn();
const mockCreate = jest.fn();
const mockUpdate = jest.fn();
const mockDelete = jest.fn();
const mockCount = jest.fn();
const mockTransactionFindFirst = jest.fn();

jest.mock("next-auth", () => ({
  getServerSession: (...args: unknown[]) => mockGetServerSession(...args),
}));

jest.mock("@/auth", () => ({
  authOptions: {},
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    financialAccount: {
      findMany: (...args: unknown[]) => mockFindMany(...args),
      findFirst: (...args: unknown[]) => mockFindFirst(...args),
      create: (...args: unknown[]) => mockCreate(...args),
      update: (...args: unknown[]) => mockUpdate(...args),
      delete: (...args: unknown[]) => mockDelete(...args),
    },
    transaction: {
      count: (...args: unknown[]) => mockCount(...args),
      findFirst: (...args: unknown[]) => mockTransactionFindFirst(...args),
    },
  },
}));

jest.mock("@/lib/financial-accounts", () => ({
  ensureUserHasDefaultFinancialAccount: jest.fn().mockResolvedValue({ id: "acc-1" }),
  isAccountIncomplete: jest.fn().mockReturnValue(false),
}));

jest.mock("@/lib/balance", () => ({
  getAccountBalance: jest.fn().mockResolvedValue(0),
}));

jest.mock("@/lib/credit-card", () => ({
  getCurrentOutstanding: jest.fn().mockResolvedValue(0),
  getAvailableCredit: jest.fn().mockResolvedValue(50000),
  getLatestStatement: jest.fn().mockResolvedValue(null),
}));

jest.mock("@/lib/activity-log", () => ({
  createActivityLog: jest.fn(),
  ActivityLogAction: {},
}));

jest.mock("@/lib/cache", () => ({
  unstable_cache: (fn: (...args: unknown[]) => Promise<unknown>) => fn,
  cacheKey: () => ["financial-accounts"],
  CACHE_REVALIDATE_SECONDS: 45,
  revalidateTag: jest.fn(),
}));

import { GET, POST } from "@/app/api/financial-accounts/route";
import { GET as GET_ID, PATCH, DELETE } from "@/app/api/financial-accounts/[id]/route";
import { PATCH as PATCH_DISABLE } from "@/app/api/financial-accounts/[id]/disable/route";
import { PATCH as PATCH_RESTORE } from "@/app/api/financial-accounts/[id]/restore/route";
import { createRequest, createMockSession, createParams } from "../helpers/api-helper";

beforeEach(() => {
  jest.clearAllMocks();
  mockFindMany.mockResolvedValue([]);
  mockFindFirst.mockResolvedValue(null);
  mockCount.mockResolvedValue(0);
  mockTransactionFindFirst.mockResolvedValue(null);
});

describe("GET /api/financial-accounts", () => {
  it("returns 401 when not authenticated", async () => {
    mockGetServerSession.mockResolvedValue(null);

    const req = new Request("http://localhost/api/financial-accounts");
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data).toEqual({ error: "Unauthorized" });
  });

  it("returns accounts list when authenticated", async () => {
    mockGetServerSession.mockResolvedValue(createMockSession());
    mockFindMany.mockResolvedValue([
      {
        id: "acc-1",
        name: "Main",
        type: "CASH",
        initialBalance: 0,
        isActive: true,
        isDefault: true,
        isHidden: false,
        lastCheckedAt: null,
        createdAt: new Date(),
        accountNumber: null,
        accountNumberMode: null,
        bankName: null,
      },
    ]);

    const req = new Request("http://localhost/api/financial-accounts");
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
    expect(data[0].name).toBe("Main");
  });
});

describe("POST /api/financial-accounts", () => {
  it("returns 401 when not authenticated", async () => {
    mockGetServerSession.mockResolvedValue(null);

    const req = createRequest("http://localhost/api/financial-accounts", {
      method: "POST",
      body: { name: "New", type: "CASH", initialBalance: 0 },
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data).toEqual({ error: "Unauthorized" });
  });

  it("returns 200 and creates account", async () => {
    mockGetServerSession.mockResolvedValue(createMockSession());
    mockCreate.mockResolvedValue({
      id: "acc-new",
      name: "New Account",
      type: "CASH",
      initialBalance: 0,
      createdAt: new Date(),
    });

    const req = createRequest("http://localhost/api/financial-accounts", {
      method: "POST",
      body: { name: "New Account", type: "CASH", initialBalance: 0 },
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toHaveProperty("id");
    expect(data.name).toBe("New Account");
  });
});

describe("GET /api/financial-accounts/[id]", () => {
  it("returns 401 when not authenticated", async () => {
    mockGetServerSession.mockResolvedValue(null);

    const res = await GET_ID(new Request("http://localhost"), {
      params: createParams({ id: "acc-1" }),
    });
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data).toEqual({ error: "Unauthorized" });
  });

  it("returns 404 when account not found", async () => {
    mockGetServerSession.mockResolvedValue(createMockSession());
    mockFindFirst.mockResolvedValue(null);

    const res = await GET_ID(new Request("http://localhost"), {
      params: createParams({ id: "nonexistent" }),
    });
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data).toEqual({ error: "Not found" });
  });

  it("returns account when found", async () => {
    mockGetServerSession.mockResolvedValue(createMockSession());
    mockFindFirst.mockResolvedValue({
      id: "acc-1",
      name: "Main",
      type: "CASH",
      initialBalance: 0,
      isActive: true,
      isDefault: true,
      lastCheckedAt: null,
      createdAt: new Date(),
      accountNumber: null,
      accountNumberMode: null,
      bankName: null,
    });

    const res = await GET_ID(new Request("http://localhost"), {
      params: createParams({ id: "acc-1" }),
    });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.name).toBe("Main");
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
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data).toEqual({ error: "Unauthorized" });
  });

  it("returns 404 when account not found", async () => {
    mockGetServerSession.mockResolvedValue(createMockSession());
    mockFindFirst.mockResolvedValue(null);

    const req = createRequest("http://localhost/api/financial-accounts/nonexistent", {
      method: "PATCH",
      body: { name: "Updated" },
    });
    const res = await PATCH(req, { params: createParams({ id: "nonexistent" }) });
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data).toEqual({ error: "Not found" });
  });

  it("returns 200 and updates account", async () => {
    mockGetServerSession.mockResolvedValue(createMockSession());
    const updatedAccount = {
      id: "acc-1",
      name: "Updated Name",
      type: "CASH",
      initialBalance: 0,
      isActive: true,
      isDefault: true,
      isHidden: false,
      lastCheckedAt: null,
      createdAt: new Date(),
      accountNumber: null,
      accountNumberMode: null,
      bankName: null,
      creditLimit: null,
      statementClosingDay: null,
      dueDay: null,
      interestRate: null,
      cardType: null,
    };
    mockFindFirst.mockResolvedValue({
      id: "acc-1",
      userId: "test-user-id",
      type: "CASH",
      accountNumber: null,
      accountNumberMode: null,
    });
    mockUpdate.mockResolvedValue(updatedAccount);

    const req = createRequest("http://localhost/api/financial-accounts/acc-1", {
      method: "PATCH",
      body: { name: "Updated Name" },
    });
    const res = await PATCH(req, { params: createParams({ id: "acc-1" }) });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.name).toBe("Updated Name");
  });
});

describe("DELETE /api/financial-accounts/[id]", () => {
  it("returns 401 when not authenticated", async () => {
    mockGetServerSession.mockResolvedValue(null);

    const res = await DELETE(new Request("http://localhost"), {
      params: createParams({ id: "acc-1" }),
    });
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data).toEqual({ error: "Unauthorized" });
  });

  it("returns 404 when account not found", async () => {
    mockGetServerSession.mockResolvedValue(createMockSession());
    mockFindFirst.mockResolvedValueOnce(null);

    const res = await DELETE(new Request("http://localhost"), {
      params: createParams({ id: "nonexistent" }),
    });
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data).toEqual({ error: "Not found" });
  });

  it("returns 200 when account deleted successfully", async () => {
    mockGetServerSession.mockResolvedValue(createMockSession());
    mockFindFirst.mockResolvedValue({
      id: "acc-2",
      userId: "test-user-id",
      name: "Extra",
      type: "CASH",
      isDefault: false,
    });
    mockCount.mockResolvedValue(0);
    mockDelete.mockResolvedValue({});

    const res = await DELETE(new Request("http://localhost"), {
      params: createParams({ id: "acc-2" }),
    });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toEqual({ ok: true });
  });
});

describe("PATCH /api/financial-accounts/[id]/disable", () => {
  it("returns 401 when not authenticated", async () => {
    mockGetServerSession.mockResolvedValue(null);

    const res = await PATCH_DISABLE(new Request("http://localhost"), {
      params: createParams({ id: "acc-2" }),
    });
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data).toEqual({ error: "Unauthorized" });
  });

  it("returns 404 when account not found", async () => {
    mockGetServerSession.mockResolvedValue(createMockSession());
    mockFindFirst.mockResolvedValue(null);

    const res = await PATCH_DISABLE(new Request("http://localhost"), {
      params: createParams({ id: "nonexistent" }),
    });
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data).toEqual({ error: "Not found" });
  });

  it("returns 400 when account already disabled", async () => {
    mockGetServerSession.mockResolvedValue(createMockSession());
    mockFindFirst.mockResolvedValue({
      id: "acc-2",
      userId: "test-user-id",
      name: "Extra",
      type: "CASH",
      isActive: false,
      isDefault: false,
    });

    const res = await PATCH_DISABLE(new Request("http://localhost"), {
      params: createParams({ id: "acc-2" }),
    });
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain("already disabled");
  });

  it("returns 400 when account is default", async () => {
    mockGetServerSession.mockResolvedValue(createMockSession());
    mockFindFirst.mockResolvedValue({
      id: "acc-1",
      userId: "test-user-id",
      name: "Main",
      type: "CASH",
      isActive: true,
      isDefault: true,
    });

    const res = await PATCH_DISABLE(new Request("http://localhost"), {
      params: createParams({ id: "acc-1" }),
    });
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain("default");
  });

  it("returns 200 when disabled successfully", async () => {
    mockGetServerSession.mockResolvedValue(createMockSession());
    mockFindFirst.mockResolvedValue({
      id: "acc-2",
      userId: "test-user-id",
      name: "Extra",
      type: "CASH",
      isActive: true,
      isDefault: false,
    });
    mockUpdate.mockResolvedValue({});

    const res = await PATCH_DISABLE(new Request("http://localhost"), {
      params: createParams({ id: "acc-2" }),
    });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toEqual({ ok: true });
  });
});

describe("PATCH /api/financial-accounts/[id]/restore", () => {
  it("returns 401 when not authenticated", async () => {
    mockGetServerSession.mockResolvedValue(null);

    const res = await PATCH_RESTORE(new Request("http://localhost"), {
      params: createParams({ id: "acc-2" }),
    });
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data).toEqual({ error: "Unauthorized" });
  });

  it("returns 404 when account not found", async () => {
    mockGetServerSession.mockResolvedValue(createMockSession());
    mockFindFirst.mockResolvedValue(null);

    const res = await PATCH_RESTORE(new Request("http://localhost"), {
      params: createParams({ id: "nonexistent" }),
    });
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data).toEqual({ error: "Not found" });
  });

  it("returns 400 when account already active", async () => {
    mockGetServerSession.mockResolvedValue(createMockSession());
    mockFindFirst.mockResolvedValue({
      id: "acc-2",
      userId: "test-user-id",
      name: "Extra",
      type: "CASH",
      isActive: true,
      isDefault: false,
    });

    const res = await PATCH_RESTORE(new Request("http://localhost"), {
      params: createParams({ id: "acc-2" }),
    });
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain("already active");
  });

  it("returns 200 when restored successfully", async () => {
    mockGetServerSession.mockResolvedValue(createMockSession());
    mockFindFirst.mockResolvedValue({
      id: "acc-2",
      userId: "test-user-id",
      name: "Extra",
      type: "CASH",
      isActive: false,
      isDefault: false,
    });
    mockUpdate.mockResolvedValue({});

    const res = await PATCH_RESTORE(new Request("http://localhost"), {
      params: createParams({ id: "acc-2" }),
    });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toEqual({ ok: true });
  });
});
