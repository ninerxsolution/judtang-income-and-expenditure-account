/**
 * @jest-environment node
 */
const mockGetServerSession = jest.fn();
const mockUpsert = jest.fn();
const mockBudgetMonthFindFirst = jest.fn();
const mockBudgetCategoryFindFirst = jest.fn();
const mockBudgetCategoryFindUnique = jest.fn();
const mockBudgetCategoryCreate = jest.fn();
const mockBudgetCategoryUpdate = jest.fn();
const mockBudgetCategoryDelete = jest.fn();
const mockApplyTemplateToMonth = jest.fn();
const mockCreateActivityLog = jest.fn();

jest.mock("next-auth", () => ({
  getServerSession: (...args: unknown[]) => mockGetServerSession(...args),
}));

jest.mock("@/auth", () => ({ authOptions: {} }));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    budgetMonth: {
      upsert: (...args: unknown[]) => mockUpsert(...args),
      findFirst: (...args: unknown[]) => mockBudgetMonthFindFirst(...args),
    },
    budgetCategory: {
      findFirst: (...args: unknown[]) => mockBudgetCategoryFindFirst(...args),
      findUnique: (...args: unknown[]) => mockBudgetCategoryFindUnique(...args),
      create: (...args: unknown[]) => mockBudgetCategoryCreate(...args),
      update: (...args: unknown[]) => mockBudgetCategoryUpdate(...args),
      delete: (...args: unknown[]) => mockBudgetCategoryDelete(...args),
    },
  },
}));

jest.mock("@/lib/budget", () => ({
  applyTemplateToMonth: (...args: unknown[]) => mockApplyTemplateToMonth(...args),
}));

jest.mock("@/lib/activity-log", () => ({
  createActivityLog: (...args: unknown[]) => mockCreateActivityLog(...args),
}));

jest.mock("@/lib/cache", () => ({
  revalidateTag: jest.fn(),
}));

jest.mock("@prisma/client", () => ({
  Prisma: {
    Decimal: class Decimal {
      value: number;
      constructor(v: number) { this.value = v; }
    },
  },
}));

import { PATCH as BUDGET_MONTH_PATCH } from "@/app/api/budgets/month/route";
import { POST as APPLY_TEMPLATE } from "@/app/api/budgets/apply-template/route";
import { POST as BUDGET_CAT_POST } from "@/app/api/budgets/categories/route";
import { PATCH as BUDGET_CAT_PATCH, DELETE as BUDGET_CAT_DELETE } from "@/app/api/budgets/categories/[id]/route";
import { createRequest, createMockSession, createParams, TEST_USER_ID } from "../helpers/api-helper";

beforeEach(() => {
  jest.clearAllMocks();
  mockGetServerSession.mockResolvedValue(createMockSession());
  mockCreateActivityLog.mockResolvedValue(undefined);
});

