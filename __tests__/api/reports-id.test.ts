/**
 * @jest-environment node
 */
const mockGetServerSession = jest.fn();
const mockFindUnique = jest.fn();
const mockReportUpdate = jest.fn();

jest.mock("next-auth", () => ({
  getServerSession: (...args: unknown[]) => mockGetServerSession(...args),
}));
jest.mock("@/auth", () => ({ authOptions: {} }));
jest.mock("@/lib/prisma", () => ({
  prisma: {
    report: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
      update: (...args: unknown[]) => mockReportUpdate(...args),
    },
  },
}));

import { GET, PATCH } from "@/app/api/reports/[id]/route";
import { createRequest, createParams } from "../helpers/api-helper";

function createAdminSession() {
  return { user: { id: "admin-1", role: "ADMIN" }, sessionId: "sess-1" };
}

beforeEach(() => jest.clearAllMocks());

describe("GET /api/reports/[id]", () => {
  it("returns 403 when not admin", async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: "u1", role: "USER" },
    });
    const req = createRequest("http://localhost/api/reports/r1");
    const res = await GET(req, { params: createParams({ id: "r1" }) });
    expect(res.status).toBe(403);
  });

  it("returns 404 when not found", async () => {
    mockGetServerSession.mockResolvedValue(createAdminSession());
    mockFindUnique.mockResolvedValue(null);
    const req = createRequest("http://localhost/api/reports/r1");
    const res = await GET(req, { params: createParams({ id: "r1" }) });
    expect(res.status).toBe(404);
  });

  it("returns report with parsed imagePaths", async () => {
    mockGetServerSession.mockResolvedValue(createAdminSession());
    const now = new Date();
    mockFindUnique.mockResolvedValue({
      id: "r1",
      category: "BUG",
      title: "Test",
      description: "desc",
      route: "/",
      appVersion: "1.0",
      browserInfo: "Chrome",
      ipAddress: "127.0.0.1",
      status: "OPEN",
      imagePaths: '["report/image/test.jpg"]',
      createdAt: now,
      updatedAt: now,
      user: { email: "user@example.com", name: "User" },
    });
    const req = createRequest("http://localhost/api/reports/r1");
    const res = await GET(req, { params: createParams({ id: "r1" }) });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.imagePaths).toEqual(["report/image/test.jpg"]);
  });
});

describe("PATCH /api/reports/[id]", () => {
  it("returns 403 when not admin", async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: "u1", role: "USER" },
    });
    const req = createRequest("http://localhost/api/reports/r1", {
      method: "PATCH",
      body: { status: "RESOLVED" },
    });
    const res = await PATCH(req, { params: createParams({ id: "r1" }) });
    expect(res.status).toBe(403);
  });

  it("returns 400 for invalid status", async () => {
    mockGetServerSession.mockResolvedValue(createAdminSession());
    const req = createRequest("http://localhost/api/reports/r1", {
      method: "PATCH",
      body: { status: "INVALID" },
    });
    const res = await PATCH(req, { params: createParams({ id: "r1" }) });
    expect(res.status).toBe(400);
  });

  it("updates report status", async () => {
    mockGetServerSession.mockResolvedValue(createAdminSession());
    const now = new Date();
    mockReportUpdate.mockResolvedValue({
      id: "r1",
      status: "RESOLVED",
      updatedAt: now,
    });
    const req = createRequest("http://localhost/api/reports/r1", {
      method: "PATCH",
      body: { status: "RESOLVED" },
    });
    const res = await PATCH(req, { params: createParams({ id: "r1" }) });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe("RESOLVED");
  });
});
