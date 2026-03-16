/**
 * @jest-environment node
 */
const mockFindUnique = jest.fn();
const mockCreate = jest.fn();
const mockDeleteMany = jest.fn();
const mockUserTermsAcceptanceCreate = jest.fn();
const mockVerificationTokenCreate = jest.fn();

jest.mock("next-auth", () => ({
  getServerSession: () => null,
}));

jest.mock("@/auth", () => ({
  authOptions: {},
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
      create: (...args: unknown[]) => mockCreate(...args),
    },
    userTermsAcceptance: {
      create: (...args: unknown[]) => mockUserTermsAcceptanceCreate(...args),
    },
    verificationToken: {
      deleteMany: (...args: unknown[]) => mockDeleteMany(...args),
      create: (...args: unknown[]) => mockVerificationTokenCreate(...args),
    },
  },
}));

jest.mock("@/lib/turnstile", () => ({
  shouldSkipTurnstileVerification: () => true,
  verifyTurnstileToken: () => ({ success: true }),
}));

jest.mock("@/lib/email", () => ({
  sendEmailVerification: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("@/lib/activity-log", () => ({
  createActivityLog: jest.fn(),
  ActivityLogAction: { USER_REGISTERED: "USER_REGISTERED" },
}));

jest.mock("@/lib/financial-accounts", () => ({
  ensureUserHasDefaultFinancialAccount: jest.fn().mockResolvedValue({}),
}));

jest.mock("@/lib/categories", () => ({
  ensureUserHasDefaultCategories: jest.fn().mockResolvedValue({}),
}));

import { POST } from "@/app/api/auth/register/route";
import { createRequest } from "../../helpers/api-helper";

beforeEach(() => {
  jest.clearAllMocks();
  mockFindUnique.mockResolvedValue(null);
  mockCreate.mockResolvedValue({
    id: "user-1",
    email: "test@example.com",
    name: "Test User",
  });
  mockDeleteMany.mockResolvedValue({});
  mockVerificationTokenCreate.mockResolvedValue({});
  mockUserTermsAcceptanceCreate.mockResolvedValue({});
});

describe("POST /api/auth/register", () => {
  it("returns 400 when email and password missing", async () => {
    const req = createRequest("http://localhost/api/auth/register", {
      method: "POST",
      body: {},
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain("email and password");
  });

  it("returns 400 when termsVersion missing", async () => {
    const req = createRequest("http://localhost/api/auth/register", {
      method: "POST",
      body: { email: "test@example.com", password: "password123" },
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain("Terms");
  });

  it("returns 400 for invalid email format", async () => {
    const req = createRequest("http://localhost/api/auth/register", {
      method: "POST",
      body: {
        email: "invalid",
        password: "password123",
        termsVersion: "1.0",
      },
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain("Invalid email");
  });

  it("returns 400 for short password", async () => {
    const req = createRequest("http://localhost/api/auth/register", {
      method: "POST",
      body: {
        email: "test@example.com",
        password: "short",
        termsVersion: "1.0",
      },
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain("Password");
  });

  it("returns 409 when email already exists", async () => {
    mockFindUnique.mockResolvedValue({
      id: "existing",
      email: "test@example.com",
      status: "ACTIVE",
      deleteAfter: null,
    });

    const req = createRequest("http://localhost/api/auth/register", {
      method: "POST",
      body: {
        email: "test@example.com",
        password: "password123",
        termsVersion: "1.0",
      },
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(409);
    expect(data.error).toContain("already exists");
  });

  it("returns 200 and creates user on success", async () => {
    const req = createRequest("http://localhost/api/auth/register", {
      method: "POST",
      body: {
        email: "test@example.com",
        password: "password123",
        name: "Test User",
        termsVersion: "1.0",
      },
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toEqual({ ok: true });
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: "test@example.com",
          name: "Test User",
        }),
      })
    );
  });
});
