/**
 * @jest-environment node
 */
const mockGetServerSession = jest.fn();
const mockTransactionFindMany = jest.fn();
const mockFinancialAccountFindUnique = jest.fn();

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
    },
    financialAccount: {
      findUnique: (...args: unknown[]) => mockFinancialAccountFindUnique(...args),
    },
  },
}));

jest.mock("@/lib/transactions-csv", () => ({
  serializeTransactionsToCsv: jest.fn().mockReturnValue("id,type,amount\n"),
}));

jest.mock("@/lib/activity-log", () => ({
  createActivityLog: jest.fn(),
  ActivityLogAction: { TRANSACTION_EXPORT: "TRANSACTION_EXPORT" },
}));

import { GET } from "@/app/api/transactions/export/route";
import { createMockSession } from "../helpers/api-helper";

beforeEach(() => {
  jest.clearAllMocks();
  mockGetServerSession.mockResolvedValue(null);
  mockTransactionFindMany.mockResolvedValue([]);
  mockFinancialAccountFindUnique.mockResolvedValue(null);
});

describe("GET /api/transactions/export", () => {
  it("returns 401 when not authenticated", async () => {
    mockGetServerSession.mockResolvedValue(null);
    const req = new Request("http://localhost/api/transactions/export");
    const res = await GET(req);
    const data = await res.json();
    expect(res.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns 200 with CSV when authenticated", async () => {
    mockGetServerSession.mockResolvedValue(createMockSession());
    mockTransactionFindMany.mockResolvedValue([]);
    const req = new Request("http://localhost/api/transactions/export");
    const res = await GET(req);
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("text/csv");
    expect(res.headers.get("Content-Disposition")).toContain("attachment");
    const text = await res.text();
    expect(text).toBe("id,type,amount\n");
  });
});
