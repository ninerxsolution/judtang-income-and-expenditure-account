/**
 * @jest-environment node
 */
const mockGetServerSession = jest.fn();
const mockUserFindUnique = jest.fn();
const mockUserUpdate = jest.fn();

jest.mock("next-auth", () => ({
  getServerSession: (...args: unknown[]) => mockGetServerSession(...args),
}));

jest.mock("@/auth", () => ({
  authOptions: {},
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: (...args: unknown[]) => mockUserFindUnique(...args),
      update: (...args: unknown[]) => mockUserUpdate(...args),
    },
  },
}));

jest.mock("bcrypt", () => ({
  compare: jest.fn().mockResolvedValue(false),
  hash: jest.fn().mockResolvedValue("newHashedPassword"),
}));

jest.mock("@/lib/activity-log", () => ({
  createActivityLog: jest.fn(),
  ActivityLogAction: { USER_PASSWORD_CHANGED: "USER_PASSWORD_CHANGED" },
}));

import { PATCH } from "@/app/api/users/me/password/route";
import { createRequest, createMockSession } from "../../helpers/api-helper";
import bcrypt from "bcrypt";

beforeEach(() => {
  jest.clearAllMocks();
  mockGetServerSession.mockResolvedValue(null);
  mockUserFindUnique.mockResolvedValue(null);
  mockUserUpdate.mockResolvedValue({});
  (bcrypt.compare as jest.Mock).mockResolvedValue(false);
  (bcrypt.hash as jest.Mock).mockResolvedValue("newHashedPassword");
});

describe("PATCH /api/users/me/password", () => {
  it("returns 401 when not authenticated", async () => {
    mockGetServerSession.mockResolvedValue(null);
    const req = createRequest("http://localhost/api/users/me/password", {
      method: "PATCH",
      body: { currentPassword: "oldPass123", newPassword: "newPass123" },
    });
    const res = await PATCH(req);
    const data = await res.json();
    expect(res.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns 400 when currentPassword and newPassword missing", async () => {
    mockGetServerSession.mockResolvedValue(createMockSession());
    const req = createRequest("http://localhost/api/users/me/password", {
      method: "PATCH",
      body: {},
    });
    const res = await PATCH(req);
    const data = await res.json();
    expect(res.status).toBe(400);
    expect(data.error).toContain("currentPassword and newPassword");
  });

  it("returns 400 when account has no password (OAuth)", async () => {
    mockGetServerSession.mockResolvedValue(createMockSession());
    mockUserFindUnique.mockResolvedValue({ password: null });
    const req = createRequest("http://localhost/api/users/me/password", {
      method: "PATCH",
      body: { currentPassword: "old", newPassword: "newPassword123" },
    });
    const res = await PATCH(req);
    const data = await res.json();
    expect(res.status).toBe(400);
    expect(data.error).toContain("no password");
  });

  it("returns 401 when current password is incorrect", async () => {
    mockGetServerSession.mockResolvedValue(createMockSession());
    mockUserFindUnique.mockResolvedValue({ password: "hashedOld" });
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);
    const req = createRequest("http://localhost/api/users/me/password", {
      method: "PATCH",
      body: { currentPassword: "wrongPassword", newPassword: "newPassword123" },
    });
    const res = await PATCH(req);
    const data = await res.json();
    expect(res.status).toBe(401);
    expect(data.error).toContain("Current password is incorrect");
  });

  it("returns 200 and updates password on success", async () => {
    mockGetServerSession.mockResolvedValue(createMockSession());
    mockUserFindUnique.mockResolvedValue({ password: "hashedOld" });
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    mockUserUpdate.mockResolvedValue({});
    const req = createRequest("http://localhost/api/users/me/password", {
      method: "PATCH",
      body: { currentPassword: "oldPass123", newPassword: "newPassword123" },
    });
    const res = await PATCH(req);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data).toEqual({ ok: true });
    expect(mockUserUpdate).toHaveBeenCalledWith({
      where: { id: "test-user-id" },
      data: { password: "newHashedPassword" },
    });
  });
});
