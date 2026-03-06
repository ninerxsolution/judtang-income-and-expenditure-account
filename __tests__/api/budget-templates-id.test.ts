/**
 * @jest-environment node
 */
const mockGetServerSession = jest.fn();
const mockFindFirst = jest.fn();
const mockUpdate = jest.fn();
const mockDelete = jest.fn();
const mockCreateActivityLog = jest.fn();

jest.mock("next-auth", () => ({
  getServerSession: (...args: unknown[]) => mockGetServerSession(...args),
}));
jest.mock("@/auth", () => ({ authOptions: {} }));
jest.mock("@/lib/prisma", () => ({
  prisma: {
    budgetTemplate: {
      findFirst: (...args: unknown[]) => mockFindFirst(...args),
      update: (...args: unknown[]) => mockUpdate(...args),
      delete: (...args: unknown[]) => mockDelete(...args),
    },
  },
}));
jest.mock("@/lib/activity-log", () => ({
  createActivityLog: (...args: unknown[]) => mockCreateActivityLog(...args),
}));
jest.mock("@/lib/cache", () => ({ revalidateTag: jest.fn() }));
jest.mock("@prisma/client", () => ({
  Prisma: {
    Decimal: class Decimal {
      value: number;
      constructor(v: number) {
        this.value = v;
      }
    },
  },
}));

import { GET, PATCH, DELETE } from "@/app/api/budget-templates/[id]/route";
import {
  createRequest,
  createMockSession,
  createParams,
  TEST_USER_ID,
} from "../helpers/api-helper";

const now = new Date();
const mockTemplate = {
  id: "tpl-1",
  userId: TEST_USER_ID,
  name: "Monthly",
  isActive: true,
  totalBudget: 50000,
  createdAt: now,
  updatedAt: now,
  categoryLimits: [
    {
      id: "cl-1",
      categoryId: "cat-1",
      limitAmount: 10000,
      createdAt: now,
      category: { id: "cat-1", name: "Food" },
    },
  ],
};

beforeEach(() => {
  jest.clearAllMocks();
  mockGetServerSession.mockResolvedValue(createMockSession());
  mockCreateActivityLog.mockResolvedValue(undefined);
});

describe("GET /api/budget-templates/[id]", () => {
  it("returns 401 when not authenticated", async () => {
    mockGetServerSession.mockResolvedValue(null);
    const req = createRequest("http://localhost/api/budget-templates/tpl-1");
    const res = await GET(req, { params: createParams({ id: "tpl-1" }) });
    expect(res.status).toBe(401);
  });

  it("returns 404 when not found", async () => {
    mockFindFirst.mockResolvedValue(null);
    const req = createRequest("http://localhost/api/budget-templates/tpl-999");
    const res = await GET(req, { params: createParams({ id: "tpl-999" }) });
    expect(res.status).toBe(404);
  });

  it("returns template with category limits", async () => {
    mockFindFirst.mockResolvedValue(mockTemplate);
    const req = createRequest("http://localhost/api/budget-templates/tpl-1");
    const res = await GET(req, { params: createParams({ id: "tpl-1" }) });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.name).toBe("Monthly");
    expect(data.categoryLimits).toHaveLength(1);
    expect(data.categoryLimits[0].categoryName).toBe("Food");
  });
});

describe("PATCH /api/budget-templates/[id]", () => {
  it("returns 401 when not authenticated", async () => {
    mockGetServerSession.mockResolvedValue(null);
    const req = createRequest("http://localhost/api/budget-templates/tpl-1", {
      method: "PATCH",
      body: { name: "Updated" },
    });
    const res = await PATCH(req, { params: createParams({ id: "tpl-1" }) });
    expect(res.status).toBe(401);
  });

  it("returns 404 when not found", async () => {
    mockFindFirst.mockResolvedValue(null);
    const req = createRequest("http://localhost/api/budget-templates/tpl-1", {
      method: "PATCH",
      body: { name: "Updated" },
    });
    const res = await PATCH(req, { params: createParams({ id: "tpl-1" }) });
    expect(res.status).toBe(404);
  });

  it("returns 400 on invalid JSON", async () => {
    mockFindFirst.mockResolvedValue(mockTemplate);
    const req = new Request("http://localhost/api/budget-templates/tpl-1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: "bad",
    });
    const res = await PATCH(req, { params: createParams({ id: "tpl-1" }) });
    expect(res.status).toBe(400);
  });

  it("updates template name", async () => {
    mockFindFirst.mockResolvedValue(mockTemplate);
    mockUpdate.mockResolvedValue({ ...mockTemplate, name: "Updated" });
    const req = createRequest("http://localhost/api/budget-templates/tpl-1", {
      method: "PATCH",
      body: { name: "Updated" },
    });
    const res = await PATCH(req, { params: createParams({ id: "tpl-1" }) });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.name).toBe("Updated");
  });
});

describe("DELETE /api/budget-templates/[id]", () => {
  it("returns 401 when not authenticated", async () => {
    mockGetServerSession.mockResolvedValue(null);
    const req = createRequest("http://localhost/api/budget-templates/tpl-1", {
      method: "DELETE",
    });
    const res = await DELETE(req, { params: createParams({ id: "tpl-1" }) });
    expect(res.status).toBe(401);
  });

  it("returns 404 when not found", async () => {
    mockFindFirst.mockResolvedValue(null);
    const req = createRequest("http://localhost/api/budget-templates/tpl-1", {
      method: "DELETE",
    });
    const res = await DELETE(req, { params: createParams({ id: "tpl-1" }) });
    expect(res.status).toBe(404);
  });

  it("deletes template", async () => {
    mockFindFirst.mockResolvedValue(mockTemplate);
    mockDelete.mockResolvedValue(mockTemplate);
    const req = createRequest("http://localhost/api/budget-templates/tpl-1", {
      method: "DELETE",
    });
    const res = await DELETE(req, { params: createParams({ id: "tpl-1" }) });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
  });
});
