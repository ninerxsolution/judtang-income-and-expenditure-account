/**
 * @jest-environment node
 */
const mockGetServerSession = jest.fn();
const mockCreateRecurringTransaction = jest.fn();
const mockListRecurringTransactions = jest.fn();
const mockGetDueRecurringTransactions = jest.fn();
const mockGetRecurringTransactionById = jest.fn();
const mockUpdateRecurringTransaction = jest.fn();
const mockDeleteRecurringTransaction = jest.fn();
const mockConfirmRecurringTransaction = jest.fn();

jest.mock("next-auth", () => ({
  getServerSession: (...args: unknown[]) => mockGetServerSession(...args),
}));

jest.mock("@/auth", () => ({ authOptions: {} }));

jest.mock("@/lib/recurring-transactions", () => ({
  createRecurringTransaction: (...args: unknown[]) => mockCreateRecurringTransaction(...args),
  listRecurringTransactions: (...args: unknown[]) => mockListRecurringTransactions(...args),
  getDueRecurringTransactions: (...args: unknown[]) => mockGetDueRecurringTransactions(...args),
  getRecurringTransactionById: (...args: unknown[]) => mockGetRecurringTransactionById(...args),
  updateRecurringTransaction: (...args: unknown[]) => mockUpdateRecurringTransaction(...args),
  deleteRecurringTransaction: (...args: unknown[]) => mockDeleteRecurringTransaction(...args),
  confirmRecurringTransaction: (...args: unknown[]) => mockConfirmRecurringTransaction(...args),
}));

jest.mock("@/lib/date-range", () => ({
  parseOccurredAt: jest.fn((v: string) => new Date(v || "2025-06-15T10:00:00Z")),
}));

jest.mock("@prisma/client", () => ({
  RecurringFrequency: { WEEKLY: "WEEKLY", MONTHLY: "MONTHLY", YEARLY: "YEARLY" },
}));

import { GET, POST } from "@/app/api/recurring-transactions/route";
import {
  GET as GET_ID,
  PATCH,
  DELETE,
} from "@/app/api/recurring-transactions/[id]/route";
import { POST as CONFIRM } from "@/app/api/recurring-transactions/[id]/confirm/route";
import { createRequest, createMockSession, createParams, TEST_USER_ID } from "../helpers/api-helper";

const mockRecurring = {
  id: "rec-1",
  userId: TEST_USER_ID,
  name: "Monthly Rent",
  type: "EXPENSE",
  amount: 15000,
  frequency: "MONTHLY",
  dayOfMonth: 1,
  monthOfYear: null,
  startDate: new Date("2025-01-01"),
  endDate: null,
  isActive: true,
  categoryId: null,
  financialAccountId: "acc-1",
  note: null,
};

beforeEach(() => {
  jest.clearAllMocks();
  mockGetServerSession.mockResolvedValue(createMockSession());
});

