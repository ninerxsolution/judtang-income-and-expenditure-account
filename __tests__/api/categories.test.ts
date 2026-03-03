/**
 * @jest-environment node
 */
const mockGetServerSession = jest.fn();

jest.mock("next-auth", () => ({
  getServerSession: (...args: unknown[]) => mockGetServerSession(...args),
}));

jest.mock("@/auth", () => ({
  authOptions: {},
}));

jest.mock("@/lib/categories", () => ({
  listCategoriesByUser: jest.fn().mockResolvedValue([
    {
      id: "cat-1",
      name: "อาหาร",
      createdAt: new Date(),
      isDefault: true,
    },
  ]),
  createCategory: jest.fn().mockResolvedValue({
    id: "cat-new",
    name: "New Category",
    createdAt: new Date(),
    isDefault: false,
  }),
  ensureUserHasDefaultCategories: jest.fn().mockResolvedValue(undefined),
  getCategoryById: jest.fn().mockResolvedValue(null),
  updateCategory: jest.fn().mockResolvedValue({
    id: "cat-1",
    name: "Updated",
    createdAt: new Date(),
    isDefault: false,
  }),
  deleteCategory: jest.fn().mockResolvedValue(true),
}));

jest.mock("@/lib/cache", () => ({
  unstable_cache: (fn: (...args: unknown[]) => Promise<unknown>) => fn,
  cacheKey: () => ["categories"],
  CACHE_REVALIDATE_SECONDS: 45,
  revalidateTag: jest.fn(),
}));

import { GET, POST } from "@/app/api/categories/route";
import { PATCH, DELETE } from "@/app/api/categories/[id]/route";
import { createRequest, createMockSession, createParams } from "../helpers/api-helper";

beforeEach(() => {
  jest.clearAllMocks();
});

describe("GET /api/categories", () => {
  it("returns 401 when not authenticated", async () => {
    mockGetServerSession.mockResolvedValue(null);

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data).toEqual({ error: "Unauthorized" });
  });

  it("returns categories list when authenticated", async () => {
    mockGetServerSession.mockResolvedValue(createMockSession());

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
    expect(data[0].name).toBe("อาหาร");
  });
});

describe("POST /api/categories", () => {
  it("returns 401 when not authenticated", async () => {
    mockGetServerSession.mockResolvedValue(null);

    const req = createRequest("http://localhost/api/categories", {
      method: "POST",
      body: { name: "New" },
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data).toEqual({ error: "Unauthorized" });
  });

  it("returns 400 when name is empty", async () => {
    mockGetServerSession.mockResolvedValue(createMockSession());

    const req = createRequest("http://localhost/api/categories", {
      method: "POST",
      body: { name: "" },
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain("name");
  });

  it("returns 200 and creates category", async () => {
    mockGetServerSession.mockResolvedValue(createMockSession());

    const req = createRequest("http://localhost/api/categories", {
      method: "POST",
      body: { name: "New Category" },
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toHaveProperty("id");
    expect(data.name).toBe("New Category");
  });
});

describe("PATCH /api/categories/[id]", () => {
  it("returns 401 when not authenticated", async () => {
    mockGetServerSession.mockResolvedValue(null);

    const req = createRequest("http://localhost/api/categories/cat-1", {
      method: "PATCH",
      body: { name: "Updated" },
    });
    const res = await PATCH(req, { params: createParams({ id: "cat-1" }) });
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data).toEqual({ error: "Unauthorized" });
  });

  it("returns 400 when name is empty", async () => {
    mockGetServerSession.mockResolvedValue(createMockSession());

    const req = createRequest("http://localhost/api/categories/cat-1", {
      method: "PATCH",
      body: { name: "   " },
    });
    const res = await PATCH(req, { params: createParams({ id: "cat-1" }) });
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain("name");
  });

  it("returns 200 and updates category", async () => {
    mockGetServerSession.mockResolvedValue(createMockSession());

    const req = createRequest("http://localhost/api/categories/cat-1", {
      method: "PATCH",
      body: { name: "Updated Name" },
    });
    const res = await PATCH(req, { params: createParams({ id: "cat-1" }) });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.name).toBe("Updated");
  });
});

describe("DELETE /api/categories/[id]", () => {
  it("returns 401 when not authenticated", async () => {
    mockGetServerSession.mockResolvedValue(null);

    const res = await DELETE(new Request("http://localhost"), {
      params: createParams({ id: "cat-1" }),
    });
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data).toEqual({ error: "Unauthorized" });
  });

  it("returns 200 when deleted", async () => {
    mockGetServerSession.mockResolvedValue(createMockSession());

    const res = await DELETE(new Request("http://localhost"), {
      params: createParams({ id: "cat-1" }),
    });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toEqual({ ok: true });
  });
});
