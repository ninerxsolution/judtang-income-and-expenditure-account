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

const mockCreateNotification = jest.fn();
const mockListPersisted = jest.fn();
const mockCountUnread = jest.fn();
const mockComputeVirtual = jest.fn();
const mockMergeNotifications = jest.fn();
const mockMarkRead = jest.fn();
const mockMarkUnread = jest.fn();
const mockMarkAllRead = jest.fn();

jest.mock("@/lib/notifications", () => ({
  createNotification: (...args: unknown[]) => mockCreateNotification(...args),
  listPersistedNotifications: (...args: unknown[]) => mockListPersisted(...args),
  countUnreadNotifications: (...args: unknown[]) => mockCountUnread(...args),
  computeVirtualAlerts: (...args: unknown[]) => mockComputeVirtual(...args),
  mergeNotifications: (...args: unknown[]) => mockMergeNotifications(...args),
  markNotificationsRead: (...args: unknown[]) => mockMarkRead(...args),
  markNotificationsUnread: (...args: unknown[]) => mockMarkUnread(...args),
  markAllNotificationsRead: (...args: unknown[]) => mockMarkAllRead(...args),
}));

import { GET, POST } from "@/app/api/notifications/route";
import { PATCH } from "@/app/api/notifications/read/route";
import { createMockSession, createRequest } from "../helpers/api-helper";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const now = new Date("2026-03-12T10:00:00Z");

const mockPersisted = [
  { id: "n-1", type: "EVENT_IMPORT_DONE", payload: { createdCount: 5 }, link: "/dashboard/tools", readAt: null, createdAt: now, kind: "persisted" },
];
const mockVirtual = [
  { id: "recurring:2026-3", type: "ALERT_RECURRING_DUE", payload: { count: 2 }, link: "/dashboard/recurring", readAt: null, createdAt: now, kind: "virtual" },
];
const mockMerged = [...mockPersisted, ...mockVirtual];

// ---------------------------------------------------------------------------
// GET /api/notifications
// ---------------------------------------------------------------------------

describe("GET /api/notifications", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetServerSession.mockResolvedValue(null);
    mockListPersisted.mockResolvedValue(mockPersisted);
    mockComputeVirtual.mockResolvedValue(mockVirtual);
    mockCountUnread.mockResolvedValue(1);
    mockMergeNotifications.mockReturnValue(mockMerged);
  });

  it("returns 401 when not authenticated", async () => {
    const req = new Request("http://localhost/api/notifications");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("returns merged items and unreadCount when authenticated", async () => {
    mockGetServerSession.mockResolvedValue(createMockSession());
    const req = new Request("http://localhost/api/notifications");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json() as { items: unknown[]; unreadCount: number };
    expect(body.items).toHaveLength(2);
    // unreadCount = persisted unread (1) + virtual count (1)
    expect(body.unreadCount).toBe(2);
  });

  it("passes limit param to listPersistedNotifications", async () => {
    mockGetServerSession.mockResolvedValue(createMockSession());
    const req = new Request("http://localhost/api/notifications?limit=10");
    await GET(req);
    expect(mockListPersisted).toHaveBeenCalledWith(
      "test-user-id",
      expect.objectContaining({ limit: 10 }),
    );
  });

  it("passes unreadOnly param when set", async () => {
    mockGetServerSession.mockResolvedValue(createMockSession());
    const req = new Request("http://localhost/api/notifications?unreadOnly=true");
    await GET(req);
    expect(mockListPersisted).toHaveBeenCalledWith(
      "test-user-id",
      expect.objectContaining({ unreadOnly: true }),
    );
  });

  it("serializes dates as ISO strings", async () => {
    mockGetServerSession.mockResolvedValue(createMockSession());
    mockMergeNotifications.mockReturnValue([
      { ...mockPersisted[0], createdAt: now },
    ]);
    const req = new Request("http://localhost/api/notifications");
    const res = await GET(req);
    const body = await res.json() as { items: { createdAt: string }[] };
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
    mockCreateNotification.mockResolvedValue(undefined);
  });

  it("returns 401 when not authenticated", async () => {
    const req = createRequest("http://localhost/api/notifications", {
      method: "POST",
      body: { type: "EVENT_SLIP_DONE", payload: { createdCount: 3 } },
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("creates notification and returns 201", async () => {
    mockGetServerSession.mockResolvedValue(createMockSession());
    const req = createRequest("http://localhost/api/notifications", {
      method: "POST",
      body: { type: "EVENT_SLIP_DONE", payload: { createdCount: 3, totalCount: 3, hasErrors: false }, link: "/dashboard/transactions" },
    });
    const res = await POST(req);
    expect(res.status).toBe(201);
    expect(mockCreateNotification).toHaveBeenCalledWith(
      "test-user-id",
      "EVENT_SLIP_DONE",
      { createdCount: 3, totalCount: 3, hasErrors: false },
      "/dashboard/transactions",
    );
  });

  it("returns 400 for invalid type", async () => {
    mockGetServerSession.mockResolvedValue(createMockSession());
    const req = createRequest("http://localhost/api/notifications", {
      method: "POST",
      body: { type: "INVALID_TYPE" },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 for missing type", async () => {
    mockGetServerSession.mockResolvedValue(createMockSession());
    const req = createRequest("http://localhost/api/notifications", {
      method: "POST",
      body: { payload: { something: true } },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid JSON", async () => {
    mockGetServerSession.mockResolvedValue(createMockSession());
    const req = new Request("http://localhost/api/notifications", {
      method: "POST",
      body: "not-json",
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
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
    const res = await PATCH(req);
    expect(res.status).toBe(401);
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
    expect(mockMarkRead).not.toHaveBeenCalled();
    expect(mockMarkUnread).not.toHaveBeenCalled();
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
    expect(mockMarkRead).not.toHaveBeenCalled();
  });

  it("returns 400 when ids is empty array", async () => {
    mockGetServerSession.mockResolvedValue(createMockSession());
    const req = createRequest("http://localhost/api/notifications/read", {
      method: "PATCH",
      body: { ids: [] },
    });
    const res = await PATCH(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid JSON", async () => {
    mockGetServerSession.mockResolvedValue(createMockSession());
    const req = new Request("http://localhost/api/notifications/read", {
      method: "PATCH",
      body: "not-json",
      headers: { "Content-Type": "application/json" },
    });
    const res = await PATCH(req);
    expect(res.status).toBe(400);
  });
});
