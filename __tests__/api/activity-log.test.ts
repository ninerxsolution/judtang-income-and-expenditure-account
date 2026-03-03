/**
 * @jest-environment node
 */
const mockGetServerSession = jest.fn();
const mockFindMany = jest.fn();

jest.mock("next-auth", () => ({
  getServerSession: (...args: unknown[]) => mockGetServerSession(...args),
}));

jest.mock("@/auth", () => ({
  authOptions: {},
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    activityLog: {
      findMany: (...args: unknown[]) => mockFindMany(...args),
    },
  },
}));

import { GET } from "@/app/api/activity-log/route";
import { createMockSession } from "../helpers/api-helper";

beforeEach(() => {
  jest.clearAllMocks();
  mockFindMany.mockResolvedValue([]);
});

describe("GET /api/activity-log", () => {
  it("returns 401 when not authenticated", async () => {
    mockGetServerSession.mockResolvedValue(null);

    const req = new Request("http://localhost/api/activity-log");
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data).toEqual({ error: "Unauthorized" });
  });

  it("returns activity logs when authenticated", async () => {
    mockGetServerSession.mockResolvedValue(createMockSession());
    mockFindMany.mockResolvedValue([
      {
        id: "log-1",
        userId: "test-user-id",
        action: "USER_REGISTERED",
        entityType: "user",
        entityId: "user-1",
        details: null,
        createdAt: new Date(),
        user: { id: "user-1", name: "Test", email: "test@example.com" },
      },
    ]);

    const req = new Request("http://localhost/api/activity-log");
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
    expect(data[0].action).toBe("USER_REGISTERED");
  });
});
