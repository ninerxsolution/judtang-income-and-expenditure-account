/**
 * @jest-environment node
 */
const mockGetServerSession = jest.fn();
const mockFindMany = jest.fn();
const mockUpdateMany = jest.fn();
const mockFindFirst = jest.fn();
const mockUpdate = jest.fn();

jest.mock("next-auth", () => ({
  getServerSession: (...args: unknown[]) => mockGetServerSession(...args),
}));

jest.mock("@/auth", () => ({
  authOptions: {},
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    userSession: {
      findMany: (...args: unknown[]) => mockFindMany(...args),
      updateMany: (...args: unknown[]) => mockUpdateMany(...args),
      findFirst: (...args: unknown[]) => mockFindFirst(...args),
      update: (...args: unknown[]) => mockUpdate(...args),
    },
  },
}));

jest.mock("@/lib/activity-log", () => ({
  createActivityLog: jest.fn(),
  ActivityLogAction: { SESSION_REVOKED: "SESSION_REVOKED" },
}));

import type { NextRequest } from "next/server";
import { GET, POST, DELETE } from "@/app/api/sessions/route";
import { createMockSession } from "../helpers/api-helper";

function asNextRequest(req: Request): NextRequest {
  return req as unknown as NextRequest;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUpdateMany.mockResolvedValue({});
  mockFindMany.mockResolvedValue([
    {
      sessionId: "test-session-id",
      userAgent: "Jest",
      ipAddress: null,
      lastActiveAt: new Date(),
      createdAt: new Date(),
    },
  ]);
});

describe("GET /api/sessions", () => {
  it("returns 401 when not authenticated", async () => {
    mockGetServerSession.mockResolvedValue(null);

    const req = asNextRequest(new Request("http://localhost/api/sessions"));
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data).toEqual({ error: "Unauthorized" });
  });

  it("returns sessions list when authenticated", async () => {
    mockGetServerSession.mockResolvedValue(createMockSession());

    const req = asNextRequest(new Request("http://localhost/api/sessions"));
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toHaveProperty("sessions");
    expect(data).toHaveProperty("currentSessionId");
    expect(Array.isArray(data.sessions)).toBe(true);
  });
});

describe("POST /api/sessions", () => {
  it("returns 401 when not authenticated", async () => {
    mockGetServerSession.mockResolvedValue(null);

    const req = asNextRequest(new Request("http://localhost/api/sessions", { method: "POST" }));
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data).toEqual({ error: "Unauthorized" });
  });

  it("returns 200 on touch", async () => {
    mockGetServerSession.mockResolvedValue(createMockSession());

    const req = asNextRequest(new Request("http://localhost/api/sessions", { method: "POST" }));
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toEqual({ ok: true });
  });
});

describe("DELETE /api/sessions", () => {
  it("returns 401 when not authenticated", async () => {
    mockGetServerSession.mockResolvedValue(null);

    const req = asNextRequest(new Request("http://localhost/api/sessions", { method: "DELETE" }));
    const res = await DELETE(req);
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data).toEqual({ error: "Unauthorized" });
  });

  it("returns 400 when no params provided", async () => {
    mockGetServerSession.mockResolvedValue(createMockSession());

    const req = asNextRequest(new Request("http://localhost/api/sessions", { method: "DELETE" }));
    const res = await DELETE(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain("sessionId");
  });

  it("returns 200 with signOut when revokeAll=true", async () => {
    mockGetServerSession.mockResolvedValue(createMockSession());

    const req = asNextRequest(new Request("http://localhost/api/sessions?revokeAll=true", {
      method: "DELETE",
    }));
    const res = await DELETE(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toHaveProperty("signOut", true);
  });

  it("returns 200 when revoking one session", async () => {
    mockGetServerSession.mockResolvedValue(createMockSession());
    mockFindFirst.mockResolvedValue({ id: "session-row-id" });

    const req = asNextRequest(new Request(
      "http://localhost/api/sessions?sessionId=other-session-id",
      { method: "DELETE" }
    ));
    const res = await DELETE(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalled();
  });
});
