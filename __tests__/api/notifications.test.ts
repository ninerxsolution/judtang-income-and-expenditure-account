/**
 * @jest-environment node
 */

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockGetServerSession = jest.fn();

jest.mock("next-auth", () => ({
  getServerSession: (...args: unknown[]) => mockGetServerSession(...args),
}));

jest.mock("@/auth", () => ({
  authOptions: {},
}));

const mockNotify = jest.fn();
const mockListNotifications = jest.fn();
const mockCountUnread = jest.fn();
const mockGenerate = jest.fn();
const mockPrune = jest.fn();
const mockDelete = jest.fn();
const mockMarkRead = jest.fn();
const mockMarkUnread = jest.fn();
const mockMarkAllRead = jest.fn();

jest.mock("@/lib/notifications", () => ({
  notify: (...args: unknown[]) => mockNotify(...args),
  listNotifications: (...args: unknown[]) => mockListNotifications(...args),
  countUnreadNotifications: (...args: unknown[]) => mockCountUnread(...args),
  generateNotifications: (...args: unknown[]) => mockGenerate(...args),
  pruneOldNotifications: (...args: unknown[]) => mockPrune(...args),
  deleteNotifications: (...args: unknown[]) => mockDelete(...args),
  markNotificationsRead: (...args: unknown[]) => mockMarkRead(...args),
  markNotificationsUnread: (...args: unknown[]) => mockMarkUnread(...args),
  markAllNotificationsRead: (...args: unknown[]) => mockMarkAllRead(...args),
}));

import { GET, POST, DELETE } from "@/app/api/notifications/route";
import { PATCH } from "@/app/api/notifications/read/route";
import { createMockSession, createRequest } from "../helpers/api-helper";

const now = new Date("2026-03-12T10:00:00Z");
const mockItems = [
  { id: "n-1", type: "EVENT_IMPORT_DONE", payload: { createdCount: 5 }, link: "/x", readAt: null, createdAt: now },
  { id: "n-2", type: "ALERT_RECURRING_DUE", payload: { count: 2 }, link: "/dashboard/recurring", readAt: null, createdAt: now },
];

// ---------------------------------------------------------------------------
// GET /api/notifications
// ---------------------------------------------------------------------------

describe("GET /api/notifications", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetServerSession.mockResolvedValue(null);
    mockGenerate.mockResolvedValue(undefined);
    mockPrune.mockResolvedValue(undefined);
    mockListNotifications.mockResolvedValue(mockItems);
    mockCountUnread.mockResolvedValue(2);
  });

  it("returns 401 when not authenticated", async () => {
    const res = await GET(new Request("http://localhost/api/notifications"));
    expect(res.status).toBe(401);
  });

  it("generates alerts then returns items and unreadCount", async () => {
    mockGetServerSession.mockResolvedValue(createMockSession());
    const res = await GET(new Request("http://localhost/api/notifications"));
    expect(res.status).toBe(200);
    expect(mockGenerate).toHaveBeenCalledWith("test-user-id");
    const body = (await res.json()) as { items: unknown[]; unreadCount: number };
    expect(body.items).toHaveLength(2);
    expect(body.unreadCount).toBe(2);
  });

  it("passes limit and unreadOnly to listNotifications", async () => {
    mockGetServerSession.mockResolvedValue(createMockSession());
    await GET(new Request("http://localhost/api/notifications?limit=10&unreadOnly=true"));
    expect(mockListNotifications).toHaveBeenCalledWith(
      "test-user-id",
      expect.objectContaining({ limit: 10, unreadOnly: true }),
    );
  });

  it("serializes dates as ISO strings", async () => {
    mockGetServerSession.mockResolvedValue(createMockSession());
    const res = await GET(new Request("http://localhost/api/notifications"));
    const body = (await res.json()) as { items: { createdAt: string }[] };
    expect(typeof body.items[0].createdAt).toBe("string");
  });
});

// ---------------------------------------------------------------------------
// POST /api/notifications
// ---------------------------------------------------------------------------