describe("GET /api/recurring-transactions", () => {
  it("returns 401 when not authenticated", async () => {
    mockGetServerSession.mockResolvedValue(null);
    const req = createRequest("http://localhost/api/recurring-transactions");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("lists all recurring transactions", async () => {
    mockListRecurringTransactions.mockResolvedValue([mockRecurring]);
    const req = createRequest("http://localhost/api/recurring-transactions");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveLength(1);
    expect(mockListRecurringTransactions).toHaveBeenCalledWith(TEST_USER_ID);
  });

  it("returns due items when dueYear and dueMonth are provided", async () => {
    mockGetDueRecurringTransactions.mockResolvedValue([mockRecurring]);
    const req = createRequest("http://localhost/api/recurring-transactions?dueYear=2025&dueMonth=6");
    const res = await GET(req);
    expect(res.status).toBe(200);
    expect(mockGetDueRecurringTransactions).toHaveBeenCalledWith(TEST_USER_ID, 2025, 6);
  });

  it("returns 400 for invalid dueMonth", async () => {
    const req = createRequest("http://localhost/api/recurring-transactions?dueYear=2025&dueMonth=13");
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 for non-numeric dueYear", async () => {
    const req = createRequest("http://localhost/api/recurring-transactions?dueYear=abc&dueMonth=6");
    const res = await GET(req);
    expect(res.status).toBe(400);
  });
});

describe("POST /api/recurring-transactions", () => {
  const validBody = {
    name: "Monthly Rent",
    type: "EXPENSE",
    amount: 15000,
    frequency: "MONTHLY",
    startDate: "2025-01-01",
    financialAccountId: "acc-1",
  };

  it("returns 401 when not authenticated", async () => {
    mockGetServerSession.mockResolvedValue(null);
    const req = createRequest("http://localhost/api/recurring-transactions", {
      method: "POST",
      body: validBody,
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("creates a recurring transaction", async () => {
    mockCreateRecurringTransaction.mockResolvedValue(mockRecurring);
    const req = createRequest("http://localhost/api/recurring-transactions", {
      method: "POST",
      body: validBody,
    });
    const res = await POST(req);
    expect(res.status).toBe(201);
    expect(mockCreateRecurringTransaction).toHaveBeenCalled();
  });

  it("returns 400 when name is missing", async () => {
    const req = createRequest("http://localhost/api/recurring-transactions", {
      method: "POST",
      body: { ...validBody, name: "" },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("name");
  });

  it("returns 400 when type is invalid", async () => {
    const req = createRequest("http://localhost/api/recurring-transactions", {
      method: "POST",
      body: { ...validBody, type: "TRANSFER" },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 when amount is zero or negative", async () => {
    const req = createRequest("http://localhost/api/recurring-transactions", {
      method: "POST",
      body: { ...validBody, amount: 0 },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid frequency", async () => {
    const req = createRequest("http://localhost/api/recurring-transactions", {
      method: "POST",
      body: { ...validBody, frequency: "DAILY" },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 when startDate is missing", async () => {
    const req = createRequest("http://localhost/api/recurring-transactions", {
      method: "POST",
      body: { ...validBody, startDate: undefined },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 on invalid JSON", async () => {
    const req = new Request("http://localhost/api/recurring-transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Invalid JSON");
  });

  it("returns 400 when lib throws an error", async () => {
    mockCreateRecurringTransaction.mockRejectedValue(new Error("Duplicate name"));
    const req = createRequest("http://localhost/api/recurring-transactions", {
      method: "POST",
      body: validBody,
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Duplicate name");
  });
});

describe("GET /api/recurring-transactions/[id]", () => {
  it("returns 401 when not authenticated", async () => {
    mockGetServerSession.mockResolvedValue(null);
    const req = createRequest("http://localhost/api/recurring-transactions/rec-1");
    const res = await GET_ID(req, { params: createParams({ id: "rec-1" }) });
    expect(res.status).toBe(401);
  });

  it("returns the item when found", async () => {
    mockGetRecurringTransactionById.mockResolvedValue(mockRecurring);
    const req = createRequest("http://localhost/api/recurring-transactions/rec-1");
    const res = await GET_ID(req, { params: createParams({ id: "rec-1" }) });
    expect(res.status).toBe(200);
    expect(mockGetRecurringTransactionById).toHaveBeenCalledWith(TEST_USER_ID, "rec-1");
  });

  it("returns 404 when not found", async () => {
    mockGetRecurringTransactionById.mockResolvedValue(null);
    const req = createRequest("http://localhost/api/recurring-transactions/rec-999");
    const res = await GET_ID(req, { params: createParams({ id: "rec-999" }) });
    expect(res.status).toBe(404);
  });
});

describe("PATCH /api/recurring-transactions/[id]", () => {
  it("returns 401 when not authenticated", async () => {
    mockGetServerSession.mockResolvedValue(null);
    const req = createRequest("http://localhost/api/recurring-transactions/rec-1", {
      method: "PATCH",
      body: { name: "Updated" },
    });
    const res = await PATCH(req, { params: createParams({ id: "rec-1" }) });
    expect(res.status).toBe(401);
  });

  it("updates the recurring transaction", async () => {
    mockUpdateRecurringTransaction.mockResolvedValue({ ...mockRecurring, name: "Updated" });
    const req = createRequest("http://localhost/api/recurring-transactions/rec-1", {
      method: "PATCH",
      body: { name: "Updated", amount: 20000 },
    });
    const res = await PATCH(req, { params: createParams({ id: "rec-1" }) });
    expect(res.status).toBe(200);
    const args = mockUpdateRecurringTransaction.mock.calls[0];
    expect(args[0]).toBe(TEST_USER_ID);
    expect(args[1]).toBe("rec-1");
    expect(args[2]).toMatchObject({ name: "Updated", amount: 20000 });
  });

  it("returns 400 for invalid type", async () => {
    const req = createRequest("http://localhost/api/recurring-transactions/rec-1", {
      method: "PATCH",
      body: { type: "TRANSFER" },
    });
    const res = await PATCH(req, { params: createParams({ id: "rec-1" }) });
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid frequency", async () => {
    const req = createRequest("http://localhost/api/recurring-transactions/rec-1", {
      method: "PATCH",
      body: { frequency: "HOURLY" },
    });
    const res = await PATCH(req, { params: createParams({ id: "rec-1" }) });
    expect(res.status).toBe(400);
  });

  it("returns 400 on invalid JSON", async () => {
    const req = new Request("http://localhost/api/recurring-transactions/rec-1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: "invalid",
    });
    const res = await PATCH(req, { params: createParams({ id: "rec-1" }) });
    expect(res.status).toBe(400);
  });
});

describe("DELETE /api/recurring-transactions/[id]", () => {
  it("returns 401 when not authenticated", async () => {
    mockGetServerSession.mockResolvedValue(null);
    const req = createRequest("http://localhost/api/recurring-transactions/rec-1", { method: "DELETE" });
    const res = await DELETE(req, { params: createParams({ id: "rec-1" }) });
    expect(res.status).toBe(401);
  });

  it("deletes the recurring transaction", async () => {
    mockDeleteRecurringTransaction.mockResolvedValue(undefined);
    const req = createRequest("http://localhost/api/recurring-transactions/rec-1", { method: "DELETE" });
    const res = await DELETE(req, { params: createParams({ id: "rec-1" }) });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(mockDeleteRecurringTransaction).toHaveBeenCalledWith(TEST_USER_ID, "rec-1");
  });

  it("returns 400 when lib throws an error", async () => {
    mockDeleteRecurringTransaction.mockRejectedValue(new Error("Not found"));
    const req = createRequest("http://localhost/api/recurring-transactions/rec-1", { method: "DELETE" });
    const res = await DELETE(req, { params: createParams({ id: "rec-1" }) });
    expect(res.status).toBe(400);
  });
});

describe("POST /api/recurring-transactions/[id]/confirm", () => {
  const validConfirmBody = {
    amount: 15000,
    occurredAt: "2025-06-15T10:00:00Z",
    financialAccountId: "acc-1",
  };

  it("returns 401 when not authenticated", async () => {
    mockGetServerSession.mockResolvedValue(null);
    const req = createRequest("http://localhost/api/recurring-transactions/rec-1/confirm", {
      method: "POST",
      body: validConfirmBody,
    });
    const res = await CONFIRM(req, { params: createParams({ id: "rec-1" }) });
    expect(res.status).toBe(401);
  });

  it("confirms and creates a transaction", async () => {
    const mockTx = { id: "tx-1", amount: 15000, type: "EXPENSE" };
    mockConfirmRecurringTransaction.mockResolvedValue(mockTx);
    const req = createRequest("http://localhost/api/recurring-transactions/rec-1/confirm", {
      method: "POST",
      body: validConfirmBody,
    });
    const res = await CONFIRM(req, { params: createParams({ id: "rec-1" }) });
    expect(res.status).toBe(201);
    expect(mockConfirmRecurringTransaction).toHaveBeenCalledWith(
      TEST_USER_ID,
      "rec-1",
      expect.objectContaining({ amount: 15000, financialAccountId: "acc-1" }),
    );
  });

  it("returns 400 when amount is zero", async () => {
    const req = createRequest("http://localhost/api/recurring-transactions/rec-1/confirm", {
      method: "POST",
      body: { ...validConfirmBody, amount: 0 },
    });
    const res = await CONFIRM(req, { params: createParams({ id: "rec-1" }) });
    expect(res.status).toBe(400);
  });

  it("returns 400 when financialAccountId is missing", async () => {
    const req = createRequest("http://localhost/api/recurring-transactions/rec-1/confirm", {
      method: "POST",
      body: { amount: 15000, occurredAt: "2025-06-15T10:00:00Z" },
    });
    const res = await CONFIRM(req, { params: createParams({ id: "rec-1" }) });
    expect(res.status).toBe(400);
  });

  it("returns 400 when occurredAt is missing", async () => {
    const req = createRequest("http://localhost/api/recurring-transactions/rec-1/confirm", {
      method: "POST",
      body: { amount: 15000, financialAccountId: "acc-1" },
    });
    const res = await CONFIRM(req, { params: createParams({ id: "rec-1" }) });
    expect(res.status).toBe(400);
  });

  it("returns 400 on invalid JSON", async () => {
    const req = new Request("http://localhost/api/recurring-transactions/rec-1/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "bad json",
    });
    const res = await CONFIRM(req, { params: createParams({ id: "rec-1" }) });
    expect(res.status).toBe(400);
  });

  it("returns 400 when lib throws", async () => {
    mockConfirmRecurringTransaction.mockRejectedValue(new Error("Already confirmed"));
    const req = createRequest("http://localhost/api/recurring-transactions/rec-1/confirm", {
      method: "POST",
      body: validConfirmBody,
    });
    const res = await CONFIRM(req, { params: createParams({ id: "rec-1" }) });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Already confirmed");
  });
});
