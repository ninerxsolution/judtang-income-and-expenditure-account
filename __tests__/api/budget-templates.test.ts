/**
 * @jest-environment node
 */
const mockGetServerSession = jest.fn();
const mockPrisma = {
  budgetTemplate: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

jest.mock("next-auth", () => ({
  getServerSession: (...args: unknown[]) => mockGetServerSession(...args),
}));

jest.mock("@/auth", () => ({
  authOptions: {},
}));

jest.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

jest.mock("@/lib/activity-log", () => ({
  createActivityLog: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("@/lib/cache", () => ({
  revalidateTag: jest.fn(),
}));

import { GET, POST } from "@/app/api/budget-templates/route";
import { createMockSession, createRequest } from "../helpers/api-helper";

beforeEach(() => {
  jest.clearAllMocks();
  mockPrisma.budgetTemplate.findMany.mockResolvedValue([]);
  mockPrisma.budgetTemplate.findFirst.mockResolvedValue(null);
  mockPrisma.budgetTemplate.create.mockImplementation((args: { data: { name: string } }) =>
    Promise.resolve({
      id: "tpl-1",
      name: args?.data?.name ?? "Default",
      isActive: true,
      totalBudget: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      categoryLimits: [],
    })
  );
});

describe("GET /api/budget-templates", () => {
  it("returns 401 when not authenticated", async () => {
    mockGetServerSession.mockResolvedValue(null);

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data).toEqual({ error: "Unauthorized" });
  });

  it("returns templates list when authenticated", async () => {
    mockGetServerSession.mockResolvedValue(createMockSession());
    mockPrisma.budgetTemplate.findMany.mockResolvedValue([
      {
        id: "tpl-1",
        name: "Default",
        isActive: true,
        totalBudget: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        categoryLimits: [],
      },
    ]);

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
    expect(data[0].name).toBe("Default");
  });
});

describe("POST /api/budget-templates", () => {
  it("returns 401 when not authenticated", async () => {
    mockGetServerSession.mockResolvedValue(null);

    const res = await POST(
      createRequest("http://localhost/api/budget-templates", {
        method: "POST",
        body: { name: "My Template" },
      })
    );
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data).toEqual({ error: "Unauthorized" });
  });

  it("returns 400 when name is missing", async () => {
    mockGetServerSession.mockResolvedValue(createMockSession());

    const res = await POST(
      createRequest("http://localhost/api/budget-templates", {
        method: "POST",
        body: {},
      })
    );
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain("name");
  });

  it("creates template when authenticated with valid name", async () => {
    mockGetServerSession.mockResolvedValue(createMockSession());

    const res = await POST(
      createRequest("http://localhost/api/budget-templates", {
        method: "POST",
        body: { name: "My Template" },
      })
    );
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.name).toBe("My Template");
    expect(mockPrisma.budgetTemplate.create).toHaveBeenCalled();
  });
});
