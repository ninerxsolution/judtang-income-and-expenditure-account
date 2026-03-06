/**
 * @jest-environment node
 */
const mockVerificationTokenFindFirst = jest.fn();
const mockUserFindUnique = jest.fn();
const mockUserUpdate = jest.fn();
const mockVerificationTokenDeleteMany = jest.fn();

jest.mock("@/lib/prisma", () => ({
  prisma: {
    verificationToken: {
      findFirst: (...args: unknown[]) => mockVerificationTokenFindFirst(...args),
      deleteMany: (...args: unknown[]) => mockVerificationTokenDeleteMany(...args),
    },
    user: {
      findUnique: (...args: unknown[]) => mockUserFindUnique(...args),
      update: (...args: unknown[]) => mockUserUpdate(...args),
    },
  },
}));

jest.mock("bcrypt", () => ({
  hash: jest.fn().mockResolvedValue("newHashedPassword"),
}));

jest.mock("@/lib/turnstile", () => ({
  shouldSkipTurnstileVerification: () => true,
  verifyTurnstileToken: () => ({ success: true }),
}));

jest.mock("@/lib/activity-log", () => ({
  createActivityLog: jest.fn(),
  ActivityLogAction: { USER_PASSWORD_CHANGED: "USER_PASSWORD_CHANGED" },
}));

import { POST } from "@/app/api/auth/reset-password/route";
import { createRequest } from "../../helpers/api-helper";

beforeEach(() => {
  jest.clearAllMocks();
  mockVerificationTokenFindFirst.mockResolvedValue(null);
  mockUserFindUnique.mockResolvedValue(null);
  mockUserUpdate.mockResolvedValue({});
  mockVerificationTokenDeleteMany.mockResolvedValue({});
});

describe("POST /api/auth/reset-password", () => {
  it("returns 400 when body is invalid JSON", async () => {
    const req = new Request("http://localhost/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not json",
    });
    const res = await POST(req);
    const data = await res.json();
    expect(res.status).toBe(400);
    expect(data.error).toContain("Invalid JSON");
  });

  it("returns 400 when token is missing", async () => {
    const req = createRequest("http://localhost/api/auth/reset-password", {
      method: "POST",
      body: { newPassword: "newPassword123" },
    });
    const res = await POST(req);
    const data = await res.json();
    expect(res.status).toBe(400);
    expect(data.error).toContain("Token");
  });

  it("returns 400 when newPassword is missing", async () => {
    const req = createRequest("http://localhost/api/auth/reset-password", {
      method: "POST",
      body: { token: "valid-token" },
    });
    const res = await POST(req);
    const data = await res.json();
    expect(res.status).toBe(400);
    expect(data.error).toContain("newPassword");
  });

  it("returns 400 when token is invalid or expired", async () => {
    mockVerificationTokenFindFirst.mockResolvedValue(null);
    const req = createRequest("http://localhost/api/auth/reset-password", {
      method: "POST",
      body: { token: "bad-token", newPassword: "newPassword123" },
    });
    const res = await POST(req);
    const data = await res.json();
    expect(res.status).toBe(400);
    expect(data.error).toContain("Invalid or expired");
  });

  it("returns 400 for short new password", async () => {
    mockVerificationTokenFindFirst.mockResolvedValue({
      identifier: "user@example.com",
      token: "valid-token",
    });
    mockUserFindUnique.mockResolvedValue({ id: "user-1", password: "oldHash" });
    const req = createRequest("http://localhost/api/auth/reset-password", {
      method: "POST",
      body: { token: "valid-token", newPassword: "short" },
    });
    const res = await POST(req);
    const data = await res.json();
    expect(res.status).toBe(400);
    expect(data.error).toBeDefined();
  });

  it("returns 200 and updates password on success", async () => {
    mockVerificationTokenFindFirst.mockResolvedValue({
      identifier: "user@example.com",
      token: "valid-token",
    });
    mockUserFindUnique.mockResolvedValue({ id: "user-1", password: "oldHash" });
    mockUserUpdate.mockResolvedValue({});
    const req = createRequest("http://localhost/api/auth/reset-password", {
      method: "POST",
      body: { token: "valid-token", newPassword: "newPassword123" },
    });
    const res = await POST(req);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data).toEqual({ ok: true });
    expect(mockUserUpdate).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { password: "newHashedPassword" },
    });
    expect(mockVerificationTokenDeleteMany).toHaveBeenCalled();
  });
});
