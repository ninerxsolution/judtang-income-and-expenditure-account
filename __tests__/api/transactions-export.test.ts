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

jest.mock("@/lib/statement-pdf-data", () => ({
  buildStatementPdfData: jest.fn(),
}));

jest.mock("@/lib/statement-pdf", () => ({
  renderStatementPdf: jest.fn().mockResolvedValue(Buffer.from("")),
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

  it("returns 200 with PDF when format=pdf", async () => {
    const { buildStatementPdfData } = await import("@/lib/statement-pdf-data");
    const { renderStatementPdf } = await import("@/lib/statement-pdf");
    (buildStatementPdfData as jest.Mock).mockResolvedValue({
      user: { name: "Test", email: "test@example.com" },
      transactions: [],
      totalCredits: 0,
      totalDebits: 0,
      openingBalance: null,
      closingBalance: null,
      fromDate: null,
      toDate: null,
      generatedAt: new Date(),
      locale: "th",
    });
    (renderStatementPdf as jest.Mock).mockResolvedValue(Buffer.from("%PDF-1.4 mock"));

    mockGetServerSession.mockResolvedValue(createMockSession());
    const req = new Request("http://localhost/api/transactions/export?format=pdf");
    const res = await GET(req);
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("application/pdf");
    expect(res.headers.get("Content-Disposition")).toContain("statement-");
    expect(res.headers.get("Content-Disposition")).toContain(".pdf");
  });
});
