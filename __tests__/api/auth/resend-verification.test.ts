/**
 * @jest-environment node
 */
const mockGetServerSession = jest.fn();
const mockUserFindUnique = jest.fn();
const mockTokenDeleteMany = jest.fn();
const mockTokenCreate = jest.fn();
const mockSendEmailVerification = jest.fn();

jest.mock("next-auth", () => ({
  getServerSession: (...args: unknown[]) => mockGetServerSession(...args),
}));
jest.mock("@/auth", () => ({ authOptions: {} }));
jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: (...args: unknown[]) => mockUserFindUnique(...args) },
    verificationToken: {
      deleteMany: (...args: unknown[]) => mockTokenDeleteMany(...args),
      create: (...args: unknown[]) => mockTokenCreate(...args),
    },
  },
}));
jest.mock("@/lib/email", () => ({
  sendEmailVerification: (...args: unknown[]) => mockSendEmailVerification(...args),
}));

import { POST } from "@/app/api/auth/resend-verification/route";
import { createMockSession } from "../../helpers/api-helper";

beforeEach(() => jest.clearAllMocks());

describe("POST /api/auth/resend-verification", () => {
  it("returns 401 when not authenticated", async () => {
    mockGetServerSession.mockResolvedValue(null);
    const res = await POST();
    expect(res.status).toBe(401);
  });

  it("returns 400 when no email", async () => {
    mockGetServerSession.mockResolvedValue(createMockSession());
    mockUserFindUnique.mockResolvedValue({ email: null, emailVerified: null });
    const res = await POST();
    expect(res.status).toBe(400);
  });

  it("returns 400 when already verified", async () => {
    mockGetServerSession.mockResolvedValue(createMockSession());
    mockUserFindUnique.mockResolvedValue({ email: "test@example.com", emailVerified: new Date() });
    const res = await POST();
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("already verified");
  });

  it("sends verification email", async () => {
    mockGetServerSession.mockResolvedValue(createMockSession());
    mockUserFindUnique.mockResolvedValue({ email: "test@example.com", emailVerified: null });
    mockTokenDeleteMany.mockResolvedValue({});
    mockTokenCreate.mockResolvedValue({});
    mockSendEmailVerification.mockResolvedValue(undefined);

    const res = await POST();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(mockSendEmailVerification).toHaveBeenCalled();
  });
});
