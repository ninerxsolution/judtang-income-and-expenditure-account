/**
 * @jest-environment node
 */
const mockGetServerSession = jest.fn();
const mockAccountFindFirst = jest.fn();
const mockTxFindMany = jest.fn();

jest.mock("next-auth", () => ({
  getServerSession: (...args: unknown[]) => mockGetServerSession(...args),
}));
jest.mock("@/auth", () => ({ authOptions: {} }));
jest.mock("@/lib/prisma", () => ({
  prisma: {
    financialAccount: {
      findFirst: (...args: unknown[]) => mockAccountFindFirst(...args),
    },
    transaction: {
      findMany: (...args: unknown[]) => mockTxFindMany(...args),
    },
  },
}));
jest.mock("@prisma/client", () => ({
  TransactionType: { EXPENSE: "EXPENSE", INTEREST: "INTEREST" },
  TransactionStatus: { POSTED: "POSTED" },
}));

import { POST } from "@/app/api/credit-card/[id]/import-statement/route";
import {
  createRequest,
  createMockSession,
  createParams,
} from "../helpers/api-helper";

beforeEach(() => {
  jest.clearAllMocks();
  mockGetServerSession.mockResolvedValue(createMockSession());
});

describe("POST /api/credit-card/[id]/import-statement", () => {
  it("returns 401 when not authenticated", async () => {
    mockGetServerSession.mockResolvedValue(null);
    const req = createRequest(
      "http://localhost/api/credit-card/cc-1/import-statement",
      {
        method: "POST",
        body: { csv: "date,amount\n2025-01-01,100" },
      }
    );
    const res = await POST(req, { params: createParams({ id: "cc-1" }) });
    expect(res.status).toBe(401);
  });

  it("returns 404 when account not found", async () => {
    mockAccountFindFirst.mockResolvedValue(null);
    const req = createRequest(
      "http://localhost/api/credit-card/cc-1/import-statement",
      {
        method: "POST",
        body: { csv: "date,amount\n2025-01-01,100" },
      }
    );
    const res = await POST(req, { params: createParams({ id: "cc-1" }) });
    expect(res.status).toBe(404);
  });

  it("returns 404 when account is not CREDIT_CARD", async () => {
    mockAccountFindFirst.mockResolvedValue({ type: "BANK" });
    const req = createRequest(
      "http://localhost/api/credit-card/cc-1/import-statement",
      {
        method: "POST",
        body: { csv: "date,amount\n2025-01-01,100" },
      }
    );
    const res = await POST(req, { params: createParams({ id: "cc-1" }) });
    expect(res.status).toBe(404);
  });

  it("returns 400 when csv is empty", async () => {
    mockAccountFindFirst.mockResolvedValue({ type: "CREDIT_CARD" });
    const req = createRequest(
      "http://localhost/api/credit-card/cc-1/import-statement",
      {
        method: "POST",
        body: { csv: "" },
      }
    );
    const res = await POST(req, { params: createParams({ id: "cc-1" }) });
    expect(res.status).toBe(400);
  });

  it("parses CSV and returns match results", async () => {
    mockAccountFindFirst.mockResolvedValue({ type: "CREDIT_CARD" });
    mockTxFindMany.mockResolvedValue([
      {
        id: "tx-1",
        amount: 100,
        occurredAt: new Date("2025-01-01"),
        note: null,
      },
    ]);
    const csv =
      "date,amount,description\n2025-01-01,100,Coffee\n2025-02-15,500,Unknown";
    const req = createRequest(
      "http://localhost/api/credit-card/cc-1/import-statement",
      {
        method: "POST",
        body: { csv },
      }
    );
    const res = await POST(req, { params: createParams({ id: "cc-1" }) });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.summary).toBeDefined();
    expect(data.summary.totalRows).toBe(2);
  });

  it("returns 400 on invalid JSON", async () => {
    mockAccountFindFirst.mockResolvedValue({ type: "CREDIT_CARD" });
    const req = new Request(
      "http://localhost/api/credit-card/cc-1/import-statement",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "invalid",
      }
    );
    const res = await POST(req, { params: createParams({ id: "cc-1" }) });
    expect(res.status).toBe(400);
  });
});
