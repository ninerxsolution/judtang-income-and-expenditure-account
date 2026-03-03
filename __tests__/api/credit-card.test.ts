/**
 * @jest-environment node
 */
const mockGetServerSession = jest.fn();
const mockFindFirst = jest.fn();

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
  },
}));

jest.mock("@/lib/credit-card", () => ({
  recordPayment: jest.fn().mockResolvedValue({
    id: "tx-1",
    type: "PAYMENT",
    amount: 1000,
    occurredAt: new Date(),
    createdAt: new Date(),
  }),
  closeStatement: jest.fn().mockResolvedValue({ id: "stmt-1" }),
  getCurrentOutstanding: jest.fn().mockResolvedValue(5000),
  getAvailableCredit: jest.fn().mockResolvedValue(45000),
  getLatestStatement: jest.fn().mockResolvedValue(null),
}));

jest.mock("@/lib/cache", () => ({
  revalidateTag: jest.fn(),
}));

import { GET as creditCardGET } from "@/app/api/credit-card/[id]/route";
import { POST as paymentPOST } from "@/app/api/credit-card/[id]/payment/route";
import { POST as applyInterestPOST } from "@/app/api/credit-card/[id]/apply-interest/route";
import { POST as closeStatementPOST } from "@/app/api/credit-card/[id]/close-statement/route";
import { createRequest, createMockSession, createParams } from "../helpers/api-helper";

beforeEach(() => {
  jest.clearAllMocks();
  mockFindFirst.mockResolvedValue({
    id: "cc-1",
    userId: "test-user-id",
    type: "CREDIT_CARD",
    name: "บัตรกสิกร",
    creditLimit: 50000,
    statementClosingDay: 28,
    dueDay: 15,
  });
});

describe("GET /api/credit-card/[id]", () => {
  it("returns 401 when not authenticated", async () => {
    mockGetServerSession.mockResolvedValue(null);

    const res = await creditCardGET(new Request("http://localhost"), {
      params: createParams({ id: "cc-1" }),
    });
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data).toEqual({ error: "Unauthorized" });
  });

  it("returns 404 when account not found", async () => {
    mockGetServerSession.mockResolvedValue(createMockSession());
    mockFindFirst.mockResolvedValue(null);

    const res = await creditCardGET(new Request("http://localhost"), {
      params: createParams({ id: "nonexistent" }),
    });
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data).toEqual({ error: "Not found" });
  });

  it("returns 404 when account is not CREDIT_CARD", async () => {
    mockGetServerSession.mockResolvedValue(createMockSession());
    mockFindFirst.mockResolvedValue({
      id: "acc-1",
      userId: "test-user-id",
      type: "BANK",
      name: "บัญชีธนาคาร",
    });

    const res = await creditCardGET(new Request("http://localhost"), {
      params: createParams({ id: "acc-1" }),
    });
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data).toEqual({ error: "Not found" });
  });

  it("returns 200 with credit card details when found", async () => {
    mockGetServerSession.mockResolvedValue(createMockSession());

    const res = await creditCardGET(new Request("http://localhost"), {
      params: createParams({ id: "cc-1" }),
    });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.id).toBe("cc-1");
    expect(data.name).toBe("บัตรกสิกร");
    expect(data).toHaveProperty("creditLimit");
    expect(data).toHaveProperty("currentOutstanding");
    expect(data).toHaveProperty("availableCredit");
  });
});

describe("POST /api/credit-card/[id]/payment", () => {
  it("returns 401 when not authenticated", async () => {
    mockGetServerSession.mockResolvedValue(null);

    const req = createRequest("http://localhost/api/credit-card/cc-1/payment", {
      method: "POST",
      body: { amount: 1000 },
    });
    const res = await paymentPOST(req, { params: createParams({ id: "cc-1" }) });
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data).toEqual({ error: "Unauthorized" });
  });

  it("returns 404 when account not found", async () => {
    mockGetServerSession.mockResolvedValue(createMockSession());
    mockFindFirst.mockResolvedValue(null);

    const req = createRequest("http://localhost/api/credit-card/nonexistent/payment", {
      method: "POST",
      body: { amount: 1000 },
    });
    const res = await paymentPOST(req, {
      params: createParams({ id: "nonexistent" }),
    });
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data).toEqual({ error: "Not found" });
  });

  it("returns 400 when amount is invalid", async () => {
    mockGetServerSession.mockResolvedValue(createMockSession());

    const req = createRequest("http://localhost/api/credit-card/cc-1/payment", {
      method: "POST",
      body: { amount: -100 },
    });
    const res = await paymentPOST(req, { params: createParams({ id: "cc-1" }) });
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain("amount");
  });

  it("returns 200 and creates payment", async () => {
    mockGetServerSession.mockResolvedValue(createMockSession());

    const req = createRequest("http://localhost/api/credit-card/cc-1/payment", {
      method: "POST",
      body: { amount: 1000 },
    });
    const res = await paymentPOST(req, { params: createParams({ id: "cc-1" }) });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toHaveProperty("id");
    expect(data.type).toBe("PAYMENT");
    expect(data.amount).toBe(1000);
  });
});

describe("POST /api/credit-card/[id]/apply-interest", () => {
  it("returns 401 when not authenticated", async () => {
    mockGetServerSession.mockResolvedValue(null);

    const req = new Request("http://localhost/api/credit-card/cc-1/apply-interest", {
      method: "POST",
    });
    const res = await applyInterestPOST(req, {
      params: createParams({ id: "cc-1" }),
    });
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data).toEqual({ error: "Unauthorized" });
  });

  it("returns 501 not implemented", async () => {
    mockGetServerSession.mockResolvedValue(createMockSession());

    const req = new Request("http://localhost/api/credit-card/cc-1/apply-interest", {
      method: "POST",
    });
    const res = await applyInterestPOST(req, {
      params: createParams({ id: "cc-1" }),
    });
    const data = await res.json();

    expect(res.status).toBe(501);
    expect(data.error).toContain("not yet implemented");
  });
});

describe("POST /api/credit-card/[id]/close-statement", () => {
  it("returns 401 when not authenticated", async () => {
    mockGetServerSession.mockResolvedValue(null);

    const req = createRequest("http://localhost/api/credit-card/cc-1/close-statement", {
      method: "POST",
      body: {},
    });
    const res = await closeStatementPOST(req, {
      params: createParams({ id: "cc-1" }),
    });
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data).toEqual({ error: "Unauthorized" });
  });

  it("returns 200 and closes statement", async () => {
    mockGetServerSession.mockResolvedValue(createMockSession());

    const req = createRequest("http://localhost/api/credit-card/cc-1/close-statement", {
      method: "POST",
      body: { closingDate: "2025-02-28" },
    });
    const res = await closeStatementPOST(req, {
      params: createParams({ id: "cc-1" }),
    });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toHaveProperty("id");
  });
});