describe("PATCH /api/budgets/month", () => {
  it("returns 401 when not authenticated", async () => {
    mockGetServerSession.mockResolvedValue(null);
    const req = createRequest("http://localhost/api/budgets/month", {
      method: "PATCH",
      body: { year: 2025, month: 6, totalBudget: 50000 },
    });
    const res = await BUDGET_MONTH_PATCH(req);
    expect(res.status).toBe(401);
  });

  it("returns 400 on invalid JSON", async () => {
    const req = new Request("http://localhost/api/budgets/month", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: "bad",
    });
    const res = await BUDGET_MONTH_PATCH(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 when month is invalid", async () => {
    const req = createRequest("http://localhost/api/budgets/month", {
      method: "PATCH",
      body: { year: 2025, month: 13, totalBudget: 50000 },
    });
    const res = await BUDGET_MONTH_PATCH(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 when year is missing", async () => {
    const req = createRequest("http://localhost/api/budgets/month", {
      method: "PATCH",
      body: { month: 6, totalBudget: 50000 },
    });
    const res = await BUDGET_MONTH_PATCH(req);
    expect(res.status).toBe(400);
  });

  it("upserts budget month successfully", async () => {
    const now = new Date();
    mockUpsert.mockResolvedValue({
      id: "bm-1",
      year: 2025,
      month: 6,
      totalBudget: 50000,
      createdAt: now,
      updatedAt: now,
    });
    const req = createRequest("http://localhost/api/budgets/month", {
      method: "PATCH",
      body: { year: 2025, month: 6, totalBudget: 50000 },
    });
    const res = await BUDGET_MONTH_PATCH(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.year).toBe(2025);
    expect(data.month).toBe(6);
  });

  it("allows null totalBudget", async () => {
    const now = new Date();
    mockUpsert.mockResolvedValue({
      id: "bm-1",
      year: 2025,
      month: 6,
      totalBudget: null,
      createdAt: now,
      updatedAt: now,
    });
    const req = createRequest("http://localhost/api/budgets/month", {
      method: "PATCH",
      body: { year: 2025, month: 6 },
    });
    const res = await BUDGET_MONTH_PATCH(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.totalBudget).toBeNull();
  });
});

describe("POST /api/budgets/apply-template", () => {
  it("returns 401 when not authenticated", async () => {
    mockGetServerSession.mockResolvedValue(null);
    const req = createRequest("http://localhost/api/budgets/apply-template", {
      method: "POST",
      body: { templateId: "tpl-1", year: 2025, month: 6 },
    });
    const res = await APPLY_TEMPLATE(req);
    expect(res.status).toBe(401);
  });

  it("returns 400 when templateId is missing", async () => {
    const req = createRequest("http://localhost/api/budgets/apply-template", {
      method: "POST",
      body: { year: 2025, month: 6 },
    });
    const res = await APPLY_TEMPLATE(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 when month is invalid", async () => {
    const req = createRequest("http://localhost/api/budgets/apply-template", {
      method: "POST",
      body: { templateId: "tpl-1", year: 2025, month: 0 },
    });
    const res = await APPLY_TEMPLATE(req);
    expect(res.status).toBe(400);
  });

  it("applies template successfully", async () => {
    const mockResult = { budgetMonthId: "bm-1", appliedCategoryCount: 5 };
    mockApplyTemplateToMonth.mockResolvedValue(mockResult);
    const req = createRequest("http://localhost/api/budgets/apply-template", {
      method: "POST",
      body: { templateId: "tpl-1", year: 2025, month: 6 },
    });
    const res = await APPLY_TEMPLATE(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.appliedCategoryCount).toBe(5);
    expect(mockApplyTemplateToMonth).toHaveBeenCalledWith(TEST_USER_ID, "tpl-1", 2025, 6);
  });

  it("returns 400 when lib throws", async () => {
    mockApplyTemplateToMonth.mockRejectedValue(new Error("Template not found"));
    const req = createRequest("http://localhost/api/budgets/apply-template", {
      method: "POST",
      body: { templateId: "tpl-1", year: 2025, month: 6 },
    });
    const res = await APPLY_TEMPLATE(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Template not found");
  });
});

describe("POST /api/budgets/categories", () => {
  it("returns 401 when not authenticated", async () => {
    mockGetServerSession.mockResolvedValue(null);
    const req = createRequest("http://localhost/api/budgets/categories", {
      method: "POST",
      body: { budgetMonthId: "bm-1", categoryId: "cat-1", limitAmount: 5000 },
    });
    const res = await BUDGET_CAT_POST(req);
    expect(res.status).toBe(401);
  });

  it("returns 400 when budgetMonthId is missing", async () => {
    const req = createRequest("http://localhost/api/budgets/categories", {
      method: "POST",
      body: { categoryId: "cat-1", limitAmount: 5000 },
    });
    const res = await BUDGET_CAT_POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 when limitAmount is not positive", async () => {
    const req = createRequest("http://localhost/api/budgets/categories", {
      method: "POST",
      body: { budgetMonthId: "bm-1", categoryId: "cat-1", limitAmount: -100 },
    });
    const res = await BUDGET_CAT_POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 404 when budget month not found", async () => {
    mockBudgetMonthFindFirst.mockResolvedValue(null);
    const req = createRequest("http://localhost/api/budgets/categories", {
      method: "POST",
      body: { budgetMonthId: "bm-999", categoryId: "cat-1", limitAmount: 5000 },
    });
    const res = await BUDGET_CAT_POST(req);
    expect(res.status).toBe(404);
  });

  it("creates a new budget category when none exists", async () => {
    const now = new Date();
    mockBudgetMonthFindFirst.mockResolvedValue({ id: "bm-1", userId: TEST_USER_ID });
    mockBudgetCategoryFindFirst.mockResolvedValue(null);
    mockBudgetCategoryCreate.mockResolvedValue({
      id: "bc-1",
      budgetMonthId: "bm-1",
      categoryId: "cat-1",
      limitAmount: 5000,
      category: { id: "cat-1", name: "Food" },
      createdAt: now,
    });
    const req = createRequest("http://localhost/api/budgets/categories", {
      method: "POST",
      body: { budgetMonthId: "bm-1", categoryId: "cat-1", limitAmount: 5000 },
    });
    const res = await BUDGET_CAT_POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.categoryName).toBe("Food");
    expect(mockBudgetCategoryCreate).toHaveBeenCalled();
  });

  it("updates existing budget category", async () => {
    const now = new Date();
    mockBudgetMonthFindFirst.mockResolvedValue({ id: "bm-1", userId: TEST_USER_ID });
    mockBudgetCategoryFindFirst.mockResolvedValue({
      id: "bc-1",
      budgetMonthId: "bm-1",
      categoryId: "cat-1",
      limitAmount: 3000,
    });
    mockBudgetCategoryUpdate.mockResolvedValue({
      id: "bc-1",
      budgetMonthId: "bm-1",
      categoryId: "cat-1",
      limitAmount: 5000,
      category: { id: "cat-1", name: "Food" },
      createdAt: now,
    });
    const req = createRequest("http://localhost/api/budgets/categories", {
      method: "POST",
      body: { budgetMonthId: "bm-1", categoryId: "cat-1", limitAmount: 5000 },
    });
    const res = await BUDGET_CAT_POST(req);
    expect(res.status).toBe(200);
    expect(mockBudgetCategoryUpdate).toHaveBeenCalled();
  });
});

describe("PATCH /api/budgets/categories/[id]", () => {
  it("returns 401 when not authenticated", async () => {
    mockGetServerSession.mockResolvedValue(null);
    const req = createRequest("http://localhost/api/budgets/categories/bc-1", {
      method: "PATCH",
      body: { limitAmount: 8000 },
    });
    const res = await BUDGET_CAT_PATCH(req, { params: createParams({ id: "bc-1" }) });
    expect(res.status).toBe(401);
  });

  it("returns 404 when budget category not found", async () => {
    mockBudgetCategoryFindUnique.mockResolvedValue(null);
    const req = createRequest("http://localhost/api/budgets/categories/bc-999", {
      method: "PATCH",
      body: { limitAmount: 8000 },
    });
    const res = await BUDGET_CAT_PATCH(req, { params: createParams({ id: "bc-999" }) });
    expect(res.status).toBe(404);
  });

  it("returns 404 when budget belongs to different user", async () => {
    mockBudgetCategoryFindUnique.mockResolvedValue({
      id: "bc-1",
      budgetMonth: { userId: "other-user" },
    });
    const req = createRequest("http://localhost/api/budgets/categories/bc-1", {
      method: "PATCH",
      body: { limitAmount: 8000 },
    });
    const res = await BUDGET_CAT_PATCH(req, { params: createParams({ id: "bc-1" }) });
    expect(res.status).toBe(404);
  });

  it("returns 400 when limitAmount is invalid", async () => {
    mockBudgetCategoryFindUnique.mockResolvedValue({
      id: "bc-1",
      budgetMonth: { userId: TEST_USER_ID },
    });
    const req = createRequest("http://localhost/api/budgets/categories/bc-1", {
      method: "PATCH",
      body: { limitAmount: 0 },
    });
    const res = await BUDGET_CAT_PATCH(req, { params: createParams({ id: "bc-1" }) });
    expect(res.status).toBe(400);
  });

  it("updates the budget category", async () => {
    const now = new Date();
    mockBudgetCategoryFindUnique.mockResolvedValue({
      id: "bc-1",
      budgetMonth: { userId: TEST_USER_ID },
    });
    mockBudgetCategoryUpdate.mockResolvedValue({
      id: "bc-1",
      budgetMonthId: "bm-1",
      categoryId: "cat-1",
      limitAmount: 8000,
      category: { id: "cat-1", name: "Food" },
      createdAt: now,
    });
    const req = createRequest("http://localhost/api/budgets/categories/bc-1", {
      method: "PATCH",
      body: { limitAmount: 8000 },
    });
    const res = await BUDGET_CAT_PATCH(req, { params: createParams({ id: "bc-1" }) });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.limitAmount).toBe(8000);
  });
});

describe("DELETE /api/budgets/categories/[id]", () => {
  it("returns 401 when not authenticated", async () => {
    mockGetServerSession.mockResolvedValue(null);
    const req = createRequest("http://localhost/api/budgets/categories/bc-1", { method: "DELETE" });
    const res = await BUDGET_CAT_DELETE(req, { params: createParams({ id: "bc-1" }) });
    expect(res.status).toBe(401);
  });

  it("returns 404 when not found", async () => {
    mockBudgetCategoryFindUnique.mockResolvedValue(null);
    const req = createRequest("http://localhost/api/budgets/categories/bc-999", { method: "DELETE" });
    const res = await BUDGET_CAT_DELETE(req, { params: createParams({ id: "bc-999" }) });
    expect(res.status).toBe(404);
  });

  it("deletes the budget category", async () => {
    mockBudgetCategoryFindUnique.mockResolvedValue({
      id: "bc-1",
      budgetMonthId: "bm-1",
      categoryId: "cat-1",
      budgetMonth: { userId: TEST_USER_ID },
    });
    mockBudgetCategoryDelete.mockResolvedValue(undefined);
    const req = createRequest("http://localhost/api/budgets/categories/bc-1", { method: "DELETE" });
    const res = await BUDGET_CAT_DELETE(req, { params: createParams({ id: "bc-1" }) });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
  });
});
