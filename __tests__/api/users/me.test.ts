/**
 * @jest-environment node
 */
const mockGetServerSession = jest.fn();
const mockFindUnique = jest.fn();
const mockUpdate = jest.fn();
const mockRevalidateTag = jest.fn();

jest.mock("next-auth", () => ({
  getServerSession: (...args: unknown[]) => mockGetServerSession(...args),
}));

jest.mock("@/auth", () => ({
  authOptions: {},
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
      update: (...args: unknown[]) => mockUpdate(...args),
    },
  },
}));

jest.mock("@/lib/cache", () => ({
  unstable_cache: (fn: (uid: string) => Promise<unknown>) => fn,
  cacheKey: () => ["users-me", "test-user-id"],
  CACHE_REVALIDATE_SECONDS: 45,
  revalidateTag: (...args: unknown[]) => mockRevalidateTag(...args),
}));

jest.mock("@/lib/activity-log", () => ({
  createActivityLog: jest.fn(),
  ActivityLogAction: { USER_PROFILE_UPDATED: "USER_PROFILE_UPDATED" },
}));

import { GET, PATCH } from "@/app/api/users/me/route";
import { createRequest, createMockSession } from "../../helpers/api-helper";

beforeEach(() => {
  jest.clearAllMocks();
});

describe("GET /api/users/me", () => {
  it("returns 401 when not authenticated", async () => {
    mockGetServerSession.mockResolvedValue(null);

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data).toEqual({ error: "Unauthorized" });
  });

  it("returns 404 when user not found", async () => {
    mockGetServerSession.mockResolvedValue(createMockSession());
    mockFindUnique.mockResolvedValue(null);

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data).toEqual({ error: "User not found" });
  });

  it("returns user profile when authenticated", async () => {
    mockGetServerSession.mockResolvedValue(createMockSession());
    mockFindUnique.mockResolvedValue({
      id: "test-user-id",
      name: "Test User",
      email: "test@example.com",
      emailVerified: null,
      image: null,
      lastActiveAt: new Date(),
      password: "hashed",
      accounts: [],
    });

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.email).toBe("test@example.com");
    expect(data.name).toBe("Test User");
    expect(data.hasPassword).toBe(true);
  });
});

describe("PATCH /api/users/me", () => {
  it("returns 401 when not authenticated", async () => {
    mockGetServerSession.mockResolvedValue(null);

    const req = createRequest("http://localhost/api/users/me", {
      method: "PATCH",
      body: { name: "New Name" },
    });
    const res = await PATCH(req);
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data).toEqual({ error: "Unauthorized" });
  });

  it("returns 400 for invalid JSON", async () => {
    mockGetServerSession.mockResolvedValue(createMockSession());

    const req = new Request("http://localhost/api/users/me", {
      method: "PATCH",
      body: "invalid json",
      headers: { "Content-Type": "application/json" },
    });
    const res = await PATCH(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data).toEqual({ error: "Invalid JSON" });
  });

  it("returns 200 and updates name", async () => {
    mockGetServerSession.mockResolvedValue(createMockSession());
    mockFindUnique.mockResolvedValue({ name: "Old Name" });
    mockUpdate.mockResolvedValue({});

    const req = createRequest("http://localhost/api/users/me", {
      method: "PATCH",
      body: { name: "New Name" },
    });
    const res = await PATCH(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toEqual({ ok: true });
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: "test-user-id" },
      data: { name: "New Name" },
    });
  });
});