describe("POST /api/notifications", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetServerSession.mockResolvedValue(null);
    mockNotify.mockResolvedValue({ created: true });
  });

  it("returns 401 when not authenticated", async () => {
    const req = createRequest("http://localhost/api/notifications", {
      method: "POST",
      body: { type: "EVENT_SLIP_DONE", payload: { createdCount: 3 } },
    });
    expect((await POST(req)).status).toBe(401);
  });

  it("creates a slip notification with server-owned link and sanitized payload", async () => {
    mockGetServerSession.mockResolvedValue(createMockSession());
    const req = createRequest("http://localhost/api/notifications", {
      method: "POST",
      body: {
        type: "EVENT_SLIP_DONE",
        payload: { createdCount: 3, totalCount: 5, hasErrors: true },
        link: "https://evil.example/inject", // must be ignored
      },
    });
    const res = await POST(req);
    expect(res.status).toBe(201);
    expect(mockNotify).toHaveBeenCalledWith("test-user-id", "EVENT_SLIP_DONE", {
      payload: { createdCount: 3, totalCount: 5, hasErrors: true },
      link: "/dashboard/transactions",
    });
  });

  it("rejects a non-client-creatable type (e.g. EVENT_CARD_PAYMENT)", async () => {
    mockGetServerSession.mockResolvedValue(createMockSession());
    const req = createRequest("http://localhost/api/notifications", {
      method: "POST",
      body: { type: "EVENT_CARD_PAYMENT", payload: { amount: 999 } },
    });
    expect((await POST(req)).status).toBe(400);
    expect(mockNotify).not.toHaveBeenCalled();
  });

  it("returns 400 for missing type", async () => {
    mockGetServerSession.mockResolvedValue(createMockSession());
    const req = createRequest("http://localhost/api/notifications", {
      method: "POST",
      body: { payload: { something: true } },
    });
    expect((await POST(req)).status).toBe(400);
  });

  it("returns 400 for invalid JSON", async () => {
    mockGetServerSession.mockResolvedValue(createMockSession());
    const req = new Request("http://localhost/api/notifications", {
      method: "POST",
      body: "not-json",
      headers: { "Content-Type": "application/json" },
    });
    expect((await POST(req)).status).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// DELETE /api/notifications
// ---------------------------------------------------------------------------

describe("DELETE /api/notifications", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetServerSession.mockResolvedValue(null);
    mockDelete.mockResolvedValue(undefined);
  });

  it("returns 401 when not authenticated", async () => {
    const req = createRequest("http://localhost/api/notifications", {
      method: "DELETE",
      body: { ids: ["n-1"] },
    });
    expect((await DELETE(req)).status).toBe(401);
  });

  it("deletes the given ids", async () => {
    mockGetServerSession.mockResolvedValue(createMockSession());
    const req = createRequest("http://localhost/api/notifications", {
      method: "DELETE",
      body: { ids: ["n-1", "n-2"] },
    });
    const res = await DELETE(req);
    expect(res.status).toBe(200);
    expect(mockDelete).toHaveBeenCalledWith("test-user-id", ["n-1", "n-2"]);
  });

  it("returns 400 for empty ids", async () => {
    mockGetServerSession.mockResolvedValue(createMockSession());
    const req = createRequest("http://localhost/api/notifications", {
      method: "DELETE",
      body: { ids: [] },
    });
    expect((await DELETE(req)).status).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// PATCH /api/notifications/read
// ---------------------------------------------------------------------------

describe("PATCH /api/notifications/read", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetServerSession.mockResolvedValue(null);
    mockMarkRead.mockResolvedValue(undefined);
    mockMarkUnread.mockResolvedValue(undefined);
    mockMarkAllRead.mockResolvedValue(undefined);
  });

  it("returns 401 when not authenticated", async () => {
    const req = createRequest("http://localhost/api/notifications/read", {
      method: "PATCH",
      body: { ids: ["n-1"] },
    });
    expect((await PATCH(req)).status).toBe(401);
  });

  it("marks specific ids as read", async () => {
    mockGetServerSession.mockResolvedValue(createMockSession());
    const req = createRequest("http://localhost/api/notifications/read", {
      method: "PATCH",
      body: { ids: ["n-1", "n-2"] },
    });
    const res = await PATCH(req);
    expect(res.status).toBe(200);
    expect(mockMarkRead).toHaveBeenCalledWith("test-user-id", ["n-1", "n-2"]);
    expect(mockMarkAllRead).not.toHaveBeenCalled();
  });

  it("marks all as read when all: true", async () => {
    mockGetServerSession.mockResolvedValue(createMockSession());
    const req = createRequest("http://localhost/api/notifications/read", {
      method: "PATCH",
      body: { all: true },
    });
    const res = await PATCH(req);
    expect(res.status).toBe(200);
    expect(mockMarkAllRead).toHaveBeenCalledWith("test-user-id");
  });

  it("marks specific ids as unread when unread: true", async () => {
    mockGetServerSession.mockResolvedValue(createMockSession());
    const req = createRequest("http://localhost/api/notifications/read", {
      method: "PATCH",
      body: { ids: ["n-1"], unread: true },
    });
    const res = await PATCH(req);
    expect(res.status).toBe(200);
    expect(mockMarkUnread).toHaveBeenCalledWith("test-user-id", ["n-1"]);
  });

  it("returns 400 when ids is empty array", async () => {
    mockGetServerSession.mockResolvedValue(createMockSession());
    const req = createRequest("http://localhost/api/notifications/read", {
      method: "PATCH",
      body: { ids: [] },
    });
    expect((await PATCH(req)).status).toBe(400);
  });
});
