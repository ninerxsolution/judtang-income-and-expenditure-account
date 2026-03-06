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

jest.mock("@/lib/activity-log", () => ({
  createActivityLog: jest.fn(),
  ActivityLogAction: { USER_EMAIL_VERIFIED: "USER_EMAIL_VERIFIED" },
}));

import { NextRequest } from "next/server";
import { GET } from "@/app/api/auth/verify-email/route";

beforeEach(() => {
  jest.clearAllMocks();
  mockVerificationTokenFindFirst.mockResolvedValue(null);
  mockUserFindUnique.mockResolvedValue(null);
  mockUserUpdate.mockResolvedValue({});
  mockVerificationTokenDeleteMany.mockResolvedValue({});
});

describe("GET /api/auth/verify-email", () => {
  it("returns 400 when token is missing", async () => {
    const req = new NextRequest("http://localhost/api/auth/verify-email");
    const res = await GET(req);
    const data = await res.json();
    expect(res.status).toBe(400);
    expect(data.error).toContain("Invalid or expired");
  });

  it("returns 400 when token is invalid or expired", async () => {
    mockVerificationTokenFindFirst.mockResolvedValue(null);
    const req = new NextRequest("http://localhost/api/auth/verify-email?token=bad-token");
    const res = await GET(req);
    const data = await res.json();
    expect(res.status).toBe(400);
    expect(data.error).toContain("Invalid or expired");
  });

  it("returns 400 when user not found", async () => {
    mockVerificationTokenFindFirst.mockResolvedValue({
      identifier: "email_verify:user@example.com",
      token: "valid-token",
    });
    mockUserFindUnique.mockResolvedValue(null);
    const req = new NextRequest("http://localhost/api/auth/verify-email?token=valid-token");
    const res = await GET(req);
    const data = await res.json();
    expect(res.status).toBe(400);
    expect(data.error).toContain("User not found");
  });

  it("returns 200 and sets emailVerified on success", async () => {
    mockVerificationTokenFindFirst.mockResolvedValue({
      identifier: "email_verify:user@example.com",
      token: "valid-token",
    });
    mockUserFindUnique.mockResolvedValue({ id: "user-1" });
    mockUserUpdate.mockResolvedValue({});
    const req = new NextRequest("http://localhost/api/auth/verify-email?token=valid-token");
    const res = await GET(req);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data).toEqual({ ok: true });
    expect(mockUserUpdate).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { emailVerified: expect.any(Date) },
    });
    expect(mockVerificationTokenDeleteMany).toHaveBeenCalled();
  });
});
