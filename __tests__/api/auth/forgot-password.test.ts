/**
 * @jest-environment node
 */
const mockUserFindUnique = jest.fn();
const mockVerificationTokenDeleteMany = jest.fn();
const mockVerificationTokenCreate = jest.fn();

jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: (...args: unknown[]) => mockUserFindUnique(...args),
    },
    verificationToken: {
      deleteMany: (...args: unknown[]) => mockVerificationTokenDeleteMany(...args),
      create: (...args: unknown[]) => mockVerificationTokenCreate(...args),
    },
  },
}));

jest.mock("@/lib/turnstile", () => ({
  shouldSkipTurnstileVerification: () => true,
  verifyTurnstileToken: () => ({ success: true }),
}));

jest.mock("@/lib/email", () => ({
  sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("@/lib/activity-log", () => ({
  createActivityLog: jest.fn(),
  ActivityLogAction: { USER_PASSWORD_RESET_REQUESTED: "USER_PASSWORD_RESET_REQUESTED" },
}));

import { POST } from "@/app/api/auth/forgot-password/route";
import { createRequest } from "../../helpers/api-helper";

beforeEach(() => {
  jest.clearAllMocks();
  mockUserFindUnique.mockResolvedValue(null);
  mockVerificationTokenDeleteMany.mockResolvedValue({});
  mockVerificationTokenCreate.mockResolvedValue({});
});

describe("POST /api/auth/forgot-password", () => {
  it("returns 400 when body is invalid JSON", async () => {
    const req = new Request("http://localhost/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not json",
    });
    const res = await POST(req);
    const data = await res.json();
    expect(res.status).toBe(400);
    expect(data.error).toContain("Invalid JSON");
  });

  it("returns 400 when email is missing", async () => {
    const req = createRequest("http://localhost/api/auth/forgot-password", {
      method: "POST",
      body: {},
    });
    const res = await POST(req);
    const data = await res.json();
    expect(res.status).toBe(400);
    expect(data.error).toContain("email");
  });

  it("returns 400 for invalid email format", async () => {
    const req = createRequest("http://localhost/api/auth/forgot-password", {
      method: "POST",
      body: { email: "not-an-email" },
    });
    const res = await POST(req);
    const data = await res.json();
    expect(res.status).toBe(400);
    expect(data.error).toBeDefined();
  });

  it("returns 200 ok true even when user not found (no enumeration)", async () => {
    mockUserFindUnique.mockResolvedValue(null);
    const req = createRequest("http://localhost/api/auth/forgot-password", {
      method: "POST",
      body: { email: "nobody@example.com" },
    });
    const res = await POST(req);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data).toEqual({ ok: true });
  });

  it("returns 200 and sends reset email when user with password exists", async () => {
    const { sendPasswordResetEmail } = await import("@/lib/email");
    mockUserFindUnique.mockResolvedValue({
      id: "user-1",
      password: "hashed",
    });
    const req = createRequest("http://localhost/api/auth/forgot-password", {
      method: "POST",
      body: { email: "user@example.com" },
    });
    const res = await POST(req);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data).toEqual({ ok: true });
    expect(mockVerificationTokenCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          identifier: "password_reset:user@example.com",
        }),
      })
    );
    expect(sendPasswordResetEmail).toHaveBeenCalledWith(
      "user@example.com",
      expect.stringContaining("reset-password"),
      "th"
    );
  });

  it("returns 200 and does not send email when user has no password (OAuth-only)", async () => {
    const { sendPasswordResetEmail } = await import("@/lib/email");
    mockUserFindUnique.mockResolvedValue({
      id: "user-1",
      password: null,
    });
    const req = createRequest("http://localhost/api/auth/forgot-password", {
      method: "POST",
      body: { email: "oauth@example.com" },
    });
    const res = await POST(req);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data).toEqual({ ok: true });
    expect(sendPasswordResetEmail).not.toHaveBeenCalled();
    expect(mockVerificationTokenCreate).not.toHaveBeenCalled();
  });
});
